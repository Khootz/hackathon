import { useEffect, useState, useCallback } from "react";
import { Tabs } from "expo-router";
import { View, Text, TouchableOpacity, StyleSheet, AppState, Platform } from "react-native";
import { useAuthStore } from "../../store/authStore";
import { useFamilyStore } from "../../store/familyStore";
import { useSuspiciousActivityStore } from "../../store/suspiciousActivityStore";
import * as UsageStats from "../../modules/usage-stats";

// ── Permission Banner ─────────────────────────────────────────────────────────

function PermissionBanners() {
  const [usageGranted, setUsageGranted] = useState(true);
  const [overlayGranted, setOverlayGranted] = useState(true);

  const checkPerms = useCallback(() => {
    if (Platform.OS !== "android") return;
    try {
      setUsageGranted(UsageStats.isUsageAccessGranted());
      setOverlayGranted(UsageStats.canDrawOverlays());
    } catch {}
  }, []);

  useEffect(() => {
    checkPerms();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") checkPerms();
    });
    return () => sub.remove();
  }, [checkPerms]);

  if (Platform.OS !== "android") return null;

  return (
    <>
      {!usageGranted && (
        <TouchableOpacity
          style={[styles.permBanner, { backgroundColor: "#e94560" }]}
          onPress={() => UsageStats.requestUsageAccess()}
        >
          <Text style={styles.permText}>
            🔒 Tap to grant Usage Access — required for screen monitoring
          </Text>
        </TouchableOpacity>
      )}
      {usageGranted && !overlayGranted && (
        <TouchableOpacity
          style={[styles.permBanner, { backgroundColor: "#e67e22" }]}
          onPress={() => UsageStats.requestOverlayPermission()}
        >
          <Text style={styles.permText}>
            🪟 Tap to grant Overlay Permission — required for app lock screen
          </Text>
        </TouchableOpacity>
      )}
    </>
  );
}

// ── Alert Banner ──────────────────────────────────────────────────────────────

function SuspiciousAlertBanner() {
  const pendingAlert = useSuspiciousActivityStore((s) => s.pendingAlert);
  const dismiss = useSuspiciousActivityStore((s) => s.dismissPendingAlert);

  if (!pendingAlert) return null;

  const isCritical = pendingAlert.severity === "critical";

  return (
    <View
      style={[
        styles.banner,
        { borderColor: isCritical ? "#FF1744" : "#FFD700" },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.bannerTitle, { color: isCritical ? "#FF1744" : "#FFD700" }]}>
          {isCritical ? "🚨 Critical Alert" : "⚠️ Safety Warning"}
        </Text>
        <Text style={styles.bannerApp}>{pendingAlert.appName}</Text>
        <Text style={styles.bannerReason}>{pendingAlert.reasoning}</Text>
        {pendingAlert.auraDeducted && (
          <Text style={styles.bannerPenalty}>−50 Aura deducted</Text>
        )}
      </View>
      <TouchableOpacity onPress={dismiss} style={styles.bannerDismiss}>
        <Text style={{ color: "#a0aec0", fontSize: 18, lineHeight: 20 }}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default function StudentLayout() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;
  const childAge: number = (user?.user_metadata?.age as number) ?? 13;
  const { getLinkedParent } = useFamilyStore();
  const { isEnabled, startDetection, stopDetection } = useSuspiciousActivityStore();

  // Auto-start / stop detection when isEnabled changes
  useEffect(() => {
    if (!userId || !isEnabled) {
      stopDetection();
      return;
    }

    let cancelled = false;
    getLinkedParent(userId).then((parentId) => {
      if (!cancelled) {
        startDetection(userId, parentId, childAge);
      }
    });

    return () => {
      cancelled = true;
      stopDetection();
    };
  }, [userId, isEnabled]);

  return (
    <View style={{ flex: 1 }}>
      {/* Permission prompts */}
      <PermissionBanners />

      {/* Floating safety alert — renders above tab content */}
      <SuspiciousAlertBanner />

      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: "#0f0f23" },
          headerTintColor: "#fff",
          tabBarStyle: { backgroundColor: "#0f0f23", borderTopColor: "#2d3748" },
          tabBarActiveTintColor: "#6C63FF",
          tabBarInactiveTintColor: "#a0aec0",
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏠</Text>,
          }}
        />
        <Tabs.Screen
          name="learning"
          options={{
            title: "Learn",
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📚</Text>,
          }}
        />
        <Tabs.Screen
          name="dashboard"
          options={{
            title: "Aura",
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>✨</Text>,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>⚙️</Text>,
          }}
        />
      </Tabs>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  permBanner: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  permText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#16213e",
    borderWidth: 1.5,
    borderRadius: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 999,
  },
  bannerTitle: {
    fontWeight: "bold",
    fontSize: 13,
    marginBottom: 2,
  },
  bannerApp: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
    marginBottom: 2,
  },
  bannerReason: {
    color: "#a0aec0",
    fontSize: 12,
    lineHeight: 17,
  },
  bannerPenalty: {
    color: "#FF1744",
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 4,
  },
  bannerDismiss: {
    paddingLeft: 12,
    paddingTop: 2,
  },
});
