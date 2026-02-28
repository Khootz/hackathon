import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { useAuthStore } from "../../store/authStore";
import { useAlertStore } from "../../store/alertStore";

export default function NotificationsScreen() {
  const user = useAuthStore((s) => s.user);
  const { alerts, fetchAlerts, acknowledgeAlert, loading } = useAlertStore();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "minor" | "critical">("all");

  const userId = user?.id;

  useEffect(() => {
    if (userId) fetchAlerts(userId);
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
      `Mark ${unacked.length} alerts as read?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes",
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

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#0f0f23" }}
      contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C63FF" />
      }
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View>
          <Text style={{ fontSize: 24, fontWeight: "bold", color: "#fff" }}>
            Alerts 🔔
          </Text>
          <Text style={{ fontSize: 14, color: "#a0aec0", marginTop: 4 }}>
            {unacknowledgedCount > 0
              ? `${unacknowledgedCount} unread alert${unacknowledgedCount > 1 ? "s" : ""}`
              : "All clear!"}
          </Text>
        </View>
        {unacknowledgedCount > 0 && (
          <TouchableOpacity
            onPress={handleAcknowledgeAll}
            style={{
              backgroundColor: "#16213e",
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: "#6C63FF", fontSize: 12, fontWeight: "bold" }}>
              Mark all read
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter tabs */}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
        {(["all", "minor", "critical"] as const).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: filter === f ? "#6C63FF" : "#16213e",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 13, textTransform: "capitalize" }}>
              {f === "all"
                ? `All (${alerts.length})`
                : f === "minor"
                ? `⚠️ Minor (${alerts.filter((a) => a.severity === "minor").length})`
                : `🚨 Critical (${alerts.filter((a) => a.severity === "critical").length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Alert List */}
      {filteredAlerts.length === 0 ? (
        <View
          style={{
            backgroundColor: "#16213e",
            borderRadius: 12,
            padding: 24,
            marginTop: 24,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 48 }}>✅</Text>
          <Text style={{ color: "#fff", fontWeight: "bold", marginTop: 8 }}>
            No alerts
          </Text>
          <Text style={{ color: "#a0aec0", fontSize: 13, marginTop: 4 }}>
            {filter === "all"
              ? "Your child's activity is looking good!"
              : `No ${filter} alerts`}
          </Text>
        </View>
      ) : (
        filteredAlerts.map((alert) => (
          <TouchableOpacity
            key={alert.id}
            onPress={() => {
              if (!alert.acknowledged) handleAcknowledge(alert.id);
            }}
            style={{
              backgroundColor: alert.acknowledged ? "#111827" : "#16213e",
              borderRadius: 12,
              padding: 16,
              marginTop: 12,
              borderLeftWidth: 4,
              borderLeftColor:
                alert.severity === "critical" ? "#e94560" : "#FFD700",
              opacity: alert.acknowledged ? 0.6 : 1,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color:
                      alert.severity === "critical" ? "#e94560" : "#FFD700",
                    fontWeight: "bold",
                    fontSize: 14,
                  }}
                >
                  {alert.severity === "critical" ? "🚨 Critical" : "⚠️ Minor"}
                  {alert.app_name ? ` — ${alert.app_name}` : ""}
                </Text>
                <Text
                  style={{
                    color: "#a0aec0",
                    fontSize: 13,
                    marginTop: 6,
                    lineHeight: 20,
                  }}
                >
                  {alert.message}
                </Text>
                <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
                  <Text style={{ color: "#4a5568", fontSize: 11 }}>
                    {new Date(alert.created_at).toLocaleString()}
                  </Text>
                  {alert.sent_whatsapp && (
                    <Text style={{ color: "#00C853", fontSize: 11 }}>
                      ✓ WhatsApp sent
                    </Text>
                  )}
                </View>
              </View>
              {!alert.acknowledged && (
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: "#6C63FF",
                    marginTop: 4,
                  }}
                />
              )}
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}
