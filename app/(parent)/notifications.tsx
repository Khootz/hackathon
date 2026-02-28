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
import Svg, { Path, Polyline } from "react-native-svg";
import { useAuthStore } from "../../store/authStore";
import { useAlertStore } from "../../store/alertStore";
import { Colors, Fonts, Radii, Shadows } from "../../constants";

function BellIcon({ size = 22, color = Colors.textInverse }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CheckIcon({ size = 14, color = Colors.textInverse }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="20 6 9 17 4 12" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function AlertTriangleIcon({ size = 16, color = Colors.warning }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 9v4M12 17h.01" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function ZapIcon({ size = 16, color = Colors.error }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function InboxIcon({ size = 40, color = Colors.textLight }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M22 12h-6l-2 3H10l-2-3H2" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export default function NotificationsScreen() {
  const user = useAuthStore((s) => s.user);
  const { alerts, fetchAlerts, acknowledgeAlert, loading } = useAlertStore();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "minor" | "critical">("all");

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
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: Colors.primary,
          paddingTop: 56,
          paddingBottom: 32,
          paddingHorizontal: 24,
          overflow: "hidden",
        }}
      >
        <View style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(255,255,255,0.07)" }} />
        <View style={{ position: "absolute", bottom: -60, left: -20, width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(255,255,255,0.05)" }} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <BellIcon size={22} color={Colors.textInverse} />
          <Text style={{ fontFamily: Fonts.heading, fontSize: 28, color: Colors.textInverse, letterSpacing: 0.2 }}>
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
          ) : (
            filteredAlerts.map((alert) => {
              const isCritical = alert.severity === "critical";
              const accentColor = isCritical ? Colors.error : Colors.warning;
              const accentBg = isCritical ? Colors.errorLight : Colors.warningLight;
              return (
                <TouchableOpacity
                  key={alert.id}
                  onPress={() => { if (!alert.acknowledged) handleAcknowledge(alert.id); }}
                  activeOpacity={alert.acknowledged ? 1 : 0.75}
                  style={{
                    backgroundColor: Colors.card,
                    borderRadius: Radii.lg,
                    padding: 16,
                    marginBottom: 10,
                    borderLeftWidth: 4,
                    borderLeftColor: accentColor,
                    opacity: alert.acknowledged ? 0.55 : 1,
                    ...Shadows.sm,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                    <View style={{ width: 32, height: 32, borderRadius: Radii.md, backgroundColor: accentBg, alignItems: "center", justifyContent: "center", marginTop: 2 }}>
                      {isCritical ? <ZapIcon size={15} color={accentColor} /> : <AlertTriangleIcon size={15} color={accentColor} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                        <Text style={{ fontFamily: Fonts.heading, fontSize: 12, color: accentColor, textTransform: "uppercase", letterSpacing: 0.6 }}>
                          {isCritical ? "Critical" : "Minor"}{alert.app_name ? `  ·  ${alert.app_name}` : ""}
                        </Text>
                        {!alert.acknowledged && (
                          <View style={{ width: 8, height: 8, borderRadius: Radii.full, backgroundColor: Colors.primary }} />
                        )}
                      </View>
                      <Text style={{ fontFamily: Fonts.body, fontSize: 14, color: Colors.text, marginTop: 5, lineHeight: 20 }}>
                        {alert.message}
                      </Text>
                      <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
                        <Text style={{ fontFamily: Fonts.body, fontSize: 11, color: Colors.textLight }}>
                          {new Date(alert.created_at).toLocaleString()}
                        </Text>
                        {alert.sent_whatsapp && (
                          <Text style={{ fontFamily: Fonts.body, fontSize: 11, color: Colors.success }}>WhatsApp sent</Text>
                        )}
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}
