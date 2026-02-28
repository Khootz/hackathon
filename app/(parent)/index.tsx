import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Animated,
} from "react-native";
import Svg, { Path, Circle, Line, Polyline } from "react-native-svg";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { useFamilyStore } from "../../store/familyStore";
import { useAlertStore } from "../../store/alertStore";
import { useScreenTimeStore } from "../../store/screenTimeStore";
import { supabase } from "../../lib/supabase";
import { Colors, Fonts, Radii, Shadows } from "../../constants";

// ── Icons ────────────────────────────────────────────────────────────────────
const LinkIcon = ({ size = 20, color = Colors.textInverse }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const ClockIcon = ({ size = 16, color = Colors.error }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={1.8} />
    <Polyline points="12 6 12 12 16 14" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const BookOpenIcon = ({ size = 16, color = Colors.success }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const StarIcon = ({ size = 16, color = Colors.gold }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Polyline points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const AlertTriangleIcon = ({ size = 16, color = Colors.error }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="12" y1="9" x2="12" y2="13" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Line x1="12" y1="17" x2="12.01" y2="17" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);
const PlusIcon = ({ size = 16, color = Colors.primary }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Line x1="12" y1="5" x2="12" y2="19" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);
const LogOutIcon = ({ size = 16, color = Colors.error }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="16 17 21 12 16 7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="21" y1="12" x2="9" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ── Component ────────────────────────────────────────────────────────────────

export default function ParentDashboard() {
  const { user, signOut } = useAuthStore();
  const { children, inviteCode, fetchLinks, fetchChildren, generateInviteCode, subscribeToLinkChanges } = useFamilyStore();
  const { alerts, fetchAlerts } = useAlertStore();
  const { fetchChildActivity } = useScreenTimeStore();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);
  const [childActivities, setChildActivities] = useState<Record<string, { totalMinutes: number; totalDrained: number }>>({});
  const [childModuleCounts, setChildModuleCounts] = useState<Record<string, number>>({});

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  const userId = user?.id;
  const firstName = (user?.user_metadata?.name ?? "Parent").split(" ")[0];

  const loadData = useCallback(async () => {
    if (!userId) return;
    await fetchLinks(userId, "parent");
    await fetchAlerts(userId);
    const childList = useFamilyStore.getState().children;
    const activities: Record<string, { totalMinutes: number; totalDrained: number }> = {};
    const moduleCounts: Record<string, number> = {};
    for (const child of childList) {
      const usage = await fetchChildActivity(child.id);
      activities[child.id] = {
        totalMinutes: usage.reduce((s, u) => s + u.duration_minutes, 0),
        totalDrained: usage.reduce((s, u) => s + u.aura_drained, 0),
      };
      const { count } = await supabase.from("learning_modules").select("*", { count: "exact", head: true }).eq("user_id", child.id).eq("completed", true);
      moduleCounts[child.id] = count ?? 0;
    }
    setChildActivities(activities);
    setChildModuleCounts(moduleCounts);
  }, [userId]);

  useEffect(() => {
    loadData();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 14, useNativeDriver: true }),
    ]).start();

    // Subscribe to family_links changes so parent sees new children immediately
    if (userId) {
      const unsubscribe = subscribeToLinkChanges(userId);
      return () => unsubscribe();
    }
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
      Alert.alert("Invite Code", `Share this code with your child:\n\n${code}\n\nThey enter it after signing up.`);
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
      style={{ flex: 1, backgroundColor: Colors.background }}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={{ backgroundColor: Colors.primary, paddingTop: 56, paddingBottom: 32, paddingHorizontal: 24, overflow: "hidden" }}>
        <View style={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(255,255,255,0.07)" }} />
        <Text style={{ fontFamily: Fonts.body, fontSize: 14, color: "rgba(255,255,255,0.6)", letterSpacing: 0.5 }}>
          Welcome back
        </Text>
        <Text style={{ fontFamily: Fonts.heading, fontSize: 28, color: Colors.textInverse, marginTop: 2 }}>
          {firstName}
        </Text>
      </View>

      <Animated.View style={{ padding: 20, gap: 16, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

        {/* ── Link Child CTA ── */}
        {children.length === 0 && (
          <TouchableOpacity
            onPress={handleGenerateCode}
            activeOpacity={0.88}
            style={{ backgroundColor: Colors.accent, borderRadius: Radii.xl, padding: 24, alignItems: "center", ...Shadows.md }}
          >
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
              <LinkIcon size={22} />
            </View>
            <Text style={{ fontFamily: Fonts.heading, fontSize: 17, color: Colors.textInverse, letterSpacing: 0.5 }}>
              Link a Child Account
            </Text>
            <Text style={{ fontFamily: Fonts.body, fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 4, textAlign: "center" }}>
              Generate an invite code for your child
            </Text>
            {inviteCode && (
              <View style={{ backgroundColor: "rgba(255,255,255,0.15)", borderRadius: Radii.md, paddingVertical: 10, paddingHorizontal: 24, marginTop: 16 }}>
                <Text style={{ fontFamily: Fonts.mono, fontSize: 26, color: Colors.textInverse, letterSpacing: 8, textAlign: "center" }}>
                  {inviteCode}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* ── Children Cards ── */}
        {children.map((child) => {
          const activity = childActivities[child.id];
          const modules = childModuleCounts[child.id] ?? 0;
          const aura = child.aura_balance?.balance ?? 0;
          const auraPercent = Math.min(100, (aura / 500) * 100);
          const auraColor = aura > 200 ? Colors.success : aura > 50 ? Colors.gold : Colors.error;
          const initials = (child.name || "?").slice(0, 2).toUpperCase();

          return (
            <View key={child.id} style={{ backgroundColor: Colors.card, borderRadius: Radii.xl, padding: 20, ...Shadows.md }}>
              {/* Child header */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 }}>
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primaryLight + "40", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontFamily: Fonts.heading, fontSize: 17, color: Colors.primary }}>{initials}</Text>
                </View>
                <View>
                  <Text style={{ fontFamily: Fonts.heading, fontSize: 17, color: Colors.text }}>{child.name || "Child"}</Text>
                  <Text style={{ fontFamily: Fonts.body, fontSize: 12, color: auraColor, marginTop: 1 }}>
                    {aura > 200 ? "Thriving" : aura > 50 ? "Growing" : "Needs attention"}
                  </Text>
                </View>
                <View style={{ marginLeft: "auto", alignItems: "flex-end" }}>
                  <Text style={{ fontFamily: Fonts.heading, fontSize: 24, color: Colors.gold }}>{Math.round(aura)}</Text>
                  <Text style={{ fontFamily: Fonts.body, fontSize: 11, color: Colors.textLight }}>aura</Text>
                </View>
              </View>

              {/* Stats row */}
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
                {[
                  { icon: <ClockIcon />, label: formatTime(activity?.totalMinutes ?? 0), sub: "Screen time" },
                  { icon: <BookOpenIcon />, label: String(modules), sub: "Modules done" },
                ].map((stat) => (
                  <View key={stat.sub} style={{ flex: 1, flexDirection: "row", backgroundColor: Colors.background, borderRadius: Radii.md, padding: 12, alignItems: "center", gap: 8 }}>
                    {stat.icon}
                    <View>
                      <Text style={{ fontFamily: Fonts.heading, fontSize: 15, color: Colors.text }}>{stat.label}</Text>
                      <Text style={{ fontFamily: Fonts.body, fontSize: 11, color: Colors.textLight }}>{stat.sub}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Aura bar */}
              <View style={{ height: 6, backgroundColor: Colors.borderLight, borderRadius: 3, overflow: "hidden" }}>
                <View style={{ height: 6, backgroundColor: auraColor, borderRadius: 3, width: `${auraPercent}%` }} />
              </View>
            </View>
          );
        })}

        {/* ── Alerts ── */}
        {recentAlerts.length > 0 && (
          <View>
            <Text style={{ fontFamily: Fonts.heading, fontSize: 18, color: Colors.text, marginBottom: 10 }}>
              Alerts
            </Text>
            <View style={{ gap: 8 }}>
              {recentAlerts.map((alert) => {
                const isCritical = alert.severity === "critical";
                return (
                  <View
                    key={alert.id}
                    style={{
                      backgroundColor: isCritical ? Colors.errorLight : Colors.warningLight,
                      borderRadius: Radii.md,
                      padding: 14,
                      flexDirection: "row",
                      alignItems: "flex-start",
                      gap: 12,
                      borderLeftWidth: 3,
                      borderLeftColor: isCritical ? Colors.error : Colors.warning,
                    }}
                  >
                    <View style={{ paddingTop: 1 }}>
                      <AlertTriangleIcon color={isCritical ? Colors.error : Colors.warning} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 13, color: isCritical ? Colors.error : Colors.warning, marginBottom: 2 }}>
                        {isCritical ? "Critical" : "Warning"}
                      </Text>
                      <Text style={{ fontFamily: Fonts.body, fontSize: 13, color: Colors.text }}>{alert.message}</Text>
                      <Text style={{ fontFamily: Fonts.body, fontSize: 11, color: Colors.textLight, marginTop: 4 }}>
                        {new Date(alert.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Actions ── */}
        <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
          {children.length > 0 && (
            <TouchableOpacity
              onPress={handleGenerateCode}
              activeOpacity={0.85}
              style={{
                flex: 1,
                backgroundColor: Colors.card,
                paddingVertical: 14,
                borderRadius: Radii.md,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 8,
                borderWidth: 1.5,
                borderColor: Colors.border,
                ...Shadows.sm,
              }}
            >
              <PlusIcon />
              <Text style={{ fontFamily: Fonts.heading, fontSize: 14, letterSpacing: 0.3, color: Colors.primary }}>
                ADD CHILD
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => Alert.alert("Sign Out", "Are you sure?", [
              { text: "Cancel", style: "cancel" },
              { text: "Sign Out", style: "destructive", onPress: signOut },
            ])}
            activeOpacity={0.85}
            style={{
              flex: 1,
              backgroundColor: Colors.errorLight,
              paddingVertical: 14,
              borderRadius: Radii.md,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
              ...Shadows.sm,
            }}
          >
            <LogOutIcon />
            <Text style={{ fontFamily: Fonts.heading, fontSize: 14, letterSpacing: 0.3, color: Colors.error }}>
              SIGN OUT
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </ScrollView>
  );
}
