import { useEffect, useState, useCallback } from "react";
import { Tabs } from "expo-router";
import { View, Text, TouchableOpacity, StyleSheet, AppState, Platform } from "react-native";
import Svg, { Path, Circle, Line, Polyline, Rect } from "react-native-svg";
import { useAuthStore } from "../../store/authStore";
import { useFamilyStore } from "../../store/familyStore";
import { useSuspiciousActivityStore } from "../../store/suspiciousActivityStore";
import * as UsageStats from "../../modules/usage-stats";

// ── Icons ────────────────────────────────────────────────────────────────────
const HomeIcon = ({ size = 20, color = "#a0aec0" }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="9 22 9 12 15 12 15 22" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const BookIcon = ({ size = 20, color = "#a0aec0" }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const SparklesIcon = ({ size = 20, color = "#a0aec0" }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 3l1.545 4.635L18 9.18l-4.455 1.545L12 15.27l-1.545-4.545L6 9.18l4.455-1.545L12 3z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M19 16l.91 2.73 2.73.91-2.73.91L19 23l-.91-2.73-2.73-.91 2.73-.91L19 16z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const SettingsIcon = ({ size = 20, color = "#a0aec0" }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={2} />
    <Path d="M12 1v6m0 6v10M1 12h6m6 0h10" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M4.22 4.22l4.24 4.24m7.08 7.08l4.24 4.24M4.22 19.78l4.24-4.24m7.08-7.08l4.24-4.24" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);
const LockIcon = ({ size = 16, color = "#fff" }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke={color} strokeWidth={2} />
    <Path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);
const WindowIcon = ({ size = 16, color = "#fff" }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="2" y="2" width="20" height="20" rx="2" stroke={color} strokeWidth={2} />
    <Line x1="2" y1="8" x2="22" y2="8" stroke={color} strokeWidth={2} />
    <Line x1="12" y1="8" x2="12" y2="22" stroke={color} strokeWidth={2} />
  </Svg>
);
const AlertTriangleIcon = ({ size = 16, color = "#FF1744" }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="12" y1="9" x2="12" y2="13" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Line x1="12" y1="17" x2="12.01" y2="17" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);
const XIcon = ({ size = 16, color = "#a0aec0" }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

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
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <LockIcon size={14} color="#fff" />
            <Text style={styles.permText}>
              Tap to grant Usage Access — required for screen monitoring
            </Text>
          </View>
        </TouchableOpacity>
      )}
      {usageGranted && !overlayGranted && (
        <TouchableOpacity
          style={[styles.permBanner, { backgroundColor: "#e67e22" }]}
          onPress={() => UsageStats.requestOverlayPermission()}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <WindowIcon size={14} color="#fff" />
            <Text style={styles.permText}>
              Tap to grant Overlay Permission — required for app lock screen
            </Text>
          </View>
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
      <View style={{ marginRight: 12, marginTop: 2 }}>
        <AlertTriangleIcon size={20} color={isCritical ? "#FF1744" : "#FFD700"} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.bannerTitle, { color: isCritical ? "#FF1744" : "#FFD700" }]}>
          {isCritical ? "Critical Alert" : "Safety Warning"}
        </Text>
        <Text style={styles.bannerApp}>{pendingAlert.appName}</Text>
        <Text style={styles.bannerReason}>{pendingAlert.reasoning}</Text>
        {pendingAlert.auraDeducted && (
          <Text style={styles.bannerPenalty}>−50 Aura deducted</Text>
        )}
      </View>
      <TouchableOpacity onPress={dismiss} style={styles.bannerDismiss}>
        <XIcon size={18} color="#a0aec0" />
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
            tabBarIcon: ({ color }) => <HomeIcon size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="learning"
          options={{
            title: "Learn",
            tabBarIcon: ({ color }) => <BookIcon size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="dashboard"
          options={{
            title: "Aura",
            tabBarIcon: ({ color }) => <SparklesIcon size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color }) => <SettingsIcon size={22} color={color} />,
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
