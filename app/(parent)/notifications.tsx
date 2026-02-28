import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Animated,
} from "react-native";
import Svg, { Path, Polyline, Line, Circle } from "react-native-svg";
import { useAuthStore } from "../../store/authStore";
import { useAlertStore } from "../../store/alertStore";
import { supabase } from "../../lib/supabase";

// ── Icons ─────────────────────────────────────────────────────────────────────
const AlertOctagonIcon = ({ size = 18, color = "#FF1744" }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86L7.86 2z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="12" y1="8" x2="12" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Line x1="12" y1="16" x2="12.01" y2="16" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);
const AlertTriangleIcon = ({ size = 18, color = "#FFD700" }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="12" y1="9" x2="12" y2="13" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Line x1="12" y1="17" x2="12.01" y2="17" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

// ── Live toast for new incoming alerts ───────────────────────────────────────

function NewAlertToast({
  alert,
  onDismiss,
}: {
  alert: { severity: "minor" | "critical"; app_name: string | null; message: string } | null;
  onDismiss: () => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!alert) return;
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(4000),
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => onDismiss());
  }, [alert]);

  if (!alert) return null;

  const isCritical = alert.severity === "critical";
  return (
    <Animated.View
      style={{
        opacity,
        position: "absolute",
        top: 12,
        left: 16,
        right: 16,
        zIndex: 999,
        backgroundColor: isCritical ? "#3b0014" : "#2a200a",
        borderLeftWidth: 4,
        borderLeftColor: isCritical ? "#FF1744" : "#FFD700",
        borderRadius: 10,
        padding: 14,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {isCritical ? (
          <AlertOctagonIcon size={16} color="#FF1744" />
        ) : (
          <AlertTriangleIcon size={16} color="#FFD700" />
        )}
        <Text style={{ color: isCritical ? "#FF1744" : "#FFD700", fontWeight: "bold", fontSize: 13, flex: 1 }}>
          {isCritical ? "New Critical Alert" : "New Minor Alert"}
          {alert.app_name ? ` — ${alert.app_name}` : ""}
        </Text>
      </View>
      <Text style={{ color: "#e2e8f0", fontSize: 12, marginTop: 4 }}>{alert.message}</Text>
    </Animated.View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const user = useAuthStore((s) => s.user);
  const { alerts, fetchAlerts, acknowledgeAlert, loading } = useAlertStore();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "minor" | "critical">("all");
  const [liveAlert, setLiveAlert] = useState<{
    severity: "minor" | "critical";
    app_name: string | null;
    message: string;
  } | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const userId = user?.id;

  useEffect(() => {
    if (userId) fetchAlerts(userId);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 460, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 14, useNativeDriver: true }),
    ]).start();
  }, [userId]);

  // ── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`parent-alerts-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "security_alerts",
          filter: `parent_id=eq.${userId}`,
        },
        (payload) => {
          const newRow = payload.new as any;
          // Refresh the full list
          fetchAlerts(userId);
          // Show live toast
          setLiveAlert({
            severity: newRow.severity,
            app_name: newRow.app_name,
            message: newRow.message,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);


  const onRefresh = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    await fetchAlerts(userId);
    setRefreshing(false);
  }, [userId]);

  const handleAcknowledge = async (alertId: string) => {
    await acknowledgeAlert(alertId);
  };

  const handleAcknowledgeAll = async () => {
    const unacked = alerts.filter((a) => !a.acknowledged);
    if (unacked.length === 0) return;
    Alert.alert(
      "Acknowledge All",
      `Mark ${unacked.length} alert${unacked.length > 1 ? "s" : ""} as read?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark Read",
          onPress: async () => {
            for (const alert of unacked) {
              await acknowledgeAlert(alert.id);
            }
          },
        },
      ]
    );
  };

  const filteredAlerts = alerts.filter((a) => {
    if (filter === "all") return true;
    return a.severity === filter;
  });

  const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length;
  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const minorCount = alerts.filter((a) => a.severity === "minor").length;

  const filterOptions: { key: "all" | "minor" | "critical"; label: string; count: number }[] = [
    { key: "all", label: "All", count: alerts.length },
    { key: "minor", label: "Minor", count: minorCount },
    { key: "critical", label: "Critical", count: criticalCount },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "#0f0f23" }}>
      {/* Live incoming alert toast */}
      <NewAlertToast alert={liveAlert} onDismiss={() => setLiveAlert(null)} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C63FF" />
        }
      >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View>
          <Text style={{ fontSize: 24, fontWeight: "bold", color: "#fff" }}>
            Alerts
          </Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontFamily: Fonts.body, fontSize: 14, color: "rgba(255,255,255,0.75)" }}>
            {unacknowledgedCount > 0
              ? `${unacknowledgedCount} unread alert${unacknowledgedCount > 1 ? "s" : ""}`
              : "All caught up"}
          </Text>
          {unacknowledgedCount > 0 && (
            <TouchableOpacity
              onPress={handleAcknowledgeAll}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: "rgba(255,255,255,0.15)",
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: Radii.full,
              }}
            >
              <CheckIcon size={14} color={Colors.textInverse} />
              <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 12, color: Colors.textInverse }}>
                Mark all read
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Filter chips */}
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
            {filterOptions.map((opt) => {
              const active = filter === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => setFilter(opt.key)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: Radii.full,
                    backgroundColor: active ? Colors.primary : Colors.card,
                    borderWidth: 1.5,
                    borderColor: active ? Colors.primary : Colors.border,
                    ...(active ? {} : Shadows.sm),
                  }}
                >
                  {opt.key === "critical" && <ZapIcon size={12} color={active ? Colors.textInverse : Colors.error} />}
                  {opt.key === "minor" && <AlertTriangleIcon size={12} color={active ? Colors.textInverse : Colors.warning} />}
                  <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 13, color: active ? Colors.textInverse : Colors.text }}>
                    {opt.label}
                  </Text>
                  <View style={{ backgroundColor: active ? "rgba(255,255,255,0.25)" : Colors.background, borderRadius: Radii.full, paddingHorizontal: 6, paddingVertical: 1, minWidth: 20, alignItems: "center" }}>
                    <Text style={{ fontFamily: Fonts.heading, fontSize: 11, color: active ? Colors.textInverse : Colors.textSecondary }}>
                      {opt.count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Alert list */}
          {filteredAlerts.length === 0 ? (
            <View style={{ backgroundColor: Colors.card, borderRadius: Radii.xl, padding: 36, alignItems: "center", ...Shadows.sm }}>
              <InboxIcon size={44} color={Colors.textLight} />
              <Text style={{ fontFamily: Fonts.heading, fontSize: 17, color: Colors.text, marginTop: 14 }}>No alerts</Text>
              <Text style={{ fontFamily: Fonts.body, fontSize: 13, color: Colors.textSecondary, marginTop: 4, textAlign: "center" }}>
                {filter === "all" ? "Your child's activity is looking good!" : `No ${filter} alerts at the moment`}
              </Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
    </View>
  );
}
