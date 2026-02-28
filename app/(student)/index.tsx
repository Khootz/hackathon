import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  RefreshControl,
  AppState,
  AppStateStatus,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../store/authStore";
import { useAuraStore } from "../../store/auraStore";
import * as UsageStats from "../../modules/usage-stats";

// ── Types ────────────────────────────────────────────────────────────────────

interface TrackedApp {
  packageName: string;
  appName: string;
  drainRate: number;
  isLocked: boolean;
}

interface DrainRecord {
  [packageName: string]: number; // total aura already drained today
}

const STORAGE_KEYS = {
  trackedApps: "@auramax_tracked_v2",
  drainRecord: "@auramax_drain_",
};

function todayDrainKey() {
  return STORAGE_KEYS.drainRecord + new Date().toISOString().split("T")[0];
}

// ── Component ────────────────────────────────────────────────────────────────

export default function StudentHome() {
  const user = useAuthStore((s) => s.user);
  const userName = user?.user_metadata?.name ?? "Student";
  const { balance, invested, fetchBalance, drainAura, earnAura } = useAuraStore();
  const router = useRouter();
  const userId = user?.id;

  // ── Permission state ─────────────────────────────────────────────────────
  const [hasUsageAccess, setHasUsageAccess] = useState(false);
  const [hasOverlayPerm, setHasOverlayPerm] = useState(false);
  const [permChecked, setPermChecked] = useState(false);

  // ── App & usage data ─────────────────────────────────────────────────────
  const [installedApps, setInstalledApps] = useState<UsageStats.AppInfo[]>([]);
  const [trackedApps, setTrackedApps] = useState<TrackedApp[]>([]);
  const [todayUsage, setTodayUsage] = useState<UsageStats.TodayUsage[]>([]);
  const [totalMinutesToday, setTotalMinutesToday] = useState(0);
  const [totalDrainedToday, setTotalDrainedToday] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // ── Lock service state ───────────────────────────────────────────────────
  const [lockServiceRunning, setLockServiceRunning] = useState(false);

  // ── Modals ───────────────────────────────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [settingsApp, setSettingsApp] = useState<TrackedApp | null>(null);
  const [showAppLock, setShowAppLock] = useState(false);

  const available = Math.max(0, balance - invested);

  // ── Permission checks ────────────────────────────────────────────────────

  const checkPermissions = useCallback(() => {
    if (Platform.OS !== "android") {
      setPermChecked(true);
      return;
    }
    try {
      const usage = UsageStats.isUsageAccessGranted();
      const overlay = UsageStats.canDrawOverlays();
      setHasUsageAccess(usage);
      setHasOverlayPerm(overlay);
    } catch (e) {
      console.warn("Permission check failed:", e);
    }
    setPermChecked(true);
  }, []);

  // ── Persistence ──────────────────────────────────────────────────────────

  const loadTrackedApps = useCallback(async (): Promise<TrackedApp[]> => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.trackedApps);
      const apps: TrackedApp[] = raw ? JSON.parse(raw) : [];
      setTrackedApps(apps);
      return apps;
    } catch {
      return [];
    }
  }, []);

  const saveTrackedApps = useCallback(async (apps: TrackedApp[]) => {
    setTrackedApps(apps);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.trackedApps, JSON.stringify(apps));
    } catch {}
  }, []);

  const loadDrainRecord = useCallback(async (): Promise<DrainRecord> => {
    try {
      const raw = await AsyncStorage.getItem(todayDrainKey());
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, []);

  const saveDrainRecord = useCallback(async (record: DrainRecord) => {
    try {
      await AsyncStorage.setItem(todayDrainKey(), JSON.stringify(record));
    } catch {}
  }, []);

  // ── Load real native usage & reconcile aura drain ────────────────────────

  const refreshNativeData = useCallback(async (apps?: TrackedApp[]) => {
    if (!hasUsageAccess || !userId) return;

    const tracked = apps ?? trackedApps;
    if (tracked.length === 0) {
      setTodayUsage([]);
      setTotalMinutesToday(0);
      setTotalDrainedToday(0);
      return;
    }

    try {
      const usage = await UsageStats.getTodayUsage();
      const trackedPkgs = new Set(tracked.map((a) => a.packageName));

      // Filter to only tracked apps
      const relevantUsage = usage.filter((u) => trackedPkgs.has(u.packageName));
      setTodayUsage(relevantUsage);
      setTotalMinutesToday(
        relevantUsage.reduce((sum, u) => sum + u.totalMinutes, 0)
      );

      // ── Reconcile aura drain (catch-up logic) ──────────────────────
      const drainRecord = await loadDrainRecord();
      let totalNewDrain = 0;

      for (const u of relevantUsage) {
        const app = tracked.find((a) => a.packageName === u.packageName);
        if (!app) continue;

        const rate = app.drainRate;
        const expectedDrain = u.totalMinutes * rate;
        const previouslyDrained = drainRecord[u.packageName] ?? 0;
        const toDrain = expectedDrain - previouslyDrained;

        if (toDrain > 0.1) {
          // Apply 3x penalty if app is locked
          const penalty = app.isLocked ? 3 : 1;
          const finalDrain = toDrain * penalty;

          await drainAura(userId, finalDrain, app.appName);
          drainRecord[u.packageName] = expectedDrain;
          totalNewDrain += finalDrain;
        }
      }

      if (totalNewDrain > 0) {
        await saveDrainRecord(drainRecord);
        await fetchBalance(userId);
      }

      // Check if aura depleted
      const currentBalance = useAuraStore.getState().balance;
      if (currentBalance <= 0) {
        setShowAppLock(true);
      }

      setTotalDrainedToday(
        Object.values(drainRecord).reduce((sum, v) => sum + v, 0)
      );
    } catch (e) {
      console.warn("Failed to load native usage:", e);
    }
  }, [hasUsageAccess, userId, trackedApps, drainAura, fetchBalance, loadDrainRecord, saveDrainRecord]);

  // ── Lock service management ──────────────────────────────────────────────

  const syncLockService = useCallback((apps: TrackedApp[]) => {
    const lockedPkgs = apps
      .filter((a) => a.isLocked)
      .map((a) => a.packageName);

    if (lockedPkgs.length > 0 && hasOverlayPerm) {
      if (lockServiceRunning) {
        UsageStats.updateLockedApps(lockedPkgs);
      } else {
        UsageStats.startLockService(lockedPkgs);
        setLockServiceRunning(true);
      }
    } else if (lockServiceRunning) {
      UsageStats.stopLockService();
      setLockServiceRunning(false);
    }
  }, [hasOverlayPerm, lockServiceRunning]);

  // ── Init ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    checkPermissions();
  }, []);

  useEffect(() => {
    if (!permChecked) return;

    (async () => {
      setLoading(true);
      const apps = await loadTrackedApps();
      if (userId) await fetchBalance(userId);

      if (hasUsageAccess) {
        try {
          const installed = await UsageStats.getInstalledApps();
          setInstalledApps(installed);
        } catch {}
        await refreshNativeData(apps);
        syncLockService(apps);
      }
      setLoading(false);
    })();
  }, [permChecked, hasUsageAccess, userId]);

  // ── AppState: refresh on resume ──────────────────────────────────────────

  useEffect(() => {
    const sub = AppState.addEventListener("change", async (next: AppStateStatus) => {
      if (next === "active") {
        checkPermissions();
        if (hasUsageAccess) {
          await refreshNativeData();
          if (userId) await fetchBalance(userId);
        }
      }
    });
    return () => sub.remove();
  }, [hasUsageAccess, userId, refreshNativeData, checkPermissions]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleTrackApp = async (app: UsageStats.AppInfo) => {
    if (trackedApps.some((a) => a.packageName === app.packageName)) {
      Alert.alert("Already tracked", `${app.appName} is in your list.`);
      return;
    }
    const updated = [
      ...trackedApps,
      { packageName: app.packageName, appName: app.appName, drainRate: 1, isLocked: false },
    ];
    await saveTrackedApps(updated);
    setShowAddModal(false);
  };

  const handleRemoveApp = async (pkg: string) => {
    const updated = trackedApps.filter((a) => a.packageName !== pkg);
    await saveTrackedApps(updated);
    syncLockService(updated);
    setSettingsApp(null);
  };

  const handleUpdateDrainRate = async (pkg: string, rate: number) => {
    const updated = trackedApps.map((a) =>
      a.packageName === pkg ? { ...a, drainRate: rate } : a
    );
    await saveTrackedApps(updated);
    if (settingsApp?.packageName === pkg)
      setSettingsApp({ ...settingsApp, drainRate: rate });
  };

  const handleToggleLock = async (pkg: string) => {
    const updated = trackedApps.map((a) =>
      a.packageName === pkg ? { ...a, isLocked: !a.isLocked } : a
    );
    await saveTrackedApps(updated);
    syncLockService(updated);

    const app = updated.find((a) => a.packageName === pkg);
    if (app && settingsApp?.packageName === pkg) setSettingsApp(app);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    checkPermissions();
    const apps = await loadTrackedApps();
    if (hasUsageAccess) {
      try {
        const installed = await UsageStats.getInstalledApps();
        setInstalledApps(installed);
      } catch {}
      await refreshNativeData(apps);
    }
    if (userId) await fetchBalance(userId);
    setRefreshing(false);
  }, [hasUsageAccess, userId, refreshNativeData, checkPermissions]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const fmt = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const getUsageForApp = (pkg: string) =>
    todayUsage.find((u) => u.packageName === pkg);

  // ── RENDER ─────────────────────────────────────────────────────────────────

  // Permission gating
  if (permChecked && !hasUsageAccess && Platform.OS === "android") {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#0f0f23",
          justifyContent: "center",
          alignItems: "center",
          padding: 32,
        }}
      >
        <Text style={{ fontSize: 56 }}>{"\uD83D\uDD13"}</Text>
        <Text
          style={{
            fontSize: 22,
            fontWeight: "bold",
            color: "#fff",
            marginTop: 16,
            textAlign: "center",
          }}
        >
          Usage Access Required
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: "#a0aec0",
            textAlign: "center",
            marginTop: 10,
            lineHeight: 22,
          }}
        >
          AuraMax needs permission to read app usage so it can automatically track screen time.
        </Text>
        <TouchableOpacity
          onPress={() => {
            UsageStats.requestUsageAccess();
          }}
          style={{
            backgroundColor: "#6C63FF",
            padding: 16,
            borderRadius: 12,
            alignItems: "center",
            marginTop: 24,
            width: "100%",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>
            Grant Usage Access
          </Text>
        </TouchableOpacity>
        <Text
          style={{ color: "#4a5568", fontSize: 12, textAlign: "center", marginTop: 12 }}
        >
          Find AuraMax in the list and toggle it on, then come back.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#0f0f23",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={{ color: "#a0aec0", marginTop: 12 }}>Loading real usage data...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0f0f23" }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C63FF" />
        }
      >
        {/* Header */}
        <Text style={{ fontSize: 26, fontWeight: "bold", color: "#fff" }}>
          Hey, {userName}!
        </Text>
        <Text style={{ fontSize: 14, color: "#a0aec0", marginTop: 2 }}>
          {balance > 100
            ? "Your screen time is being tracked automatically."
            : "Aura running low \u2014 time to learn!"}
        </Text>

        {/* Aura Balance */}
        <View
          style={{
            backgroundColor: "#16213e",
            borderRadius: 16,
            padding: 20,
            marginTop: 16,
            alignItems: "center",
            borderWidth: 1,
            borderColor: balance > 100 ? "#2d3748" : "#e94560",
          }}
        >
          <Text style={{ fontSize: 13, color: "#a0aec0" }}>Aura Balance</Text>
          <Text
            style={{
              fontSize: 44,
              fontWeight: "bold",
              color:
                balance > 100 ? "#FFD700" : balance > 0 ? "#FF6B35" : "#e94560",
              marginTop: 4,
            }}
          >
            {Math.round(balance)}
          </Text>
          <View style={{ flexDirection: "row", gap: 24, marginTop: 6 }}>
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: "#a0aec0", fontSize: 11 }}>Available</Text>
              <Text style={{ color: "#00C853", fontWeight: "bold" }}>
                {Math.round(available)}
              </Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: "#a0aec0", fontSize: 11 }}>Invested</Text>
              <Text style={{ color: "#6C63FF", fontWeight: "bold" }}>
                {Math.round(invested)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── DEV: Quick Aura Controls (remove before release) ── */}
        <View
          style={{
            flexDirection: "row",
            gap: 8,
            marginTop: 10,
            backgroundColor: "#1a0a2e",
            borderRadius: 10,
            padding: 10,
            borderWidth: 1,
            borderColor: "#6C63FF",
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#6C63FF", fontSize: 11, fontWeight: "bold", marginRight: 4 }}>
            DEV
          </Text>
          {[
            { label: "+50", fn: () => userId && earnAura(userId, 50, "DEV") },
            { label: "+200", fn: () => userId && earnAura(userId, 200, "DEV") },
            { label: "-50", fn: () => userId && drainAura(userId, 50, "DEV") },
            { label: "Set 10", fn: async () => { if (userId) { const drain = Math.max(0, balance - 10); if (drain > 0) await drainAura(userId, drain, "DEV"); } } },
            { label: "Set 0", fn: async () => { if (userId) { if (balance > 0) await drainAura(userId, balance, "DEV"); setShowAppLock(true); } } },
          ].map((btn) => (
            <TouchableOpacity
              key={btn.label}
              onPress={async () => { await btn.fn(); await fetchBalance(userId!); }}
              style={{
                flex: 1,
                backgroundColor: "#2d1b69",
                borderRadius: 6,
                paddingVertical: 6,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontSize: 12, fontWeight: "bold" }}>{btn.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Stats */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: "#16213e",
              borderRadius: 12,
              padding: 14,
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#2d3748",
            }}
          >
            <Text style={{ color: "#a0aec0", fontSize: 11 }}>Screen Time</Text>
            <Text
              style={{
                color: "#fff",
                fontWeight: "bold",
                fontSize: 18,
                marginTop: 2,
              }}
            >
              {fmt(totalMinutesToday)}
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: "#16213e",
              borderRadius: 12,
              padding: 14,
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#2d3748",
            }}
          >
            <Text style={{ color: "#a0aec0", fontSize: 11 }}>Aura Drained</Text>
            <Text
              style={{
                color: "#e94560",
                fontWeight: "bold",
                fontSize: 18,
                marginTop: 2,
              }}
            >
              {Math.round(totalDrainedToday)}
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: "#16213e",
              borderRadius: 12,
              padding: 14,
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#2d3748",
            }}
          >
            <Text style={{ color: "#a0aec0", fontSize: 11 }}>Tracked</Text>
            <Text
              style={{
                color: "#6C63FF",
                fontWeight: "bold",
                fontSize: 18,
                marginTop: 2,
              }}
            >
              {trackedApps.length}
            </Text>
          </View>
        </View>

        {/* Overlay permission banner */}
        {!hasOverlayPerm && trackedApps.some((a) => a.isLocked) && (
          <TouchableOpacity
            onPress={() => UsageStats.requestOverlayPermission()}
            style={{
              backgroundColor: "#2d1a00",
              borderRadius: 12,
              padding: 14,
              marginTop: 12,
              borderWidth: 1,
              borderColor: "#FF6B35",
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Text style={{ fontSize: 20 }}>{"\u26A0\uFE0F"}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#FF6B35", fontWeight: "bold", fontSize: 13 }}>
                Overlay permission needed
              </Text>
              <Text style={{ color: "#a0aec0", fontSize: 11, marginTop: 2 }}>
                Tap to allow "Draw over other apps" so locked apps can be blocked.
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* ── App Tracking Header ──────────────────────────────────────── */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 20,
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: "bold", color: "#fff" }}>
            Tracked Apps
          </Text>
          <TouchableOpacity
            onPress={() => setShowAddModal(true)}
            style={{
              backgroundColor: "#6C63FF",
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 13, fontWeight: "bold" }}>
              + Add App
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={{ color: "#718096", fontSize: 12, marginTop: 4, marginBottom: 8 }}>
          Real usage is tracked automatically via Android UsageStats.
        </Text>

        {/* ── Empty state ──────────────────────────────────────────────── */}
        {trackedApps.length === 0 && (
          <TouchableOpacity
            onPress={() => setShowAddModal(true)}
            style={{
              backgroundColor: "#16213e",
              borderRadius: 12,
              padding: 28,
              alignItems: "center",
              borderWidth: 1,
              borderColor: "#2d3748",
              borderStyle: "dashed",
            }}
          >
            <Text style={{ fontSize: 36 }}>{"\uD83D\uDCF1"}</Text>
            <Text
              style={{
                color: "#fff",
                fontWeight: "bold",
                marginTop: 8,
                fontSize: 15,
              }}
            >
              No apps tracked yet
            </Text>
            <Text
              style={{
                color: "#718096",
                fontSize: 13,
                marginTop: 4,
                textAlign: "center",
              }}
            >
              Tap here to pick from your installed apps
            </Text>
          </TouchableOpacity>
        )}

        {/* ── App Cards ────────────────────────────────────────────────── */}
        {trackedApps.map((app) => {
          const usage = getUsageForApp(app.packageName);
          const mins = usage?.totalMinutes ?? 0;
          return (
            <TouchableOpacity
              key={app.packageName}
              onPress={() => setSettingsApp(app)}
              activeOpacity={0.7}
              style={{
                backgroundColor: app.isLocked ? "#1a1020" : "#16213e",
                borderRadius: 12,
                padding: 14,
                marginBottom: 8,
                flexDirection: "row",
                alignItems: "center",
                borderWidth: 1,
                borderColor: app.isLocked ? "#6b21a8" : "#2d3748",
              }}
            >
              {/* Icon + Info */}
              <Text style={{ fontSize: 28, marginRight: 12 }}>
                {app.isLocked ? "\uD83D\uDD12" : "\uD83D\uDCF1"}
              </Text>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: app.isLocked ? "#9f7aea" : "#fff",
                    fontSize: 15,
                    fontWeight: "600",
                  }}
                >
                  {app.appName}
                </Text>
                {app.isLocked ? (
                  <Text style={{ color: "#9f7aea", fontSize: 11 }}>
                    Locked {"\u00B7"} 3x penalty active
                  </Text>
                ) : (
                  <Text style={{ color: "#718096", fontSize: 11 }}>
                    {app.drainRate}x drain
                    {mins > 0 ? ` ${"\u00B7"} ${fmt(mins)} today` : ` ${"\u00B7"} No usage today`}
                  </Text>
                )}
              </View>

              {/* Usage badge */}
              {mins > 0 && (
                <View
                  style={{
                    backgroundColor: app.isLocked ? "#4a1d96" : "#0d2818",
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 12,
                  }}
                >
                  <Text
                    style={{
                      color: app.isLocked ? "#c4b5fd" : "#00C853",
                      fontSize: 12,
                      fontWeight: "bold",
                    }}
                  >
                    {fmt(mins)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* ── How it works ─────────────────────────────────────────────── */}
        {trackedApps.length > 0 && (
          <View
            style={{
              backgroundColor: "#0d1117",
              borderRadius: 12,
              padding: 14,
              marginTop: 12,
              borderWidth: 1,
              borderColor: "#1e293b",
            }}
          >
            <Text
              style={{
                color: "#6C63FF",
                fontWeight: "bold",
                fontSize: 13,
                marginBottom: 4,
              }}
            >
              How it works
            </Text>
            <Text style={{ color: "#4a5568", fontSize: 12, lineHeight: 18 }}>
              {"\u2022 Usage is tracked automatically by Android\n\u2022 Aura drains based on real screen time\n\u2022 Locked apps trigger a 3x penalty + native block overlay\n\u2022 Pull down to refresh your stats"}
            </Text>
          </View>
        )}

        {/* Lock service toggle */}
        {trackedApps.some((a) => a.isLocked) && hasOverlayPerm && (
          <View
            style={{
              backgroundColor: "#16213e",
              borderRadius: 12,
              padding: 14,
              marginTop: 12,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              borderWidth: 1,
              borderColor: lockServiceRunning ? "#00C853" : "#2d3748",
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 14 }}>
                {"\uD83D\uDEE1\uFE0F"} App Lock Service
              </Text>
              <Text style={{ color: "#718096", fontSize: 11, marginTop: 2 }}>
                {lockServiceRunning
                  ? "Running \u2014 locked apps will be blocked"
                  : "Stopped \u2014 tap switch to activate"}
              </Text>
            </View>
            <Switch
              value={lockServiceRunning}
              onValueChange={(val) => {
                if (val) {
                  const lockedPkgs = trackedApps
                    .filter((a) => a.isLocked)
                    .map((a) => a.packageName);
                  UsageStats.startLockService(lockedPkgs);
                  setLockServiceRunning(true);
                } else {
                  UsageStats.stopLockService();
                  setLockServiceRunning(false);
                }
              }}
              trackColor={{ false: "#2d3748", true: "#00C853" }}
              thumbColor="#fff"
            />
          </View>
        )}
      </ScrollView>

      {/* ════════════════════════════════════════════════════════════════════
          MODAL: Pick installed apps to track
          ════════════════════════════════════════════════════════════════════ */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: "#0f0f23",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: "85%",
              paddingTop: 20,
            }}
          >
            {/* Header */}
            <View style={{ paddingHorizontal: 20 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 20, fontWeight: "bold", color: "#fff" }}>
                  Installed Apps
                </Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <Text style={{ color: "#718096", fontSize: 28, lineHeight: 28 }}>
                    x
                  </Text>
                </TouchableOpacity>
              </View>
              <Text
                style={{ color: "#718096", fontSize: 12, marginTop: 4, marginBottom: 12 }}
              >
                These are the real apps on your device. Tap to track.
              </Text>
            </View>

            {/* App list */}
            <ScrollView
              style={{ paddingHorizontal: 20 }}
              contentContainerStyle={{ paddingBottom: 32 }}
            >
              {installedApps
                .filter(
                  (a) =>
                    !trackedApps.some((t) => t.packageName === a.packageName)
                )
                .map((app) => (
                  <TouchableOpacity
                    key={app.packageName}
                    onPress={() => handleTrackApp(app)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "#16213e",
                      borderRadius: 10,
                      padding: 12,
                      marginBottom: 6,
                      borderWidth: 1,
                      borderColor: "#2d3748",
                    }}
                  >
                    <Text style={{ fontSize: 22, marginRight: 12 }}>
                      {"\uD83D\uDCF1"}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#fff", fontSize: 14 }}>
                        {app.appName}
                      </Text>
                      <Text style={{ color: "#4a5568", fontSize: 10 }}>
                        {app.packageName}
                      </Text>
                    </View>
                    <Text style={{ color: "#6C63FF", fontSize: 22 }}>+</Text>
                  </TouchableOpacity>
                ))}

              {installedApps.filter(
                (a) => !trackedApps.some((t) => t.packageName === a.packageName)
              ).length === 0 && (
                <Text
                  style={{
                    color: "#718096",
                    textAlign: "center",
                    marginTop: 20,
                  }}
                >
                  All apps already tracked!
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════════
          MODAL: App Settings (drain rate, lock, remove)
          ════════════════════════════════════════════════════════════════════ */}
      <Modal visible={!!settingsApp} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.7)",
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
          }}
        >
          {settingsApp && (
            <View
              style={{
                backgroundColor: "#16213e",
                borderRadius: 20,
                padding: 24,
                width: "100%",
                maxWidth: 360,
              }}
            >
              <Text style={{ fontSize: 24, textAlign: "center" }}>
                {settingsApp.isLocked ? "\uD83D\uDD12" : "\uD83D\uDCF1"}
              </Text>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "bold",
                  color: "#fff",
                  textAlign: "center",
                  marginTop: 8,
                }}
              >
                {settingsApp.appName}
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  color: "#4a5568",
                  textAlign: "center",
                  marginTop: 2,
                }}
              >
                {settingsApp.packageName}
              </Text>

              {/* Usage info */}
              {(() => {
                const u = getUsageForApp(settingsApp.packageName);
                return u ? (
                  <View
                    style={{
                      backgroundColor: "#0d2818",
                      borderRadius: 10,
                      padding: 12,
                      marginTop: 14,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{ color: "#00C853", fontWeight: "bold", fontSize: 18 }}
                    >
                      {fmt(u.totalMinutes)}
                    </Text>
                    <Text style={{ color: "#718096", fontSize: 11, marginTop: 2 }}>
                      used today
                    </Text>
                  </View>
                ) : null;
              })()}

              {/* Drain rate */}
              <Text
                style={{
                  color: "#a0aec0",
                  fontSize: 13,
                  marginTop: 20,
                  marginBottom: 8,
                }}
              >
                Drain Rate (aura per minute)
              </Text>
              <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                {[0.5, 1, 1.5, 2, 3].map((rate) => (
                  <TouchableOpacity
                    key={rate}
                    onPress={() =>
                      handleUpdateDrainRate(settingsApp.packageName, rate)
                    }
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 8,
                      backgroundColor:
                        settingsApp.drainRate === rate ? "#6C63FF" : "#0f0f23",
                      borderWidth: 1,
                      borderColor:
                        settingsApp.drainRate === rate ? "#6C63FF" : "#2d3748",
                    }}
                  >
                    <Text style={{ color: "#fff", fontSize: 14 }}>{rate}x</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Lock toggle */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 20,
                  backgroundColor: "#0f0f23",
                  padding: 14,
                  borderRadius: 10,
                }}
              >
                <View>
                  <Text style={{ color: "#fff", fontWeight: "600" }}>
                    {settingsApp.isLocked
                      ? "\uD83D\uDD12 Locked"
                      : "\uD83D\uDD13 Unlocked"}
                  </Text>
                  <Text style={{ color: "#718096", fontSize: 11, marginTop: 2 }}>
                    {settingsApp.isLocked
                      ? "Native overlay blocks this app"
                      : "App is allowed"}
                  </Text>
                </View>
                <Switch
                  value={settingsApp.isLocked}
                  onValueChange={() =>
                    handleToggleLock(settingsApp.packageName)
                  }
                  trackColor={{ false: "#2d3748", true: "#6b21a8" }}
                  thumbColor="#fff"
                />
              </View>

              {/* Remove */}
              <TouchableOpacity
                onPress={() => handleRemoveApp(settingsApp.packageName)}
                style={{
                  backgroundColor: "#1a0a0a",
                  padding: 12,
                  borderRadius: 10,
                  alignItems: "center",
                  marginTop: 16,
                  borderWidth: 1,
                  borderColor: "#3b1010",
                }}
              >
                <Text style={{ color: "#e94560", fontWeight: "bold" }}>
                  Remove App
                </Text>
              </TouchableOpacity>

              {/* Close */}
              <TouchableOpacity
                onPress={() => setSettingsApp(null)}
                style={{ alignItems: "center", marginTop: 14 }}
              >
                <Text style={{ color: "#718096" }}>Close</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════════
          MODAL: Aura Depleted
          ════════════════════════════════════════════════════════════════════ */}
      <Modal visible={showAppLock} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.9)",
            justifyContent: "center",
            alignItems: "center",
            padding: 32,
          }}
        >
          <Text style={{ fontSize: 56 }}>{"\uD83D\uDD12"}</Text>
          <Text
            style={{
              fontSize: 26,
              fontWeight: "bold",
              color: "#e94560",
              marginTop: 16,
              textAlign: "center",
            }}
          >
            Aura Depleted!
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: "#a0aec0",
              textAlign: "center",
              marginTop: 10,
              lineHeight: 22,
            }}
          >
            Your Aura balance has reached zero.{"\n"}Complete learning modules
            to earn more!
          </Text>
          <TouchableOpacity
            onPress={() => {
              setShowAppLock(false);
              router.push("/(student)/learning");
            }}
            style={{
              backgroundColor: "#6C63FF",
              padding: 16,
              borderRadius: 12,
              alignItems: "center",
              marginTop: 20,
              width: "100%",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 17, fontWeight: "bold" }}>
              Go to Learning Hub
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowAppLock(false)}
            style={{ marginTop: 14 }}
          >
            <Text style={{ color: "#718096", fontSize: 14 }}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}
