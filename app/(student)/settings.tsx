import { useState, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, Alert, TextInput, ScrollView, Animated, Switch, Platform, ActivityIndicator } from "react-native";
import Svg, { Path, Circle, Polyline, Line, Rect } from "react-native-svg";
import { useAuthStore } from "../../store/authStore";
import { useFamilyStore } from "../../store/familyStore";
import { useSuspiciousActivityStore, DetectionLog } from "../../store/suspiciousActivityStore";
import { Colors, Fonts, Radii, Shadows, RISK_REGISTRY, DetectionConfig } from "../../constants";
import * as UsageStats from "../../modules/usage-stats";

// ── Icons ───────────────────────────────────────────────────────────────────
const UserIcon = ({ size = 28, color = Colors.primary }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth={1.8} />
  </Svg>
);
const LinkIcon = ({ size = 18, color = Colors.primary }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const CheckIcon = ({ size = 14, color = Colors.success }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Polyline points="20 6 9 17 4 12" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const LogOutIcon = ({ size = 16, color = Colors.error }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="16 17 21 12 16 7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="21" y1="12" x2="9" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const MailIcon = ({ size = 14, color = Colors.textLight }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="22,6 12,13 2,6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ── Test Presets ────────────────────────────────────────────────────────────

const TEST_PRESETS = [
  { label: "TikTok", pkg: "com.zhiliaoapp.musically", name: "TikTok", expect: "minor" },
  { label: "Discord", pkg: "com.discord", name: "Discord", expect: "minor" },
  { label: "Snapchat", pkg: "com.snapchat.android", name: "Snapchat", expect: "minor" },
  { label: "Tinder", pkg: "com.tinder", name: "Tinder", expect: "critical" },
  { label: "Bet365", pkg: "com.bet365", name: "Bet365", expect: "critical" },
  { label: "Omegle", pkg: "com.omegle", name: "Omegle", expect: "critical" },
  { label: "Roblox (safe)", pkg: "com.roblox.client", name: "Roblox", expect: "safe" },
  { label: "Chrome (safe)", pkg: "com.android.chrome", name: "Chrome", expect: "safe" },
];

// ── Extra Icons ─────────────────────────────────────────────────────────────

const ShieldIcon = ({ size = 18, color = Colors.primary }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const TerminalIcon = ({ size = 18, color = Colors.primary }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Polyline points="4 17 10 11 4 5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="12" y1="19" x2="20" y2="19" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);
const ZapIcon = ({ size = 14, color = Colors.error }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const AlertTriangleIcon = ({ size = 14, color = Colors.warning }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="12" y1="9" x2="12" y2="13" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Line x1="12" y1="17" x2="12.01" y2="17" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);
const ListIcon = ({ size = 18, color = Colors.primary }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Line x1="8" y1="6" x2="21" y2="6" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Line x1="8" y1="12" x2="21" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Line x1="8" y1="18" x2="21" y2="18" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Line x1="3" y1="6" x2="3.01" y2="6" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Line x1="3" y1="12" x2="3.01" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Line x1="3" y1="18" x2="3.01" y2="18" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);
const PhoneIcon = ({ size = 14, color = Colors.primary }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="5" y="2" width="14" height="20" rx="2" ry="2" stroke={color} strokeWidth={1.8} />
    <Line x1="12" y1="18" x2="12.01" y2="18" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

// ── Log Entry Component ─────────────────────────────────────────────────────

function LogEntry({ log }: { log: DetectionLog }) {
  const time = new Date(log.timestamp).toLocaleTimeString();
  const isError = log.action.includes("[ERROR]") || !!log.error;
  const isFlag = log.action.includes("[ALERT]");
  const isSafe = log.action.includes("[OK]");
  const isSim = log.action.includes("[SIM]");

  const statusColor = isError ? Colors.error : isFlag ? Colors.error : isSafe ? Colors.success : Colors.primary;
  const statusBg = isError ? Colors.errorLight : isFlag ? Colors.errorLight : isSafe ? Colors.successLight : Colors.cardTeal;

  return (
    <View style={{ borderTopWidth: 1, borderTopColor: Colors.separator, paddingVertical: 12 }}>
      {/* Header row: timestamp + status indicator */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: statusColor }} />
          <Text style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.textLight }}>{time}</Text>
          {isSim && (
            <View style={{ backgroundColor: Colors.primaryLight + "30", paddingHorizontal: 6, paddingVertical: 1, borderRadius: Radii.sm }}>
              <Text style={{ fontFamily: Fonts.heading, fontSize: 8, color: Colors.primary, letterSpacing: 0.5 }}>SIM</Text>
            </View>
          )}
        </View>
        {log.tier1Category && (
          <View style={{ backgroundColor: Colors.warningLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radii.full }}>
            <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 9, color: Colors.warning }}>{log.tier1Category}</Text>
          </View>
        )}
      </View>

      {/* App info */}
      {log.appName !== "-" && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <PhoneIcon size={11} color={Colors.textSecondary} />
          <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 12, color: Colors.text }}>{log.appName}</Text>
          <Text style={{ fontFamily: Fonts.mono, fontSize: 9, color: Colors.textLight }}>({log.packageName})</Text>
        </View>
      )}

      {/* Action badge */}
      <View style={{ backgroundColor: statusBg, borderRadius: Radii.sm, paddingHorizontal: 10, paddingVertical: 6, marginTop: 2 }}>
        <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 11, color: statusColor, lineHeight: 15 }}>
          {log.action}
        </Text>
      </View>

      {/* Tier 2 result card */}
      {log.tier2Result && (
        <View style={{ backgroundColor: Colors.background, borderRadius: Radii.md, padding: 12, marginTop: 8, borderLeftWidth: 3, borderLeftColor: statusColor }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
            {[
              { label: "Suspicious", value: String(log.tier2Result.suspicious), color: log.tier2Result.suspicious ? Colors.error : Colors.success },
              { label: "Confidence", value: `${(log.tier2Result.confidence * 100).toFixed(0)}%`, color: log.tier2Result.confidence >= 0.65 ? Colors.error : Colors.textSecondary },
              { label: "Severity", value: log.tier2Result.severity, color: log.tier2Result.severity === "critical" ? Colors.error : Colors.warning },
            ].map((item) => (
              <View key={item.label} style={{ alignItems: "center" }}>
                <Text style={{ fontFamily: Fonts.body, fontSize: 9, color: Colors.textLight, marginBottom: 1 }}>{item.label}</Text>
                <Text style={{ fontFamily: Fonts.heading, fontSize: 12, color: item.color }}>{item.value}</Text>
              </View>
            ))}
          </View>
          <Text style={{ fontFamily: Fonts.body, fontSize: 10, color: Colors.textSecondary, marginBottom: 2 }}>Action: {log.tier2Result.trigger_action}</Text>
          <Text style={{ fontFamily: Fonts.body, fontSize: 10, color: Colors.text, lineHeight: 14, fontStyle: "italic" }}>
            {log.tier2Result.reasoning}
          </Text>
        </View>
      )}

      {log.error && (
        <View style={{ backgroundColor: Colors.errorLight, borderRadius: Radii.sm, paddingHorizontal: 10, paddingVertical: 6, marginTop: 6 }}>
          <Text style={{ fontFamily: Fonts.body, fontSize: 11, color: Colors.error }}>Error: {log.error}</Text>
        </View>
      )}
    </View>
  );
}

// ── Main Screen ─────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { user, signOut } = useAuthStore();
  const { acceptInvite, parentId } = useFamilyStore();
  const [code, setCode] = useState("");
  const [linking, setLinking] = useState(false);

  // Detection store
  const {
    isEnabled,
    devMode,
    isDetecting,
    lastCheckedApp,
    flagCountToday,
    detectionLogs,
    pendingAlert,
    setEnabled,
    setDevMode,
    clearLogs,
    simulateDetection,
    dismissPendingAlert,
  } = useSuspiciousActivityStore();

  const [simulating, setSimulating] = useState(false);
  const [customApp, setCustomApp] = useState("");
  const [customPkg, setCustomPkg] = useState("");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 460, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 14, useNativeDriver: true }),
    ]).start();
  }, []);

  const name = user?.user_metadata?.name ?? "";
  const initials = name ? name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase() : "?";
  const role = (user?.user_metadata?.role ?? "student") as string;

  const runSimulation = async (appName: string, packageName: string) => {
    if (simulating) return;
    setSimulating(true);
    try {
      await simulateDetection(appName, packageName, 13, user?.id ?? "test", null);
    } catch (e) {
      console.error("Simulation error:", e);
    }
    setSimulating(false);
  };

  const checkLiveApp = async () => {
    if (Platform.OS !== "android") {
      Alert.alert("Info", "Only available on Android");
      return;
    }
    try {
      const fg = await UsageStats.getForegroundApp();
      if (fg) Alert.alert("Foreground App", `${fg.appName}\n${fg.packageName}`);
      else Alert.alert("Info", "No foreground app detected");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? String(e));
    }
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: signOut },
    ]);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.background }}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero Header ── */}
      <View style={{ backgroundColor: Colors.primary, paddingTop: 56, paddingBottom: 40, alignItems: "center", overflow: "hidden" }}>
        <View style={{ position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(255,255,255,0.07)" }} />
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center", marginBottom: 14, borderWidth: 2, borderColor: "rgba(255,255,255,0.3)" }}>
          <Text style={{ fontFamily: Fonts.heading, fontSize: 26, color: Colors.textInverse }}>{initials}</Text>
        </View>
        <Text style={{ fontFamily: Fonts.heading, fontSize: 22, color: Colors.textInverse }}>{name || "Student"}</Text>
        <View style={{ backgroundColor: "rgba(255,255,255,0.15)", paddingVertical: 3, paddingHorizontal: 14, borderRadius: Radii.full, marginTop: 6 }}>
          <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 12, color: "rgba(255,255,255,0.85)", letterSpacing: 1 }}>
            {role.toUpperCase()}
          </Text>
        </View>
      </View>

      <Animated.View style={{ padding: 20, gap: 16, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

        {/* ── Profile Card ── */}
        <View style={{ backgroundColor: Colors.card, borderRadius: Radii.xl, padding: 20, gap: 0, ...Shadows.sm }}>
          <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 12, color: Colors.textLight, letterSpacing: 0.8, marginBottom: 14 }}>
            ACCOUNT INFO
          </Text>
          {[
            { label: "Name", value: name || "—" },
            { label: "Email", value: user?.email ?? "—" },
          ].map((row, i) => (
            <View key={row.label} style={{ paddingVertical: 14, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: Colors.separator }}>
              <Text style={{ fontFamily: Fonts.body, fontSize: 12, color: Colors.textLight, marginBottom: 3 }}>{row.label}</Text>
              <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 15, color: Colors.text }}>{row.value}</Text>
            </View>
          ))}

          <View style={{ paddingVertical: 14, borderTopWidth: 1, borderTopColor: Colors.separator, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <Text style={{ fontFamily: Fonts.body, fontSize: 12, color: Colors.textLight, marginBottom: 3 }}>Parent Link</Text>
              <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 15, color: parentId ? Colors.success : Colors.error }}>
                {parentId ? "Connected" : "Not linked"}
              </Text>
            </View>
            {parentId && (
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.successLight, alignItems: "center", justifyContent: "center" }}>
                <CheckIcon />
              </View>
            )}
          </View>
        </View>

        {/* ── Link to Parent ── */}
        {!parentId && (
          <View style={{ backgroundColor: Colors.card, borderRadius: Radii.xl, padding: 20, borderWidth: 1.5, borderColor: Colors.border, ...Shadows.sm }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <LinkIcon />
              <Text style={{ fontFamily: Fonts.heading, fontSize: 16, color: Colors.text }}>Link to Parent</Text>
            </View>
            <Text style={{ fontFamily: Fonts.body, fontSize: 13, color: Colors.textSecondary, marginBottom: 14 }}>
              Enter the invite code your parent shared with you
            </Text>
            <TextInput
              placeholder="ABC123"
              placeholderTextColor={Colors.textLight}
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              maxLength={6}
              autoCapitalize="characters"
              style={{
                backgroundColor: Colors.background,
                color: Colors.primary,
                padding: 16,
                borderRadius: Radii.md,
                fontSize: 24,
                fontFamily: Fonts.mono,
                textAlign: "center",
                letterSpacing: 8,
                borderWidth: 1.5,
                borderColor: code.length > 0 ? Colors.primary : Colors.borderLight,
              }}
            />
            <TouchableOpacity
              onPress={async () => {
                if (!user || !code.trim()) return;
                setLinking(true);
                const ok = await acceptInvite(user.id, code);
                setLinking(false);
                if (ok) Alert.alert("Linked!", "You are now connected to your parent.");
                else Alert.alert("Error", "Invalid or expired code.");
                setCode("");
              }}
              disabled={linking || code.length < 4}
              activeOpacity={0.85}
              style={{
                backgroundColor: linking || code.length < 4 ? Colors.borderLight : Colors.accent,
                padding: 14,
                borderRadius: Radii.md,
                alignItems: "center",
                marginTop: 12,
              }}
            >
              <Text style={{ fontFamily: Fonts.heading, fontSize: 14, letterSpacing: 0.5, color: linking || code.length < 4 ? Colors.textLight : Colors.textInverse }}>
                {linking ? "LINKING..." : "CONFIRM CODE"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ── SUSPICIOUS ACTIVITY DETECTION ───────────────────────────── */}
        {/* ═══════════════════════════════════════════════════════════════ */}

        <View style={{ backgroundColor: Colors.card, borderRadius: Radii.xl, padding: 20, ...Shadows.sm }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <ShieldIcon />
            <Text style={{ fontFamily: Fonts.heading, fontSize: 16, color: Colors.text }}>Activity Detection</Text>
          </View>

          {/* Enable toggle */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderTopWidth: 1, borderTopColor: Colors.separator }}>
            <Text style={{ fontFamily: Fonts.body, fontSize: 14, color: Colors.text }}>Enable Detection</Text>
            <Switch
              value={isEnabled}
              onValueChange={setEnabled}
              trackColor={{ false: Colors.borderLight, true: Colors.primaryLight }}
              thumbColor={isEnabled ? Colors.primary : Colors.textLight}
            />
          </View>

          {/* Dev mode toggle */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderTopWidth: 1, borderTopColor: Colors.separator }}>
            <Text style={{ fontFamily: Fonts.body, fontSize: 14, color: Colors.text }}>Developer Testing Mode</Text>
            <Switch
              value={devMode}
              onValueChange={setDevMode}
              trackColor={{ false: Colors.borderLight, true: Colors.successLight }}
              thumbColor={devMode ? Colors.success : Colors.textLight}
            />
          </View>

          {/* Status bar */}
          <View style={{ backgroundColor: isDetecting ? Colors.successLight : isEnabled ? Colors.warningLight : Colors.background, borderRadius: Radii.md, padding: 12, marginTop: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: isDetecting ? Colors.success : isEnabled ? Colors.warning : Colors.textLight }} />
              <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 13, color: isDetecting ? Colors.success : isEnabled ? Colors.warning : Colors.textSecondary }}>
                {isDetecting ? "Detection Active" : isEnabled ? "Waiting to Start..." : "Detection Off"}
              </Text>
            </View>
            {lastCheckedApp && (
              <Text style={{ fontFamily: Fonts.body, fontSize: 11, color: Colors.textLight, marginTop: 6, marginLeft: 18 }}>
                Last checked: {lastCheckedApp}
              </Text>
            )}
          </View>

          {/* Stats row */}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
            {[
              { label: "Flags Today", value: `${flagCountToday}/${DetectionConfig.MAX_FLAGS_PER_DAY}`, color: flagCountToday > 0 ? Colors.error : Colors.success },
              { label: "Interval", value: `${DetectionConfig.INTERVAL_MS / 1000}s`, color: Colors.primary },
              { label: "Cooldown", value: `${DetectionConfig.ALERT_COOLDOWN_MS / 60000}m`, color: Colors.primary },
            ].map((stat) => (
              <View key={stat.label} style={{ flex: 1, backgroundColor: Colors.background, borderRadius: Radii.sm, padding: 8, alignItems: "center" }}>
                <Text style={{ fontFamily: Fonts.body, fontSize: 9, color: Colors.textLight, marginBottom: 2 }}>{stat.label}</Text>
                <Text style={{ fontFamily: Fonts.heading, fontSize: 14, color: stat.color }}>{stat.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ── DEVELOPER TESTING PANEL ─────────────────────────────────── */}
        {/* ═══════════════════════════════════════════════════════════════ */}

        {devMode && (
          <>
            {/* ── Test Detection Pipeline ────────────────────────────── */}
            <View style={{ backgroundColor: Colors.card, borderRadius: Radii.xl, padding: 20, ...Shadows.sm }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <TerminalIcon />
                <Text style={{ fontFamily: Fonts.heading, fontSize: 16, color: Colors.text }}>Test Detection Pipeline</Text>
              </View>
              <Text style={{ fontFamily: Fonts.body, fontSize: 12, color: Colors.textLight, marginBottom: 16, lineHeight: 17 }}>
                Simulates the full Tier 1 → Tier 2 pipeline. OpenRouter API required for Tier 2.
              </Text>

              {/* Quick Tests */}
              <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 11, color: Colors.textLight, letterSpacing: 1, marginBottom: 10 }}>
                QUICK TESTS
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
                {TEST_PRESETS.map((p) => {
                  const borderColor = p.expect === "critical" ? Colors.error : p.expect === "minor" ? Colors.warning : Colors.success;
                  const bgColor = p.expect === "critical" ? Colors.errorLight : p.expect === "minor" ? Colors.warningLight : Colors.successLight;
                  return (
                    <TouchableOpacity
                      key={p.pkg}
                      disabled={simulating}
                      onPress={() => runSimulation(p.name, p.pkg)}
                      activeOpacity={0.75}
                      style={{
                        backgroundColor: bgColor,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: Radii.md,
                        borderWidth: 1.5,
                        borderColor,
                        opacity: simulating ? 0.4 : 1,
                        minWidth: 80,
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 13, color: Colors.text }}>{p.label}</Text>
                      <View style={{ backgroundColor: borderColor + "20", paddingHorizontal: 6, paddingVertical: 1, borderRadius: Radii.full, marginTop: 3 }}>
                        <Text style={{ fontFamily: Fonts.heading, fontSize: 9, color: borderColor, textTransform: "uppercase", letterSpacing: 0.5 }}>{p.expect}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {simulating && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: Colors.cardTeal, padding: 12, borderRadius: Radii.md, marginBottom: 14 }}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 13, color: Colors.primary }}>Analyzing with LLM...</Text>
                </View>
              )}

              {/* Divider */}
              <View style={{ height: 1, backgroundColor: Colors.separator, marginBottom: 14 }} />

              {/* Custom Test */}
              <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 11, color: Colors.textLight, letterSpacing: 1, marginBottom: 10 }}>
                CUSTOM TEST
              </Text>
              <View style={{ gap: 8, marginBottom: 12 }}>
                <TextInput
                  placeholder="App name (e.g. MyApp)"
                  placeholderTextColor={Colors.textLight}
                  value={customApp}
                  onChangeText={setCustomApp}
                  style={{
                    backgroundColor: Colors.background,
                    color: Colors.text,
                    padding: 14,
                    borderRadius: Radii.md,
                    fontFamily: Fonts.body,
                    fontSize: 14,
                    borderWidth: 1.5,
                    borderColor: customApp ? Colors.primary : Colors.border,
                  }}
                />
                <TextInput
                  placeholder="Package name (e.g. com.example.app)"
                  placeholderTextColor={Colors.textLight}
                  value={customPkg}
                  onChangeText={setCustomPkg}
                  style={{
                    backgroundColor: Colors.background,
                    color: Colors.text,
                    padding: 14,
                    borderRadius: Radii.md,
                    fontFamily: Fonts.body,
                    fontSize: 14,
                    borderWidth: 1.5,
                    borderColor: customPkg ? Colors.primary : Colors.border,
                  }}
                />
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                  disabled={!customApp || !customPkg || simulating}
                  onPress={() => runSimulation(customApp, customPkg)}
                  activeOpacity={0.85}
                  style={{
                    flex: 1,
                    backgroundColor: !customApp || !customPkg || simulating ? Colors.borderLight : Colors.accent,
                    paddingVertical: 13,
                    borderRadius: Radii.md,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <ZapIcon size={13} color={!customApp || !customPkg || simulating ? Colors.textLight : Colors.textInverse} />
                  <Text style={{ fontFamily: Fonts.heading, fontSize: 13, color: !customApp || !customPkg || simulating ? Colors.textLight : Colors.textInverse }}>
                    Run Test
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={checkLiveApp}
                  activeOpacity={0.85}
                  style={{
                    flex: 1,
                    borderWidth: 1.5,
                    borderColor: Colors.primary,
                    paddingVertical: 13,
                    borderRadius: Radii.md,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <PhoneIcon size={13} color={Colors.primary} />
                  <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 13, color: Colors.primary }}>Foreground App</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ── Pending Alert Preview ───────────────────────────────── */}
            {pendingAlert && (
              <View
                style={{
                  backgroundColor: pendingAlert.severity === "critical" ? Colors.errorLight : Colors.warningLight,
                  borderRadius: Radii.xl,
                  padding: 20,
                  borderWidth: 1.5,
                  borderColor: pendingAlert.severity === "critical" ? Colors.error : Colors.warning,
                  ...Shadows.sm,
                }}
              >
                {/* Alert header */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  {pendingAlert.severity === "critical" ? (
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.error + "20", alignItems: "center", justifyContent: "center" }}>
                      <ZapIcon size={16} color={Colors.error} />
                    </View>
                  ) : (
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.warning + "20", alignItems: "center", justifyContent: "center" }}>
                      <AlertTriangleIcon size={16} color={Colors.warning} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: Fonts.heading, fontSize: 14, color: Colors.text }}>Active Alert Preview</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                      <View style={{ backgroundColor: pendingAlert.severity === "critical" ? Colors.error : Colors.warning, paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radii.full }}>
                        <Text style={{ fontFamily: Fonts.heading, fontSize: 10, color: Colors.textInverse, textTransform: "uppercase", letterSpacing: 0.5 }}>
                          {pendingAlert.severity}
                        </Text>
                      </View>
                      {pendingAlert.auraDeducted && (
                        <Text style={{ fontFamily: Fonts.heading, fontSize: 11, color: Colors.error }}>−50 Aura</Text>
                      )}
                    </View>
                  </View>
                </View>

                {/* App name */}
                <View style={{ backgroundColor: "rgba(0,0,0,0.04)", borderRadius: Radii.md, padding: 12, marginBottom: 8 }}>
                  <Text style={{ fontFamily: Fonts.heading, fontSize: 17, color: Colors.text }}>
                    {pendingAlert.appName}
                  </Text>
                </View>

                {/* Reasoning */}
                <Text style={{ fontFamily: Fonts.body, fontSize: 13, color: Colors.textSecondary, lineHeight: 19, marginBottom: 12 }}>
                  {pendingAlert.reasoning}
                </Text>

                <TouchableOpacity
                  onPress={dismissPendingAlert}
                  activeOpacity={0.85}
                  style={{
                    backgroundColor: "rgba(0,0,0,0.06)",
                    paddingVertical: 10,
                    borderRadius: Radii.md,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 13, color: Colors.textSecondary }}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── Detection Log ───────────────────────────────────────── */}
            <View style={{ backgroundColor: Colors.card, borderRadius: Radii.xl, padding: 20, ...Shadows.sm }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <ListIcon />
                  <Text style={{ fontFamily: Fonts.heading, fontSize: 16, color: Colors.text }}>Detection Log</Text>
                  <View style={{ backgroundColor: Colors.background, paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radii.full }}>
                    <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 11, color: Colors.textSecondary }}>{detectionLogs.length}</Text>
                  </View>
                </View>
                {detectionLogs.length > 0 && (
                  <TouchableOpacity onPress={clearLogs} style={{ backgroundColor: Colors.errorLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radii.full }}>
                    <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 12, color: Colors.error }}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>

              {detectionLogs.length === 0 ? (
                <View style={{ backgroundColor: Colors.background, borderRadius: Radii.md, padding: 20, alignItems: "center", marginTop: 8 }}>
                  <ListIcon size={24} color={Colors.textLight} />
                  <Text style={{ fontFamily: Fonts.body, fontSize: 13, color: Colors.textLight, marginTop: 8 }}>
                    No events yet
                  </Text>
                  <Text style={{ fontFamily: Fonts.body, fontSize: 11, color: Colors.textLight, marginTop: 2 }}>
                    Enable detection or run a test above
                  </Text>
                </View>
              ) : (
                detectionLogs.map((log) => <LogEntry key={log.id} log={log} />)
              )}
            </View>

            {/* ── Risk Registry Reference ──────────────────────────────── */}
            <View style={{ backgroundColor: Colors.card, borderRadius: Radii.xl, padding: 20, ...Shadows.sm }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <ShieldIcon size={18} color={Colors.error} />
                <Text style={{ fontFamily: Fonts.heading, fontSize: 16, color: Colors.text }}>Risk Registry</Text>
                <View style={{ backgroundColor: Colors.background, paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radii.full, marginLeft: 4 }}>
                  <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 11, color: Colors.textSecondary }}>{RISK_REGISTRY.length} entries</Text>
                </View>
              </View>
              <Text style={{ fontFamily: Fonts.body, fontSize: 12, color: Colors.textLight, marginBottom: 14, lineHeight: 17 }}>
                Apps and categories AuraMax monitors. Matches trigger AI analysis.
              </Text>

              {RISK_REGISTRY.map((entry, i) => (
                <View
                  key={i}
                  style={{
                    borderTopWidth: i > 0 ? 1 : 0,
                    borderTopColor: Colors.separator,
                    paddingVertical: 10,
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 13, color: Colors.text, flex: 1 }}>
                      {entry.category}
                    </Text>
                    <View
                      style={{
                        backgroundColor: entry.baseSeverity === "critical" ? Colors.errorLight : Colors.warningLight,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: Radii.full,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: Fonts.heading,
                          fontSize: 10,
                          color: entry.baseSeverity === "critical" ? Colors.error : Colors.warning,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                        }}
                      >
                        {entry.baseSeverity}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.textLight, marginTop: 3 }}>
                    {entry.patterns.join(" · ")}
                  </Text>
                  <Text style={{ fontFamily: Fonts.body, fontSize: 11, color: Colors.textSecondary, marginTop: 2 }}>
                    {entry.description}{entry.minMinutes > 0 ? ` (triggers after ${entry.minMinutes} min)` : ""}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── Sign Out ── */}
        <TouchableOpacity
          onPress={handleSignOut}
          activeOpacity={0.85}
          style={{
            backgroundColor: Colors.errorLight,
            paddingVertical: 16,
            borderRadius: Radii.xl,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 10,
            marginTop: 4,
          }}
        >
          <LogOutIcon />
          <Text style={{ fontFamily: Fonts.heading, fontSize: 14, letterSpacing: 0.5, color: Colors.error }}>
            SIGN OUT
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}
