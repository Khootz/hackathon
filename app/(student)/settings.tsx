import { useState, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, Alert, TextInput, ScrollView, Animated, Switch, Platform, ActivityIndicator } from "react-native";
import Svg, { Path, Circle, Polyline, Line } from "react-native-svg";
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

// ── Shield Icon ─────────────────────────────────────────────────────────────

const ShieldIcon = ({ size = 18, color = Colors.primary }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ── Log Entry Component ─────────────────────────────────────────────────────

function LogEntry({ log }: { log: DetectionLog }) {
  const time = new Date(log.timestamp).toLocaleTimeString();
  const isError = log.action.includes("[ERROR]") || !!log.error;
  const isFlag = log.action.includes("[ALERT]");
  const isSafe = log.action.includes("[OK]");

  return (
    <View style={{ borderTopWidth: 1, borderTopColor: Colors.separator, paddingVertical: 10 }}>
      <Text style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.textLight }}>{time}</Text>
      {log.appName !== "-" && (
        <Text style={{ fontFamily: Fonts.body, fontSize: 12, color: Colors.textSecondary, marginTop: 2 }}>
          {log.appName} ({log.packageName})
        </Text>
      )}
      {log.tier1Category && (
        <Text style={{ fontFamily: Fonts.body, fontSize: 11, color: Colors.warning, marginTop: 2 }}>
          Tier 1: {log.tier1Category}
        </Text>
      )}
      <Text
        style={{
          fontFamily: Fonts.headingMedium,
          fontSize: 12,
          marginTop: 4,
          color: isError ? Colors.error : isFlag ? Colors.error : isSafe ? Colors.success : Colors.primary,
        }}
      >
        {log.action}
      </Text>
      {log.tier2Result && (
        <View style={{ backgroundColor: Colors.background, borderRadius: Radii.sm, padding: 8, marginTop: 6 }}>
          <Text style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.primary, lineHeight: 15 }}>
            suspicious: {String(log.tier2Result.suspicious)}{"\n"}
            confidence: {(log.tier2Result.confidence * 100).toFixed(0)}%{"\n"}
            severity: {log.tier2Result.severity}{"\n"}
            action: {log.tier2Result.trigger_action}{"\n"}
            reasoning: {log.tier2Result.reasoning}
          </Text>
        </View>
      )}
      {log.error && (
        <Text style={{ fontFamily: Fonts.body, fontSize: 11, color: Colors.error, marginTop: 4 }}>
          Error: {log.error}
        </Text>
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

          {/* Status */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 8 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isDetecting ? Colors.success : Colors.textLight }} />
            <Text style={{ fontFamily: Fonts.body, fontSize: 13, color: Colors.textSecondary }}>
              {isDetecting ? "Detection running" : isEnabled ? "Waiting to start..." : "Detection off"}
            </Text>
          </View>
          {lastCheckedApp && (
            <Text style={{ fontFamily: Fonts.body, fontSize: 11, color: Colors.textLight, marginTop: 4 }}>
              Last checked: {lastCheckedApp}
            </Text>
          )}
          <Text style={{ fontFamily: Fonts.body, fontSize: 11, color: Colors.textLight, marginTop: 2 }}>
            Flags: {flagCountToday}/{DetectionConfig.MAX_FLAGS_PER_DAY} | Interval: {DetectionConfig.INTERVAL_MS / 1000}s | Cooldown: {DetectionConfig.ALERT_COOLDOWN_MS / 60000}min
          </Text>
        </View>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ── DEVELOPER TESTING PANEL ─────────────────────────────────── */}
        {/* ═══════════════════════════════════════════════════════════════ */}

        {devMode && (
          <>
            {/* ── Quick Test Presets ───────────────────────────────────── */}
            <View style={{ backgroundColor: Colors.card, borderRadius: Radii.xl, padding: 20, ...Shadows.sm }}>
              <Text style={{ fontFamily: Fonts.heading, fontSize: 16, color: Colors.text, marginBottom: 4 }}>
                Test Detection Pipeline
              </Text>
              <Text style={{ fontFamily: Fonts.body, fontSize: 12, color: Colors.textLight, marginBottom: 14, lineHeight: 17 }}>
                Simulates the full Tier 1 → Tier 2 pipeline. OpenRouter API required for Tier 2.
              </Text>

              <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 12, color: Colors.textSecondary, letterSpacing: 0.8, marginBottom: 8 }}>
                QUICK TESTS
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                {TEST_PRESETS.map((p) => (
                  <TouchableOpacity
                    key={p.pkg}
                    disabled={simulating}
                    onPress={() => runSimulation(p.name, p.pkg)}
                    activeOpacity={0.75}
                    style={{
                      backgroundColor: Colors.background,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: Radii.md,
                      borderWidth: 1.5,
                      borderColor: p.expect === "critical" ? Colors.error : p.expect === "minor" ? Colors.warning : Colors.border,
                      opacity: simulating ? 0.4 : 1,
                    }}
                  >
                    <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 12, color: Colors.text }}>{p.label}</Text>
                    <Text style={{ fontFamily: Fonts.body, fontSize: 9, color: Colors.textLight }}>({p.expect})</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {simulating && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={{ fontFamily: Fonts.body, fontSize: 12, color: Colors.primary }}>Calling LLM...</Text>
                </View>
              )}

              {/* Custom test */}
              <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 12, color: Colors.textSecondary, letterSpacing: 0.8, marginBottom: 8 }}>
                CUSTOM TEST
              </Text>
              <TextInput
                placeholder="App name (e.g. MyApp)"
                placeholderTextColor={Colors.textLight}
                value={customApp}
                onChangeText={setCustomApp}
                style={{
                  backgroundColor: Colors.background,
                  color: Colors.text,
                  padding: 12,
                  borderRadius: Radii.md,
                  fontFamily: Fonts.body,
                  fontSize: 14,
                  borderWidth: 1,
                  borderColor: Colors.border,
                  marginBottom: 8,
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
                  padding: 12,
                  borderRadius: Radii.md,
                  fontFamily: Fonts.body,
                  fontSize: 14,
                  borderWidth: 1,
                  borderColor: Colors.border,
                  marginBottom: 8,
                }}
              />
              <TouchableOpacity
                disabled={!customApp || !customPkg || simulating}
                onPress={() => runSimulation(customApp, customPkg)}
                activeOpacity={0.85}
                style={{
                  backgroundColor: !customApp || !customPkg || simulating ? Colors.borderLight : Colors.accent,
                  padding: 12,
                  borderRadius: Radii.md,
                  alignItems: "center",
                }}
              >
                <Text style={{ fontFamily: Fonts.heading, fontSize: 14, color: !customApp || !customPkg || simulating ? Colors.textLight : Colors.textInverse }}>
                  Run Custom Test
                </Text>
              </TouchableOpacity>

              {/* Check live foreground app */}
              <TouchableOpacity
                onPress={checkLiveApp}
                activeOpacity={0.85}
                style={{
                  borderWidth: 1.5,
                  borderColor: Colors.primary,
                  padding: 10,
                  borderRadius: Radii.md,
                  alignItems: "center",
                  marginTop: 12,
                }}
              >
                <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 13, color: Colors.primary }}>
                  Check Current Foreground App
                </Text>
              </TouchableOpacity>
            </View>

            {/* ── Pending Alert Preview ───────────────────────────────── */}
            {pendingAlert && (
              <View
                style={{
                  backgroundColor: pendingAlert.severity === "critical" ? Colors.errorLight : Colors.warningLight,
                  borderRadius: Radii.xl,
                  padding: 16,
                  borderWidth: 1.5,
                  borderColor: pendingAlert.severity === "critical" ? Colors.error : Colors.warning,
                }}
              >
                <Text style={{ fontFamily: Fonts.heading, fontSize: 14, color: Colors.text }}>Active Alert Preview</Text>
                <Text style={{ fontFamily: Fonts.heading, fontSize: 16, color: Colors.text, marginTop: 4 }}>
                  {pendingAlert.appName}
                </Text>
                <Text
                  style={{
                    fontFamily: Fonts.heading,
                    fontSize: 12,
                    color: pendingAlert.severity === "critical" ? Colors.error : Colors.warning,
                    textTransform: "uppercase",
                    marginTop: 4,
                  }}
                >
                  {pendingAlert.severity}
                </Text>
                <Text style={{ fontFamily: Fonts.body, fontSize: 13, color: Colors.textSecondary, marginTop: 4, lineHeight: 18 }}>
                  {pendingAlert.reasoning}
                </Text>
                {pendingAlert.auraDeducted && (
                  <Text style={{ fontFamily: Fonts.heading, fontSize: 12, color: Colors.error, marginTop: 4 }}>
                    −50 Aura deducted
                  </Text>
                )}
                <TouchableOpacity
                  onPress={dismissPendingAlert}
                  activeOpacity={0.85}
                  style={{
                    backgroundColor: "rgba(0,0,0,0.08)",
                    padding: 8,
                    borderRadius: Radii.md,
                    alignItems: "center",
                    marginTop: 10,
                  }}
                >
                  <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 12, color: Colors.textSecondary }}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── Detection Log ───────────────────────────────────────── */}
            <View style={{ backgroundColor: Colors.card, borderRadius: Radii.xl, padding: 20, ...Shadows.sm }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Text style={{ fontFamily: Fonts.heading, fontSize: 16, color: Colors.text }}>
                  Detection Log ({detectionLogs.length})
                </Text>
                {detectionLogs.length > 0 && (
                  <TouchableOpacity onPress={clearLogs}>
                    <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 13, color: Colors.primary }}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>

              {detectionLogs.length === 0 ? (
                <Text style={{ fontFamily: Fonts.body, fontSize: 12, color: Colors.textLight, fontStyle: "italic" }}>
                  No events yet. Enable detection or run a test above.
                </Text>
              ) : (
                detectionLogs.map((log) => <LogEntry key={log.id} log={log} />)
              )}
            </View>

            {/* ── Risk Registry Reference ──────────────────────────────── */}
            <View style={{ backgroundColor: Colors.card, borderRadius: Radii.xl, padding: 20, ...Shadows.sm }}>
              <Text style={{ fontFamily: Fonts.heading, fontSize: 16, color: Colors.text, marginBottom: 8 }}>
                Risk Registry ({RISK_REGISTRY.length} entries)
              </Text>
              {RISK_REGISTRY.map((entry, i) => (
                <View
                  key={i}
                  style={{
                    borderTopWidth: i > 0 ? 1 : 0,
                    borderTopColor: Colors.separator,
                    paddingVertical: 8,
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontFamily: Fonts.headingMedium, fontSize: 13, color: Colors.text }}>
                      {entry.category}
                    </Text>
                    <Text
                      style={{
                        fontFamily: Fonts.heading,
                        fontSize: 10,
                        color: entry.baseSeverity === "critical" ? Colors.error : Colors.warning,
                        textTransform: "uppercase",
                      }}
                    >
                      {entry.baseSeverity}
                    </Text>
                  </View>
                  <Text style={{ fontFamily: Fonts.mono, fontSize: 10, color: Colors.textLight, marginTop: 2 }}>
                    {entry.patterns.join(" | ")}
                  </Text>
                  <Text style={{ fontFamily: Fonts.body, fontSize: 10, color: Colors.textSecondary, marginTop: 2 }}>
                    {entry.description} (min {entry.minMinutes}min)
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
