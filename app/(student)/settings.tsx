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
import { useAuthStore } from "../../store/authStore";
import { useFamilyStore } from "../../store/familyStore";
import {
  useSuspiciousActivityStore,
  DetectionLog,
} from "../../store/suspiciousActivityStore";
import { RISK_REGISTRY, DetectionConfig } from "../../constants";
import * as UsageStats from "../../modules/usage-stats";

// ── Test Presets ──────────────────────────────────────────────────────────────

const TEST_PRESETS = [
  { label: "🎵 TikTok", pkg: "com.zhiliaoapp.musically", name: "TikTok", expect: "minor" },
  { label: "💬 Discord", pkg: "com.discord", name: "Discord", expect: "minor" },
  { label: "👻 Snapchat", pkg: "com.snapchat.android", name: "Snapchat", expect: "minor" },
  { label: "🔥 Tinder", pkg: "com.tinder", name: "Tinder", expect: "critical" },
  { label: "🎰 Bet365", pkg: "com.bet365", name: "Bet365", expect: "critical" },
  { label: "📹 Omegle", pkg: "com.omegle", name: "Omegle", expect: "critical" },
  { label: "🎮 Roblox (safe)", pkg: "com.roblox.client", name: "Roblox", expect: "safe" },
  { label: "📱 Chrome (safe)", pkg: "com.android.chrome", name: "Chrome", expect: "safe" },
];

// ── Log Entry Component ──────────────────────────────────────────────────────

function LogEntry({ log }: { log: DetectionLog }) {
  const time = new Date(log.timestamp).toLocaleTimeString();
  const isError = log.action.includes("❌") || !!log.error;
  const isFlag = log.action.includes("🚨");
  const isSafe = log.action.includes("✅");
  const isSim = log.action.includes("🧪");

  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: "#2d3748",
        paddingVertical: 10,
      }}
    >
      <Text style={{ fontSize: 10, color: "#4a5568", fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }) }}>
        {time}
      </Text>
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
      <Text style={{ fontSize: 24, fontWeight: "bold", color: "#fff" }}>
        Settings ⚙️
      </Text>

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
        <Text
          style={{
            color: parentId ? "#00C853" : "#e94560",
            fontSize: 16,
            fontWeight: "bold",
          }}
        >
          {parentId ? "✅ Connected" : "❌ Not linked"}
        </Text>
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
          🛡️ Suspicious Activity Detection
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
              🧪 Test Detection Pipeline
            </Text>
            <Text style={{ color: "#4a5568", fontSize: 12, marginBottom: 12, lineHeight: 17 }}>
              Simulates the full Tier 1 (pattern match) → Tier 2 (LLM call) pipeline without needing the actual app in foreground. OpenRouter API required for Tier 2.
            </Text>

            <Text style={{ color: "#a0aec0", fontSize: 13, fontWeight: "600", marginBottom: 8 }}>
              Quick Tests:
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {TEST_PRESETS.map((p) => (
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
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 12 }}>{p.label}</Text>
                  <Text style={{ color: "#4a5568", fontSize: 9 }}>({p.expect})</Text>
                </TouchableOpacity>
              ))}
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
                📱 Check Current Foreground App
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
                🔔 Active Alert Preview
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
                📋 Detection Log ({detectionLogs.length})
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
              📖 Risk Registry ({RISK_REGISTRY.length} entries)
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
