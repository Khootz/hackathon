import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { useFamilyStore } from "../../store/familyStore";
import { useAlertStore } from "../../store/alertStore";
import { useScreenTimeStore } from "../../store/screenTimeStore";
import { supabase } from "../../lib/supabase";

export default function ParentDashboard() {
  const { user, signOut } = useAuthStore();
  const { children, inviteCode, fetchLinks, fetchChildren, generateInviteCode } =
    useFamilyStore();
  const { alerts, fetchAlerts } = useAlertStore();
  const { fetchChildActivity } = useScreenTimeStore();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);
  const [childActivities, setChildActivities] = useState<
    Record<string, { totalMinutes: number; totalDrained: number }>
  >({});
  const [childModuleCounts, setChildModuleCounts] = useState<Record<string, number>>({});

  const userId = user?.id;

  const loadData = useCallback(async () => {
    if (!userId) return;
    await fetchLinks(userId, "parent");
    await fetchAlerts(userId);

    // Fetch activity data for each child
    const activities: Record<string, { totalMinutes: number; totalDrained: number }> = {};
    const moduleCounts: Record<string, number> = {};

    const childList = useFamilyStore.getState().children;
    for (const child of childList) {
      const usage = await fetchChildActivity(child.id);
      const totalMinutes = usage.reduce((s, u) => s + u.duration_minutes, 0);
      const totalDrained = usage.reduce((s, u) => s + u.aura_drained, 0);
      activities[child.id] = { totalMinutes, totalDrained };

      // Fetch completed modules count
      const { count } = await supabase
        .from("learning_modules")
        .select("*", { count: "exact", head: true })
        .eq("user_id", child.id)
        .eq("completed", true);
      moduleCounts[child.id] = count ?? 0;
    }

    setChildActivities(activities);
    setChildModuleCounts(moduleCounts);
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleGenerateCode = async () => {
    if (!userId) return;
    try {
      const code = await generateInviteCode(userId);
      Alert.alert(
        "Invite Code",
        `Share this code with your child:\n\n${code}\n\nThey enter it after signing up.`
      );
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const recentAlerts = alerts.filter((a) => !a.acknowledged).slice(0, 3);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#0f0f23" }}
      contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C63FF" />
      }
    >
      <Text style={{ fontSize: 28, fontWeight: "bold", color: "#fff" }}>
        Parent Dashboard 📊
      </Text>
      <Text style={{ fontSize: 14, color: "#a0aec0", marginTop: 4 }}>
        Welcome, {user?.user_metadata?.name ?? "Parent"}
      </Text>

      {/* Link Child CTA */}
      {children.length === 0 && (
        <TouchableOpacity
          onPress={handleGenerateCode}
          style={{
            backgroundColor: "#6C63FF",
            borderRadius: 12,
            padding: 20,
            marginTop: 20,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 24 }}>🔗</Text>
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold", marginTop: 8 }}>
            Link Your Child's Account
          </Text>
          <Text style={{ color: "#c4c0ff", fontSize: 13, marginTop: 4 }}>
            Generate an invite code to connect
          </Text>
          {inviteCode && (
            <View
              style={{
                backgroundColor: "#0f0f23",
                borderRadius: 8,
                padding: 12,
                marginTop: 12,
              }}
            >
              <Text
                style={{
                  color: "#FFD700",
                  fontSize: 24,
                  fontWeight: "bold",
                  letterSpacing: 6,
                  textAlign: "center",
                }}
              >
                {inviteCode}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Children Overview */}
      {children.map((child) => {
        const activity = childActivities[child.id];
        const modules = childModuleCounts[child.id] ?? 0;
        const aura = child.aura_balance?.balance ?? 0;

        return (
          <View
            key={child.id}
            style={{
              backgroundColor: "#16213e",
              borderRadius: 16,
              padding: 20,
              marginTop: 16,
              borderWidth: 1,
              borderColor: "#2d3748",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 18 }}>
              👦 {child.name || "Child"}
            </Text>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 16,
              }}
            >
              <View style={{ alignItems: "center" }}>
                <Text
                  style={{
                    color: "#FFD700",
                    fontSize: 24,
                    fontWeight: "bold",
                  }}
                >
                  {Math.round(aura)}
                </Text>
                <Text style={{ color: "#a0aec0", fontSize: 12 }}>Aura</Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text
                  style={{
                    color: "#e94560",
                    fontSize: 24,
                    fontWeight: "bold",
                  }}
                >
                  {formatTime(activity?.totalMinutes ?? 0)}
                </Text>
                <Text style={{ color: "#a0aec0", fontSize: 12 }}>Screen Time</Text>
              </View>
              <View style={{ alignItems: "center" }}>
                <Text
                  style={{
                    color: "#00C853",
                    fontSize: 24,
                    fontWeight: "bold",
                  }}
                >
                  {modules}
                </Text>
                <Text style={{ color: "#a0aec0", fontSize: 12 }}>Modules</Text>
              </View>
            </View>

            {/* Aura bar */}
            <View style={{ marginTop: 12 }}>
              <View
                style={{
                  height: 6,
                  backgroundColor: "#2d3748",
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: 6,
                    backgroundColor:
                      aura > 200 ? "#00C853" : aura > 50 ? "#FFD700" : "#e94560",
                    borderRadius: 3,
                    width: `${Math.min(100, (aura / 500) * 100)}%`,
                  }}
                />
              </View>
            </View>
          </View>
        );
      })}

      {/* Recent Alerts */}
      {recentAlerts.length > 0 && (
        <>
          <Text
            style={{
              color: "#fff",
              fontSize: 18,
              fontWeight: "bold",
              marginTop: 24,
            }}
          >
            Recent Alerts
          </Text>
          {recentAlerts.map((alert) => (
            <View
              key={alert.id}
              style={{
                backgroundColor: "#16213e",
                borderRadius: 12,
                padding: 16,
                marginTop: 12,
                borderLeftWidth: 4,
                borderLeftColor:
                  alert.severity === "critical" ? "#e94560" : "#FFD700",
              }}
            >
              <Text
                style={{
                  color:
                    alert.severity === "critical" ? "#e94560" : "#FFD700",
                  fontWeight: "bold",
                }}
              >
                {alert.severity === "critical" ? "🚨 Critical" : "⚠️ Minor"}
              </Text>
              <Text
                style={{ color: "#a0aec0", fontSize: 13, marginTop: 4 }}
              >
                {alert.message}
              </Text>
              <Text
                style={{ color: "#4a5568", fontSize: 11, marginTop: 4 }}
              >
                {new Date(alert.created_at).toLocaleString()}
              </Text>
            </View>
          ))}
        </>
      )}

      {/* Actions */}
      <View style={{ flexDirection: "row", gap: 12, marginTop: 24 }}>
        {children.length > 0 && (
          <TouchableOpacity
            onPress={handleGenerateCode}
            style={{
              flex: 1,
              backgroundColor: "#16213e",
              padding: 14,
              borderRadius: 12,
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#2d3748",
            }}
          >
            <Text style={{ color: "#6C63FF", fontWeight: "bold" }}>
              + Add Child
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() =>
            Alert.alert("Sign Out", "Are you sure?", [
              { text: "Cancel", style: "cancel" },
              { text: "Sign Out", style: "destructive", onPress: signOut },
            ])
          }
          style={{
            flex: 1,
            backgroundColor: "#e94560",
            padding: 14,
            borderRadius: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "bold" }}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
