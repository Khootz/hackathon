import { useEffect, useState } from "react";
import { Tabs } from "expo-router";
import { View, Text, TouchableOpacity, AppState, Platform } from "react-native";
import Svg, { Path, Polyline, Circle, Line } from "react-native-svg";
import { Colors, Fonts, Radii } from "../../constants";
import { useAuthStore } from "../../store/authStore";
import { useFamilyStore } from "../../store/familyStore";
import { useSuspiciousActivityStore } from "../../store/suspiciousActivityStore";
import * as UsageStats from "../../modules/usage-stats";

// ── Permission Banners ──────────────────────────────────────────────────────

function PermissionBanners() {
  const [usageGranted, setUsageGranted] = useState(true);
  const [overlayGranted, setOverlayGranted] = useState(true);

  const checkPermissions = async () => {
    if (Platform.OS !== "android") return;
    try {
      setUsageGranted(UsageStats.isUsageAccessGranted());
      setOverlayGranted(UsageStats.canDrawOverlays());
    } catch {}
  };

  useEffect(() => {
    checkPermissions();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") checkPermissions();
    });
    return () => sub.remove();
  }, []);

  if (usageGranted && overlayGranted) return null;

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 6 }}>
      {!usageGranted && (
        <TouchableOpacity
          onPress={() => UsageStats.requestUsageAccess()}
          style={{
            backgroundColor: Colors.errorLight,
            padding: 12,
            borderRadius: Radii.md,
            borderWidth: 1,
            borderColor: Colors.error,
          }}
        >
          <Text style={{ fontFamily: Fonts.heading, fontSize: 13, color: Colors.error }}>
            Usage Access Required
          </Text>
          <Text style={{ fontFamily: Fonts.body, fontSize: 12, color: Colors.textSecondary, marginTop: 2 }}>
            Tap to grant usage access so we can detect app activity.
          </Text>
        </TouchableOpacity>
      )}
      {!overlayGranted && (
        <TouchableOpacity
          onPress={() => UsageStats.requestOverlayPermission()}
          style={{
            backgroundColor: Colors.warningLight,
            padding: 12,
            borderRadius: Radii.md,
            borderWidth: 1,
            borderColor: Colors.warning,
          }}
        >
          <Text style={{ fontFamily: Fonts.heading, fontSize: 13, color: Colors.warning }}>
            Overlay Permission Required
          </Text>
          <Text style={{ fontFamily: Fonts.body, fontSize: 12, color: Colors.textSecondary, marginTop: 2 }}>
            Tap to allow overlay so we can lock restricted apps.
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Alert Banner ─────────────────────────────────────────────────────────────

function SuspiciousAlertBanner() {
  const { pendingAlert, dismissPendingAlert } = useSuspiciousActivityStore();
  if (!pendingAlert) return null;

  const isCritical = pendingAlert.severity === "critical";
  return (
    <View
      style={{
        margin: 16,
        padding: 14,
        borderRadius: Radii.lg,
        backgroundColor: isCritical ? Colors.errorLight : Colors.warningLight,
        borderWidth: 1,
        borderColor: isCritical ? Colors.error : Colors.warning,
      }}
    >
      <Text style={{ fontFamily: Fonts.heading, fontSize: 14, color: isCritical ? Colors.error : Colors.warning }}>
        {isCritical ? "Critical Alert" : "Warning"}: {pendingAlert.appName}
      </Text>
      <Text style={{ fontFamily: Fonts.body, fontSize: 13, color: Colors.text, marginTop: 4, lineHeight: 18 }}>
        {pendingAlert.reasoning}
      </Text>
      {pendingAlert.auraDeducted && (
        <Text style={{ fontFamily: Fonts.heading, fontSize: 12, color: Colors.error, marginTop: 4 }}>
          −50 Aura deducted
        </Text>
      )}
      <TouchableOpacity onPress={dismissPendingAlert} style={{ marginTop: 8 }}>
        <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 12, color: Colors.primary }}>Dismiss</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Layout ──────────────────────────────────────────────────────────────────

export default function StudentLayout() {
  const user = useAuthStore((s) => s.user);
  const { getLinkedParent } = useFamilyStore();
  const { isEnabled, startDetection, stopDetection } = useSuspiciousActivityStore();

  useEffect(() => {
    if (!user?.id || !isEnabled) return;
    let cancelled = false;

    (async () => {
      const parentId = await getLinkedParent(user.id);
      if (cancelled) return;
      startDetection(user.id, parentId, 13);
    })();

    return () => {
      cancelled = true;
      stopDetection();
    };
  }, [user?.id, isEnabled]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <PermissionBanners />
      <SuspiciousAlertBanner />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { backgroundColor: Colors.card, borderTopColor: Colors.borderLight, borderTopWidth: 1 },
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textLight,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color }) => (
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                <Polyline points="9 22 9 12 15 12 15 22" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            ),
          }}
        />
        <Tabs.Screen
          name="learning"
          options={{
            title: "Learn",
            tabBarIcon: ({ color }) => (
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                <Path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            ),
          }}
        />
        <Tabs.Screen
          name="dashboard"
          options={{
            title: "Aura",
            tabBarIcon: ({ color }) => (
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color }) => (
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={1.8} />
                <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            ),
          }}
        />
      </Tabs>
    </View>
  );
}
