import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  TextInput,
  ScrollView,
  Switch,
  Platform,
  ActivityIndicator,
} from "react-native";
import Svg, { Path, Circle, Line, Polyline, Rect } from "react-native-svg";
import { useAuthStore } from "../../store/authStore";
import { useFamilyStore } from "../../store/familyStore";
import {
  useSuspiciousActivityStore,
  DetectionLog,
} from "../../store/suspiciousActivityStore";
import { RISK_REGISTRY, DetectionConfig } from "../../constants";
import { Colors, Fonts, Radii } from "../../constants";
import * as UsageStats from "../../modules/usage-stats";

// ── Icons ─────────────────────────────────────────────────────────────────────
const MusicIcon = ({ size = 14 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9 18V5l12-2v13" stroke="#6C63FF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="6" cy="18" r="3" stroke="#6C63FF" strokeWidth={2} />
    <Circle cx="18" cy="16" r="3" stroke="#6C63FF" strokeWidth={2} />
  </Svg>
);
const MessageIcon = ({ size = 14 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#6C63FF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const ShapesIcon = ({ size = 14 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="6" stroke="#6C63FF" strokeWidth={2} />
    <Path d="M15 13l3 7-6-3-6 3 3-7" stroke="#6C63FF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const FlameIcon = ({ size = 14 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M8.5 14.5A2.5 2.5 0 0 0 11 17a2.5 2.5 0 0 0 5 0c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 2 6.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3.5z" stroke="#FF1744" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const DiceIcon = ({ size = 14 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24\" fill=\"none\">
    <Rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\" stroke=\"#FF1744\" strokeWidth={2} />
    <Circle cx=\"8\" cy=\"8\" r=\"1\" fill=\"#FF1744\" />
    <Circle cx=\"16\" cy=\"8\" r=\"1\" fill=\"#FF1744\" />
    <Circle cx=\"12\" cy=\"12\" r=\"1\" fill=\"#FF1744\" />
    <Circle cx=\"8\" cy=\"16\" r=\"1\" fill=\"#FF1744\" />
    <Circle cx=\"16\" cy=\"16\" r=\"1\" fill=\"#FF1744\" />
  </Svg>
);
const VideoIcon = ({ size = 14 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M23 7l-7 5 7 5V7z" stroke="#FF1744" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Rect x="1" y="5" width="15" height="14" rx="2" stroke="#FF1744" strokeWidth={2} />
  </Svg>
);
const GamepadIcon = ({ size = 14 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M6 12h4m-2-2v4m10-3h.01M18 11h.01" stroke="#00C853" strokeWidth={2} strokeLinecap="round" />
    <Path d="M17 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z" stroke="#00C853" strokeWidth={2} strokeLinecap=\"round\" strokeLinejoin=\"round\" />
  </Svg>
);
const ChromeIcon = ({ size = 14 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke="#00C853" strokeWidth={2} />
    <Circle cx="12" cy="12" r="4" stroke="#00C853" strokeWidth={2} />
  </Svg>
);
const CheckIcon = ({ size = 14, color = "#00C853" }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Polyline points="20 6 9 17 4 12" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const XIcon = ({ size = 14, color = "#e94560" }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    <Line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
  </Svg>
);
const AlertOctagonIcon = ({ size = 14, color = "#FF1744" }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86L7.86 2z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="12" y1="8" x2="12" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Line x1="12" y1="16" x2="12.01" y2="16" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);
const FlaskIcon = ({ size = 14, color = "#6C63FF" }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9 3h6v7l4 8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2l4-8V3z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="9" y1="3" x2="15" y2="3" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);
const LogOutIcon = ({ size = 16, color = "#e94560" }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="16 17 21 12 16 7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1="21" y1="12" x2="9" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const SettingsIcon = ({ size = 16 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="3" stroke="#fff" strokeWidth={2} />
    <Path d="M12 1v6m0 6v10M1 12h6m6 0h10M4.22 4.22l4.24 4.24m7.08 7.08l4.24 4.24M4.22 19.78l4.24-4.24m7.08-7.08l4.24-4.24" stroke="#fff" strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

// ── Test Presets ──────────────────────────────────────────────────────────────

const TEST_PRESETS = [
  { label: "TikTok", pkg: "com.zhiliaoapp.musically", name: "TikTok", expect: "minor", icon: MusicIcon },
  { label: "Discord", pkg: "com.discord", name: "Discord", expect: "minor", icon: MessageIcon },
  { label: "Snapchat", pkg: "com.snapchat.android", name: "Snapchat", expect: "minor", icon: ShapesIcon },
  { label: "Tinder", pkg: "com.tinder", name: "Tinder", expect: "critical", icon: FlameIcon },
  { label: "Bet365", pkg: "com.bet365", name: "Bet365", expect: "critical", icon: DiceIcon },
  { label: "Omegle", pkg: "com.omegle", name: "Omegle", expect: "critical", icon: VideoIcon },
  { label: "Roblox (safe)", pkg: "com.roblox.client", name: "Roblox", expect: "safe", icon: GamepadIcon },
  { label: "Chrome (safe)", pkg: "com.android.chrome", name: "Chrome", expect: "safe", icon: ChromeIcon },
];

// ── Log Entry Component ──────────────────────────────────────────────────────

function LogEntry({ log }: { log: DetectionLog }) {
  const time = new Date(log.timestamp).toLocaleTimeString();
  const isError = log.action.toLowerCase().includes("error") || !!log.error;
  const isFlag = log.action.toLowerCase().includes("flagged");
  const isSafe = log.action.toLowerCase().includes("safe") || log.action.toLowerCase().includes("passed");
  const isSim = log.action.toLowerCase().includes("simulating");

  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: "#2d3748",
        paddingVertical: 10,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        {isError && <XIcon size={12} color="#e94560" />}
        {isFlag && <AlertOctagonIcon size={12} color="#FF1744" />}
        {isSafe && <CheckIcon size={12} color="#00C853" />}
        {isSim && <FlaskIcon size={12} color="#6C63FF" />}
        <Text style={{ fontSize: 10, color: "#4a5568", fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }) }}>
          {time}
        </Text>
      </View>
      {log.appName !== "-" && (
        <Text style={{ fontSize: 12, color: "#a0aec0", marginTop: 2 }}>
          {log.appName} ({log.packageName})
        </Text>
      )}
      {log.tier1Category && (
        <Text style={{ fontSize: 11, color: "#FFD700", marginTop: 2 }}>
          Tier 1: {log.tier1Category}
        </Text>
      )}
      <Text
        style={{
          fontSize: 12,
          marginTop: 4,
          fontWeight: "600",
          color: isError ? "#e94560" : isFlag ? "#FF1744" : isSafe ? "#00C853" : isSim ? "#6C63FF" : "#fff",
        }}
      >
        {log.action}
      </Text>
      {log.tier2Result && (
        <View style={{ backgroundColor: "#0f0f23", borderRadius: 6, padding: 8, marginTop: 6 }}>
          <Text style={{ fontSize: 10, color: "#74b9ff", fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }), lineHeight: 15 }}>
            suspicious: {String(log.tier2Result.suspicious)}{"\n"}
            confidence: {(log.tier2Result.confidence * 100).toFixed(0)}%{"\n"}
            severity: {log.tier2Result.severity}{"\n"}
            action: {log.tier2Result.trigger_action}{"\n"}
            reasoning: {log.tier2Result.reasoning}
          </Text>
        </View>
      )}
      {log.error && (
        <Text style={{ fontSize: 11, color: "#e94560", marginTop: 4 }}>
          Error: {log.error}
        </Text>
      )}
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────

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

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: signOut },
    ]);
  };

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
      if (fg) {
        Alert.alert("Foreground App", `${fg.appName}\n${fg.packageName}`);
      } else {
        Alert.alert("Info", "No foreground app detected");
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? String(e));
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#0f0f23" }}
      contentContainerStyle={{ padding: 24, paddingBottom: 60 }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <SettingsIcon size={24} />
        <Text style={{ fontSize: 24, fontWeight: "bold", color: "#fff" }}>
          Settings
        </Text>
      </View>

      {/* ── Profile Card ──────────────────────────────────────────────────── */}
      <View
        style={{
          backgroundColor: "#16213e",
          borderRadius: 12,
          padding: 20,
          marginTop: 24,
          borderWidth: 1,
          borderColor: "#2d3748",
        }}
      >
        <Text style={{ color: "#a0aec0", fontSize: 14 }}>Name</Text>
        <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold" }}>
          {user?.user_metadata?.name ?? "—"}
        </Text>

        <Text style={{ color: "#a0aec0", fontSize: 14, marginTop: 16 }}>Email</Text>
        <Text style={{ color: "#fff", fontSize: 16 }}>{user?.email ?? "—"}</Text>

        <Text style={{ color: "#a0aec0", fontSize: 14, marginTop: 16 }}>Role</Text>
        <Text style={{ color: "#6C63FF", fontSize: 16, fontWeight: "bold" }}>
          {user?.user_metadata?.role ?? "—"}
        </Text>

        <Text style={{ color: "#a0aec0", fontSize: 14, marginTop: 16 }}>Linked Parent</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
          {parentId ? (
            <>
              <CheckIcon size={16} color="#00C853" />
              <Text style={{ color: "#00C853", fontSize: 16, fontWeight: "bold" }}>Connected</Text>
            </>
          ) : (
            <>
              <XIcon size={16} color="#e94560" />
              <Text style={{ color: "#e94560", fontSize: 16, fontWeight: "bold" }}>Not linked</Text>
            </>
          )}
        </View>
      </View>

      {/* ── Link to Parent ────────────────────────────────────────────────── */}
      {!parentId && (
        <View
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
          <Text style={{ color: "#a0aec0", fontSize: 13, marginTop: 4 }}>
            Enter the invite code your parent shared
          </Text>
          <TextInput
            placeholder="Enter code (e.g., ABC123)"
            placeholderTextColor="#a0aec0"
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            maxLength={6}
            autoCapitalize="characters"
            style={{
              backgroundColor: "#0f0f23",
              color: "#FFD700",
              padding: 14,
              borderRadius: 8,
              fontSize: 20,
              fontWeight: "bold",
              textAlign: "center",
              letterSpacing: 6,
              marginTop: 12,
            }}
          />
          <TouchableOpacity
            onPress={async () => {
              if (!user || !code.trim()) return;
              setLinking(true);
              const ok = await acceptInvite(user.id, code);
              setLinking(false);
              if (ok) Alert.alert("Linked!", "You are now connected to your parent.");
              else Alert.alert("Error", "Invalid or expired code");
              setCode("");
            }}
            disabled={linking || code.length < 4}
            style={{
              backgroundColor: linking || code.length < 4 ? "#4a4a8a" : "#6C63FF",
              padding: 12,
              borderRadius: 8,
              alignItems: "center",
              marginTop: 12,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>
              {linking ? "Linking..." : "Link Account"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── SUSPICIOUS ACTIVITY DETECTION ──────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      <View
        style={{
          backgroundColor: "#16213e",
          borderRadius: 12,
          padding: 20,
          marginTop: 24,
          borderWidth: 1,
          borderColor: "#2d3748",
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16, marginBottom: 12 }}>
          Suspicious Activity Detection
        </Text>

        {/* Enable toggle */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <Text style={{ color: "#a0aec0", fontSize: 14 }}>Enable Detection</Text>
          <Switch
            value={isEnabled}
            onValueChange={setEnabled}
            trackColor={{ false: "#2d3748", true: "#6C63FF" }}
            thumbColor={isEnabled ? "#a29bfe" : "#666"}
          />
        </View>

        {/* Dev mode toggle */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Text style={{ color: "#a0aec0", fontSize: 14 }}>Developer Testing Mode</Text>
          <Switch
            value={devMode}
            onValueChange={setDevMode}
            trackColor={{ false: "#2d3748", true: "#00C853" }}
            thumbColor={devMode ? "#55efc4" : "#666"}
          />
        </View>

        {/* Status */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: isDetecting ? "#00C853" : "#636e72",
            }}
          />
          <Text style={{ color: "#a0aec0", fontSize: 13 }}>
            {isDetecting ? "Detection running" : isEnabled ? "Waiting to start..." : "Detection off"}
          </Text>
        </View>
        {lastCheckedApp && (
          <Text style={{ color: "#4a5568", fontSize: 11, marginTop: 4 }}>
            Last checked: {lastCheckedApp}
          </Text>
        )}
        <Text style={{ color: "#4a5568", fontSize: 11, marginTop: 2 }}>
          Flags: {flagCountToday}/{DetectionConfig.MAX_FLAGS_PER_DAY} | Interval: {DetectionConfig.INTERVAL_MS / 1000}s | Cooldown: {DetectionConfig.ALERT_COOLDOWN_MS / 60000}min
        </Text>
      </View>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ── DEVELOPER TESTING PANEL ────────────────────────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      {devMode && (
        <>
          {/* ── Quick Test Presets ─────────────────────────────────────────── */}
          <View
            style={{
              backgroundColor: "#16213e",
              borderRadius: 12,
              padding: 20,
              marginTop: 16,
              borderWidth: 1,
              borderColor: "#2d3748",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16, marginBottom: 4 }}>
              Test Detection Pipeline
            </Text>
            <Text style={{ color: "#4a5568", fontSize: 12, marginBottom: 12, lineHeight: 17 }}>
              Simulates the full Tier 1 (pattern match) → Tier 2 (LLM call) pipeline without needing the actual app in foreground. OpenRouter API required for Tier 2.
            </Text>

            <Text style={{ color: "#a0aec0", fontSize: 13, fontWeight: "600", marginBottom: 8 }}>
              Quick Tests:
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {TEST_PRESETS.map((p) => {
                const IconComponent = p.icon;
                return (
                  <TouchableOpacity
                    key={p.pkg}
                    disabled={simulating}
                    onPress={() => runSimulation(p.name, p.pkg)}
                    style={{
                      backgroundColor: simulating ? "#1a1a2e" : "#0f0f23",
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: p.expect === "critical" ? "#e94560" : p.expect === "minor" ? "#FFD700" : "#2d3748",
                      opacity: simulating ? 0.4 : 1,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <IconComponent size={14} />
                    <View>
                      <Text style={{ color: "#fff", fontSize: 12 }}>{p.label}</Text>
                      <Text style={{ color: "#4a5568", fontSize: 9 }}>({p.expect})</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {simulating && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <ActivityIndicator size="small" color="#6C63FF" />
                <Text style={{ color: "#6C63FF", fontSize: 12 }}>Calling LLM...</Text>
              </View>
            )}

            {/* Custom test */}
            <Text style={{ color: "#a0aec0", fontSize: 13, fontWeight: "600", marginBottom: 8 }}>
              Custom Test:
            </Text>
            <TextInput
              placeholder="App name (e.g. MyApp)"
              placeholderTextColor="#4a5568"
              value={customApp}
              onChangeText={setCustomApp}
              style={{
                backgroundColor: "#0f0f23",
                color: "#fff",
                padding: 12,
                borderRadius: 8,
                fontSize: 14,
                borderWidth: 1,
                borderColor: "#2d3748",
                marginBottom: 8,
              }}
            />
            <TextInput
              placeholder="Package name (e.g. com.example.app)"
              placeholderTextColor="#4a5568"
              value={customPkg}
              onChangeText={setCustomPkg}
              style={{
                backgroundColor: "#0f0f23",
                color: "#fff",
                padding: 12,
                borderRadius: 8,
                fontSize: 14,
                borderWidth: 1,
                borderColor: "#2d3748",
                marginBottom: 8,
              }}
            />
            <TouchableOpacity
              disabled={!customApp || !customPkg || simulating}
              onPress={() => runSimulation(customApp, customPkg)}
              style={{
                backgroundColor: !customApp || !customPkg || simulating ? "#2d3748" : "#6C63FF",
                padding: 12,
                borderRadius: 8,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>Run Custom Test</Text>
            </TouchableOpacity>

            {/* Check live foreground app */}
            <TouchableOpacity
              onPress={checkLiveApp}
              style={{
                borderWidth: 1,
                borderColor: "#6C63FF",
                padding: 10,
                borderRadius: 8,
                alignItems: "center",
                marginTop: 12,
              }}
            >
              <Text style={{ color: "#6C63FF", fontSize: 13, fontWeight: "600" }}>
                Check Current Foreground App
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Pending Alert Preview ─────────────────────────────────────── */}
          {pendingAlert && (
            <View
              style={{
                backgroundColor: pendingAlert.severity === "critical" ? "#2a0a0a" : "#2a200a",
                borderRadius: 12,
                padding: 16,
                marginTop: 16,
                borderWidth: 1,
                borderColor: pendingAlert.severity === "critical" ? "#e94560" : "#FFD700",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 14 }}>
                Active Alert Preview
              </Text>
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700", marginTop: 4 }}>
                {pendingAlert.appName}
              </Text>
              <Text
                style={{
                  color: pendingAlert.severity === "critical" ? "#FF1744" : "#FFD700",
                  fontSize: 12,
                  fontWeight: "800",
                  marginTop: 4,
                }}
              >
                {pendingAlert.severity.toUpperCase()}
              </Text>
              <Text style={{ color: "#a0aec0", fontSize: 13, marginTop: 4, lineHeight: 18 }}>
                {pendingAlert.reasoning}
              </Text>
              {pendingAlert.auraDeducted && (
                <Text style={{ color: "#FF1744", fontWeight: "700", marginTop: 4 }}>
                  −50 Aura deducted
                </Text>
              )}
              <TouchableOpacity
                onPress={dismissPendingAlert}
                style={{
                  backgroundColor: "#2d3748",
                  padding: 8,
                  borderRadius: 8,
                  alignItems: "center",
                  marginTop: 10,
                }}
              >
                <Text style={{ color: "#a0aec0", fontSize: 12 }}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Detection Log ─────────────────────────────────────────────── */}
          <View
            style={{
              backgroundColor: "#16213e",
              borderRadius: 12,
              padding: 20,
              marginTop: 16,
              borderWidth: 1,
              borderColor: "#2d3748",
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
                Detection Log ({detectionLogs.length})
              </Text>
              {detectionLogs.length > 0 && (
                <TouchableOpacity onPress={clearLogs}>
                  <Text style={{ color: "#6C63FF", fontSize: 13, fontWeight: "600" }}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>

            {detectionLogs.length === 0 ? (
              <Text style={{ color: "#4a5568", fontSize: 12, fontStyle: "italic" }}>
                No events yet. Enable detection or run a test above.
              </Text>
            ) : (
              detectionLogs.map((log) => <LogEntry key={log.id} log={log} />)
            )}
          </View>

          {/* ── Risk Registry Reference ───────────────────────────────────── */}
          <View
            style={{
              backgroundColor: "#16213e",
              borderRadius: 12,
              padding: 20,
              marginTop: 16,
              borderWidth: 1,
              borderColor: "#2d3748",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16, marginBottom: 8 }}>
              Risk Registry ({RISK_REGISTRY.length} entries)
            </Text>
            {RISK_REGISTRY.map((entry, i) => (
              <View
                key={i}
                style={{
                  borderTopWidth: i > 0 ? 1 : 0,
                  borderTopColor: "#2d3748",
                  paddingVertical: 8,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>
                    {entry.category}
                  </Text>
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "800",
                      color: entry.baseSeverity === "critical" ? "#e94560" : "#FFD700",
                      textTransform: "uppercase",
                    }}
                  >
                    {entry.baseSeverity}
                  </Text>
                </View>
                <Text style={{ color: "#4a5568", fontSize: 10, marginTop: 2, fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }) }}>
                  {entry.patterns.join(" | ")}
                </Text>
                <Text style={{ color: "#636e72", fontSize: 10, marginTop: 2 }}>
                  {entry.description} (min {entry.minMinutes}min)
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* ── Sign Out ──────────────────────────────────────────────────────── */}
      <TouchableOpacity
        onPress={handleSignOut}
        style={{
          backgroundColor: "#e94560",
          padding: 16,
          borderRadius: 12,
          alignItems: "center",
          marginTop: 24,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
          Sign Out
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
