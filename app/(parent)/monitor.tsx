import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useAuthStore } from "../../store/authStore";
import { useFamilyStore } from "../../store/familyStore";
import { useScreenTimeStore } from "../../store/screenTimeStore";
import { supabase } from "../../lib/supabase";

interface AppUsageData {
  app_name: string;
  duration_minutes: number;
  aura_drained: number;
}

interface ChildActivityData {
  childId: string;
  childName: string;
  apps: AppUsageData[];
  totalMinutes: number;
  totalDrained: number;
}

export default function ActivityMonitor() {
  const user = useAuthStore((s) => s.user);
  const { children, fetchChildren } = useFamilyStore();
  const { fetchChildActivity } = useScreenTimeStore();

  const [activities, setActivities] = useState<ChildActivityData[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [weeklyData, setWeeklyData] = useState<{ date: string; minutes: number }[]>([]);

  const userId = user?.id;

  const loadData = useCallback(async () => {
    if (!userId) return;
    await fetchChildren(userId);

    const childList = useFamilyStore.getState().children;
    const activityData: ChildActivityData[] = [];

    for (const child of childList) {
      const apps = await fetchChildActivity(child.id);
      const totalMinutes = apps.reduce((s, a) => s + a.duration_minutes, 0);
      const totalDrained = apps.reduce((s, a) => s + a.aura_drained, 0);

      activityData.push({
        childId: child.id,
        childName: child.name || "Child",
        apps,
        totalMinutes,
        totalDrained,
      });

      if (!selectedChild) setSelectedChild(child.id);
    }

    setActivities(activityData);

    // Fetch weekly data for selected child
    if (selectedChild || childList[0]?.id) {
      const targetChild = selectedChild || childList[0]?.id;
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data } = await supabase
        .from("activity_logs")
        .select("session_date, duration_minutes")
        .eq("user_id", targetChild)
        .gte("session_date", weekAgo.toISOString().split("T")[0]);

      // Aggregate by day
      const dailyMap: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split("T")[0];
        dailyMap[key] = 0;
      }

      (data ?? []).forEach((row) => {
        if (dailyMap[row.session_date] !== undefined) {
          dailyMap[row.session_date] += row.duration_minutes;
        }
      });

      setWeeklyData(
        Object.entries(dailyMap).map(([date, minutes]) => ({
          date: new Date(date).toLocaleDateString("en", { weekday: "short" }),
          minutes,
        }))
      );
    }
  }, [userId, selectedChild]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const getAppIcon = (name: string) => {
    const icons: Record<string, string> = {
      "Clash Royale": "🎮",
      YouTube: "📺",
      Instagram: "📸",
      TikTok: "🎵",
      Minecraft: "⛏️",
    };
    return icons[name] || "📱";
  };

  const selectedActivity = activities.find((a) => a.childId === selectedChild);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#0f0f23" }}
      contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C63FF" />
      }
    >
      <Text style={{ fontSize: 24, fontWeight: "bold", color: "#fff" }}>
        Activity Monitor 👁️
      </Text>
      <Text style={{ fontSize: 14, color: "#a0aec0", marginTop: 4 }}>
        Per-app screen time and activity log
      </Text>

      {/* Child selector */}
      {children.length > 1 && (
        <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
          {children.map((child) => (
            <TouchableOpacity
              key={child.id}
              onPress={() => setSelectedChild(child.id)}
              style={{
                padding: 10,
                paddingHorizontal: 16,
                borderRadius: 20,
                backgroundColor: selectedChild === child.id ? "#6C63FF" : "#16213e",
              }}
            >
              <Text style={{ color: "#fff", fontSize: 13 }}>
                {child.name || "Child"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {children.length === 0 ? (
        <View
          style={{
            backgroundColor: "#16213e",
            borderRadius: 12,
            padding: 24,
            marginTop: 24,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 48 }}>👶</Text>
          <Text style={{ color: "#fff", fontWeight: "bold", marginTop: 8 }}>
            No children linked yet
          </Text>
          <Text style={{ color: "#a0aec0", fontSize: 13, marginTop: 4 }}>
            Go to Dashboard to generate an invite code
          </Text>
        </View>
      ) : (
        <>
          {/* Weekly overview bar chart */}
          <View
            style={{
              backgroundColor: "#16213e",
              borderRadius: 16,
              padding: 20,
              marginTop: 20,
              borderWidth: 1,
              borderColor: "#2d3748",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
              Weekly Screen Time
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-end",
                height: 100,
                marginTop: 16,
                gap: 6,
              }}
            >
              {weeklyData.map((day, i) => {
                const maxMin = Math.max(...weeklyData.map((d) => d.minutes), 1);
                const height = Math.max(4, (day.minutes / maxMin) * 88);
                return (
                  <View key={i} style={{ flex: 1, alignItems: "center" }}>
                    <Text style={{ color: "#a0aec0", fontSize: 9, marginBottom: 4 }}>
                      {day.minutes > 0 ? formatTime(day.minutes) : ""}
                    </Text>
                    <View
                      style={{
                        width: "80%",
                        height,
                        backgroundColor:
                          day.minutes > 120
                            ? "#e94560"
                            : day.minutes > 60
                            ? "#FFD700"
                            : "#00C853",
                        borderRadius: 4,
                      }}
                    />
                    <Text style={{ color: "#a0aec0", fontSize: 10, marginTop: 4 }}>
                      {day.date}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Today's app breakdown */}
          <Text
            style={{
              color: "#fff",
              fontSize: 18,
              fontWeight: "bold",
              marginTop: 24,
            }}
          >
            Today's Usage
          </Text>

          {selectedActivity && selectedActivity.apps.length > 0 ? (
            <>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginTop: 12,
                  marginBottom: 4,
                }}
              >
                <Text style={{ color: "#a0aec0", fontSize: 12 }}>
                  Total: {formatTime(selectedActivity.totalMinutes)}
                </Text>
                <Text style={{ color: "#e94560", fontSize: 12 }}>
                  Aura drained: {Math.round(selectedActivity.totalDrained)}
                </Text>
              </View>

              {selectedActivity.apps
                .sort((a, b) => b.duration_minutes - a.duration_minutes)
                .map((app, i) => {
                  const percentage =
                    selectedActivity.totalMinutes > 0
                      ? (app.duration_minutes / selectedActivity.totalMinutes) * 100
                      : 0;

                  return (
                    <View
                      key={i}
                      style={{
                        backgroundColor: "#16213e",
                        borderRadius: 12,
                        padding: 16,
                        marginTop: 8,
                        borderWidth: 1,
                        borderColor: "#2d3748",
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                          <Text style={{ fontSize: 24 }}>{getAppIcon(app.app_name)}</Text>
                          <View>
                            <Text style={{ color: "#fff", fontSize: 16 }}>
                              {app.app_name}
                            </Text>
                            <Text style={{ color: "#a0aec0", fontSize: 11 }}>
                              -{Math.round(app.aura_drained)} aura
                            </Text>
                          </View>
                        </View>
                        <Text style={{ color: "#e94560", fontWeight: "bold", fontSize: 16 }}>
                          {formatTime(app.duration_minutes)}
                        </Text>
                      </View>
                      {/* Usage bar */}
                      <View
                        style={{
                          height: 4,
                          backgroundColor: "#2d3748",
                          borderRadius: 2,
                          marginTop: 12,
                          overflow: "hidden",
                        }}
                      >
                        <View
                          style={{
                            height: 4,
                            backgroundColor: "#e94560",
                            borderRadius: 2,
                            width: `${percentage}%`,
                          }}
                        />
                      </View>
                    </View>
                  );
                })}
            </>
          ) : (
            <Text style={{ color: "#a0aec0", marginTop: 12 }}>
              No activity recorded today
            </Text>
          )}
        </>
      )}
    </ScrollView>
  );
}
