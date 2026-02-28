import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
} from "react-native";
import Svg, { Path, Circle, Line, Polyline, Rect } from "react-native-svg";
import { useAuthStore } from "../../store/authStore";
import { useFamilyStore } from "../../store/familyStore";
import { useScreenTimeStore } from "../../store/screenTimeStore";
import { supabase } from "../../lib/supabase";
import { Colors, Fonts, Radii, Shadows } from "../../constants";

// ── Icons ────────────────────────────────────────────────────────────────────
const ClockIcon = ({ size = 14, color = Colors.error }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={1.8} />
    <Polyline points="12 6 12 12 16 14" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const PhoneIcon = ({ size = 16, color = Colors.primary }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="5" y="2" width="14" height="20" rx="2" ry="2" stroke={color} strokeWidth={1.8} />
    <Line x1="12" y1="18" x2="12.01" y2="18" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);
const DropIcon = ({ size = 14, color = Colors.error }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const UsersIcon = ({ size = 28, color = Colors.accent }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <Circle cx="9" cy="7" r="4" stroke={color} strokeWidth={1.8} />
    <Path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <Path d="M16 3.13a4 4 0 0 1 0 7.75" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

// ── Types ────────────────────────────────────────────────────────────────────
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

// ── Component ────────────────────────────────────────────────────────────────
export default function ActivityMonitor() {
  const user = useAuthStore((s) => s.user);
  const { children, fetchChildren } = useFamilyStore();
  const { fetchChildActivity } = useScreenTimeStore();

  const [activities, setActivities] = useState<ChildActivityData[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [weeklyData, setWeeklyData] = useState<{ date: string; minutes: number }[]>([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const userId = user?.id;

  // Fetch children once when user id is known
  useEffect(() => {
    if (userId) fetchChildren(userId);
  }, [userId]);

  // Auto-select first child once children are loaded
  useEffect(() => {
    if (!selectedChild && children.length > 0) setSelectedChild(children[0].id);
  }, [children, selectedChild]);

  // Entrance animation — once on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 460, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 14, useNativeDriver: true }),
    ]).start();
  }, []);

  const loadData = useCallback(async () => {
    if (!userId || !selectedChild) return;
    const activityData: ChildActivityData[] = [];
    for (const child of children) {
      const apps = await fetchChildActivity(child.id);
      activityData.push({
        childId: child.id,
        childName: child.name || "Child",
        apps,
        totalMinutes: apps.reduce((s, a) => s + a.duration_minutes, 0),
        totalDrained: apps.reduce((s, a) => s + a.aura_drained, 0),
      });
    }
    setActivities(activityData);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { data } = await supabase.from("activity_logs").select("session_date, duration_minutes").eq("user_id", selectedChild).gte("session_date", weekAgo.toISOString().split("T")[0]);
    const dailyMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dailyMap[d.toISOString().split("T")[0]] = 0;
    }
    (data ?? []).forEach((row) => { if (dailyMap[row.session_date] !== undefined) dailyMap[row.session_date] += row.duration_minutes; });
    setWeeklyData(Object.entries(dailyMap).map(([date, minutes]) => ({ date: new Date(date).toLocaleDateString("en", { weekday: "short" }), minutes })));
  }, [userId, selectedChild, children]);

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

  const selectedActivity = activities.find((a) => a.childId === selectedChild);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.background }}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={{ backgroundColor: Colors.primary, paddingTop: 56, paddingBottom: 28, paddingHorizontal: 24, overflow: "hidden" }}>
        <View style={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(255,255,255,0.07)" }} />
        <Text style={{ fontFamily: Fonts.body, fontSize: 14, color: "rgba(255,255,255,0.6)", letterSpacing: 0.5 }}>Parent Dashboard</Text>
        <Text style={{ fontFamily: Fonts.heading, fontSize: 28, color: Colors.textInverse, marginTop: 2 }}>Activity Monitor</Text>
        <Text style={{ fontFamily: Fonts.body, fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
          Per-app screen time and usage log
        </Text>
      </View>

      <Animated.View style={{ padding: 20, gap: 14, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

        {/* Child selector */}
        {children.length > 1 && (
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {children.map((child) => {
              const active = selectedChild === child.id;
              return (
                <TouchableOpacity
                  key={child.id}
                  onPress={() => setSelectedChild(child.id)}
                  activeOpacity={0.8}
                  style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: Radii.full, backgroundColor: active ? Colors.primary : Colors.card, borderWidth: 1.5, borderColor: active ? Colors.primary : Colors.border }}
                >
                  <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 14, color: active ? Colors.textInverse : Colors.textSecondary }}>
                    {child.name || "Child"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {children.length === 0 ? (
          <View style={{ backgroundColor: Colors.card, borderRadius: Radii.xl, padding: 32, alignItems: "center", ...Shadows.sm }}>
            <UsersIcon />
            <Text style={{ fontFamily: Fonts.heading, fontSize: 16, color: Colors.text, marginTop: 12 }}>No children linked</Text>
            <Text style={{ fontFamily: Fonts.body, fontSize: 13, color: Colors.textLight, marginTop: 4, textAlign: "center" }}>
              Go to Dashboard to generate an invite code
            </Text>
          </View>
        ) : (
          <>
            {/* Weekly bar chart */}
            {weeklyData.length > 0 && (
              <View style={{ backgroundColor: Colors.card, borderRadius: Radii.xl, padding: 20, ...Shadows.sm }}>
                <Text style={{ fontFamily: Fonts.heading, fontSize: 16, color: Colors.text, marginBottom: 16 }}>
                  Weekly Screen Time
                </Text>
                <View style={{ flexDirection: "row", alignItems: "flex-end", height: 100, gap: 4 }}>
                  {weeklyData.map((day, i) => {
                    const maxMin = Math.max(...weeklyData.map((d) => d.minutes), 1);
                    const barH = Math.max(4, (day.minutes / maxMin) * 84);
                    const barColor = day.minutes > 120 ? Colors.error : day.minutes > 60 ? Colors.warning : Colors.success;
                    return (
                      <View key={i} style={{ flex: 1, alignItems: "center" }}>
                        {day.minutes > 0 && (
                          <Text style={{ fontFamily: Fonts.body, fontSize: 8, color: Colors.textLight, marginBottom: 4, textAlign: "center" }}>
                            {formatTime(day.minutes)}
                          </Text>
                        )}
                        <View style={{ flex: 1, justifyContent: "flex-end" }}>
                          <View style={{ width: "75%", alignSelf: "center", height: barH, backgroundColor: barColor, borderRadius: Radii.sm }} />
                        </View>
                        <Text style={{ fontFamily: Fonts.body, fontSize: 10, color: Colors.textSecondary, marginTop: 6 }}>{day.date}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Today's summary */}
            {selectedActivity && (
              <View style={{ flexDirection: "row", gap: 10 }}>
                {[
                  { icon: <ClockIcon />, value: formatTime(selectedActivity.totalMinutes), label: "Screen time" },
                  { icon: <DropIcon />, value: String(Math.round(selectedActivity.totalDrained)), label: "Aura drained" },
                ].map((stat) => (
                  <View key={stat.label} style={{ flex: 1, backgroundColor: Colors.card, borderRadius: Radii.lg, padding: 14, flexDirection: "row", alignItems: "center", gap: 8, ...Shadows.sm }}>
                    {stat.icon}
                    <View>
                      <Text style={{ fontFamily: Fonts.heading, fontSize: 16, color: Colors.text }}>{stat.value}</Text>
                      <Text style={{ fontFamily: Fonts.body, fontSize: 11, color: Colors.textLight }}>{stat.label}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Today app breakdown */}
            {selectedActivity && selectedActivity.apps.length > 0 ? (
              <View style={{ gap: 8 }}>
                <Text style={{ fontFamily: Fonts.heading, fontSize: 17, color: Colors.text }}>Today's Usage</Text>
                {selectedActivity.apps
                  .sort((a, b) => b.duration_minutes - a.duration_minutes)
                  .map((app, i) => {
                    const pct = selectedActivity.totalMinutes > 0 ? (app.duration_minutes / selectedActivity.totalMinutes) * 100 : 0;
                    return (
                      <View key={i} style={{ backgroundColor: Colors.card, borderRadius: Radii.lg, padding: 16, ...Shadows.sm }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
                          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.cardTeal, alignItems: "center", justifyContent: "center" }}>
                            <PhoneIcon size={16} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 14, color: Colors.text }}>{app.app_name}</Text>
                            <Text style={{ fontFamily: Fonts.body, fontSize: 11, color: Colors.error }}>-{Math.round(app.aura_drained)} aura</Text>
                          </View>
                          <Text style={{ fontFamily: Fonts.heading, fontSize: 16, color: Colors.error }}>{formatTime(app.duration_minutes)}</Text>
                        </View>
                        <View style={{ height: 5, backgroundColor: Colors.borderLight, borderRadius: 3, overflow: "hidden" }}>
                          <View style={{ height: 5, backgroundColor: Colors.error, borderRadius: 3, width: `${pct}%` }} />
                        </View>
                      </View>
                    );
                  })}
              </View>
            ) : (
              selectedActivity && (
                <View style={{ backgroundColor: Colors.card, borderRadius: Radii.xl, padding: 24, alignItems: "center", ...Shadows.sm }}>
                  <Text style={{ fontFamily: Fonts.heading, fontSize: 15, color: Colors.text }}>No activity today</Text>
                  <Text style={{ fontFamily: Fonts.body, fontSize: 13, color: Colors.textLight, marginTop: 4 }}>Pull to refresh for latest data</Text>
                </View>
              )
            )}
          </>
        )}
      </Animated.View>
    </ScrollView>
  );
}
