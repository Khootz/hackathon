import { useEffect, useState, useCallback, useRef } from "react";
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
  Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import Svg, { Path, Rect, Circle, Line, Polyline } from "react-native-svg";
import { useAuthStore } from "../../store/authStore";
import { useAuraStore } from "../../store/auraStore";
import * as UsageStats from "../../modules/usage-stats";
import { Colors, Fonts, Radii, Shadows } from "../../constants";

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

// ── SVG Icons ────────────────────────────────────────────────────────────────

const UnlockIcon = ({ size = 24, color = Colors.primary }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="11" width="18" height="11" rx="2" stroke={color} strokeWidth={2} />
    <Path d="M7 11V7a5 5 0 0 1 9.9-1" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const LockIcon = ({ size = 24, color = Colors.error }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="11" width="18" height="11" rx="2" stroke={color} strokeWidth={2} />
    <Path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const SmartphoneIcon = ({ size = 24, color = Colors.text }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="5" y="2" width="14" height="20" rx="2" stroke={color} strokeWidth={2} />
    <Line x1="12" y1="18" x2="12.01" y2="18" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const AlertTriangleIcon = ({ size = 20, color = Colors.warning }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
    <Line x1="12" y1="9" x2="12" y2="13" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Line x1="12" y1="17" x2="12.01" y2="17" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const ShieldIcon = ({ size = 16, color = Colors.primary }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
  </Svg>
);

const PlusIcon = ({ size = 14, color = Colors.textInverse }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Line x1="12" y1="5" x2="12" y2="19" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    <Line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
  </Svg>
);

const XIcon = ({ size = 22, color = Colors.textSecondary }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const ClockIcon = ({ size = 16, color = Colors.textSecondary }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
    <Polyline points="12 6 12 12 16 14" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const TrendDownIcon = ({ size = 16, color = Colors.error }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Polyline points="23 18 13.5 8.5 8.5 13.5 1 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Polyline points="17 18 23 18 23 12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const GridIcon = ({ size = 16, color = Colors.primary }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="7" height="7" stroke={color} strokeWidth={2} rx="1" />
    <Rect x="14" y="3" width="7" height="7" stroke={color} strokeWidth={2} rx="1" />
    <Rect x="14" y="14" width="7" height="7" stroke={color} strokeWidth={2} rx="1" />
    <Rect x="3" y="14" width="7" height="7" stroke={color} strokeWidth={2} rx="1" />
  </Svg>
);

const InfoIcon = ({ size = 14, color = Colors.primary }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
    <Line x1="12" y1="16" x2="12" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Line x1="12" y1="8" x2="12.01" y2="8" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

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

  // ── Animations ───────────────────────────────────────────────────────────
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (!loading && permChecked && hasUsageAccess) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    }
  }, [loading, permChecked, hasUsageAccess]);

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
          backgroundColor: Colors.background,
          justifyContent: "center",
          alignItems: "center",
          padding: 32,
        }}
      >
        <View style={{ backgroundColor: Colors.primaryLight, borderRadius: Radii.full, padding: 20, marginBottom: 16 }}>
          <UnlockIcon size={48} color={Colors.primary} />
        </View>
        <Text
          style={{
            fontSize: 22,
            fontFamily: Fonts.heading,
            color: Colors.text,
            marginTop: 8,
            textAlign: "center",
          }}
        >
          Usage Access Required
        </Text>
        <Text
          style={{
            fontSize: 14,
            fontFamily: Fonts.body,
            color: Colors.textSecondary,
            textAlign: "center",
            marginTop: 10,
            lineHeight: 22,
          }}
        >
          AuraMax needs permission to read app usage so it can automatically track screen time.
        </Text>
        <TouchableOpacity
          onPress={() => UsageStats.requestUsageAccess()}
          style={{
            backgroundColor: Colors.primary,
            padding: 16,
            borderRadius: Radii.md,
            alignItems: "center",
            marginTop: 24,
            width: "100%",
            ...Shadows.sm,
          }}
        >
          <Text style={{ color: Colors.textInverse, fontSize: 16, fontFamily: Fonts.heading }}>
            Grant Usage Access
          </Text>
        </TouchableOpacity>
        <Text
          style={{ color: Colors.textLight, fontFamily: Fonts.body, fontSize: 12, textAlign: "center", marginTop: 12 }}
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
          backgroundColor: Colors.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ color: Colors.textSecondary, fontFamily: Fonts.body, marginTop: 12 }}>Loading real usage data...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.textInverse} />
        }
      >
        {/* Hero Header */}
        <View style={{ backgroundColor: Colors.primary, paddingTop: 56, paddingBottom: 32, paddingHorizontal: 24, borderBottomLeftRadius: Radii.xl, borderBottomRightRadius: Radii.xl, overflow: "hidden" }}>
          <View style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(255,255,255,0.08)" }} />
          <View style={{ position: "absolute", bottom: -20, left: -20, width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.06)" }} />
          <Text style={{ fontSize: 26, fontFamily: Fonts.heading, color: Colors.textInverse }}>
            Hey, {userName}!
          </Text>
          <Text style={{ fontSize: 14, fontFamily: Fonts.body, color: "rgba(255,255,255,0.8)", marginTop: 4 }}>
            {balance > 100
              ? "Your screen time is being tracked automatically."
              : "Aura running low \u2014 time to learn!"}
          </Text>
        </View>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], padding: 20 }}>

        {/* Aura Balance */}
        <View
          style={{
            backgroundColor: Colors.card,
            borderRadius: Radii.xl,
            padding: 20,
            marginTop: 4,
            alignItems: "center",
            ...Shadows.sm,
          }}
        >
          <Text style={{ fontSize: 13, fontFamily: Fonts.body, color: Colors.textSecondary }}>Aura Balance</Text>
          <Text
            style={{
              fontSize: 44,
              fontFamily: Fonts.heading,
              color:
                balance > 100 ? Colors.gold : balance > 0 ? Colors.warning : Colors.error,
              marginTop: 4,
            }}
          >
            {Math.round(balance)}
          </Text>
          <View style={{ flexDirection: "row", gap: 24, marginTop: 6 }}>
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: Colors.textSecondary, fontFamily: Fonts.body, fontSize: 11 }}>Available</Text>
              <Text style={{ color: Colors.success, fontFamily: Fonts.heading }}>
                {Math.round(available)}
              </Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text style={{ color: Colors.textSecondary, fontFamily: Fonts.body, fontSize: 11 }}>Invested</Text>
              <Text style={{ color: Colors.primary, fontFamily: Fonts.heading }}>
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
            backgroundColor: Colors.primaryLight,
            borderRadius: 10,
            padding: 10,
            borderWidth: 1,
            borderColor: Colors.primary,
            alignItems: "center",
          }}
        >
          <Text style={{ color: Colors.primary, fontSize: 11, fontWeight: "bold", marginRight: 4 }}>
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
                backgroundColor: Colors.cardTeal,
                borderRadius: 6,
                paddingVertical: 6,
                alignItems: "center",
              }}
            >
              <Text style={{ color: Colors.text, fontSize: 12, fontWeight: "bold" }}>{btn.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Stats */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
          <View style={{ flex: 1, backgroundColor: Colors.card, borderRadius: Radii.lg, padding: 14, alignItems: "center", ...Shadows.sm }}>
            <ClockIcon size={16} color={Colors.textSecondary} />
            <Text style={{ color: Colors.textSecondary, fontFamily: Fonts.body, fontSize: 11, marginTop: 4 }}>Screen Time</Text>
            <Text style={{ color: Colors.text, fontFamily: Fonts.heading, fontSize: 18, marginTop: 2 }}>{fmt(totalMinutesToday)}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: Colors.card, borderRadius: Radii.lg, padding: 14, alignItems: "center", ...Shadows.sm }}>
            <TrendDownIcon size={16} color={Colors.error} />
            <Text style={{ color: Colors.textSecondary, fontFamily: Fonts.body, fontSize: 11, marginTop: 4 }}>Aura Drained</Text>
            <Text style={{ color: Colors.error, fontFamily: Fonts.heading, fontSize: 18, marginTop: 2 }}>{Math.round(totalDrainedToday)}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: Colors.card, borderRadius: Radii.lg, padding: 14, alignItems: "center", ...Shadows.sm }}>
            <GridIcon size={16} color={Colors.primary} />
            <Text style={{ color: Colors.textSecondary, fontFamily: Fonts.body, fontSize: 11, marginTop: 4 }}>Tracked</Text>
            <Text style={{ color: Colors.primary, fontFamily: Fonts.heading, fontSize: 18, marginTop: 2 }}>{trackedApps.length}</Text>
          </View>
        </View>

        {/* Overlay permission banner */}
        {!hasOverlayPerm && trackedApps.some((a) => a.isLocked) && (
          <TouchableOpacity
            onPress={() => UsageStats.requestOverlayPermission()}
            style={{
              backgroundColor: Colors.warningLight,
              borderRadius: 12,
              padding: 14,
              marginTop: 12,
              borderWidth: 1,
              borderColor: Colors.warning,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <AlertTriangleIcon size={20} color={Colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: Colors.warning, fontWeight: "bold", fontSize: 13 }}>
                Overlay permission needed
              </Text>
              <Text style={{ color: Colors.textSecondary, fontSize: 11, marginTop: 2 }}>
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
          <Text style={{ fontSize: 17, fontFamily: Fonts.heading, color: Colors.text }}>
            Tracked Apps
          </Text>
          <TouchableOpacity
            onPress={() => setShowAddModal(true)}
            style={{
              backgroundColor: Colors.primary,
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: Radii.sm,
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
            }}
          >
            <PlusIcon size={14} color={Colors.textInverse} />
            <Text style={{ color: Colors.textInverse, fontSize: 13, fontFamily: Fonts.heading }}>
              Add App
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={{ color: Colors.textSecondary, fontSize: 12, marginTop: 4, marginBottom: 8 }}>
          Real usage is tracked automatically via Android UsageStats.
        </Text>

        {/* ── Empty state ──────────────────────────────────────────────── */}
        {trackedApps.length === 0 && (
          <TouchableOpacity
            onPress={() => setShowAddModal(true)}
            style={{
              backgroundColor: Colors.card,
              borderRadius: 12,
              padding: 28,
              alignItems: "center",
              borderWidth: 1,
              borderColor: Colors.border,
              borderStyle: "dashed",
            }}
          >
            <SmartphoneIcon size={36} color={Colors.textSecondary} />
            <Text
              style={{
                color: Colors.text,
                fontFamily: Fonts.heading,
                marginTop: 8,
                fontSize: 15,
              }}
            >
              No apps tracked yet
            </Text>
            <Text
              style={{
                color: Colors.textSecondary,
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
                backgroundColor: app.isLocked ? Colors.errorLight : Colors.card,
                borderRadius: 12,
                padding: 14,
                marginBottom: 8,
                flexDirection: "row",
                alignItems: "center",
                borderWidth: 1,
                borderColor: app.isLocked ? Colors.primary : Colors.border,
              }}
            >
              {/* Icon + Info */}
              <View style={{ marginRight: 12 }}>
                {app.isLocked ? <LockIcon size={24} color={Colors.primary} /> : <SmartphoneIcon size={24} color={Colors.text} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: app.isLocked ? Colors.primary : Colors.text,
                    fontSize: 15,
                    fontWeight: "600",
                  }}
                >
                  {app.appName}
                </Text>
                {app.isLocked ? (
                  <Text style={{ color: Colors.primary, fontSize: 11 }}>
                    Locked {"\u00B7"} 3x penalty active
                  </Text>
                ) : (
                  <Text style={{ color: Colors.textSecondary, fontSize: 11 }}>
                    {app.drainRate}x drain
                    {mins > 0 ? ` ${"\u00B7"} ${fmt(mins)} today` : ` ${"\u00B7"} No usage today`}
                  </Text>
                )}
              </View>

              {/* Usage badge */}
              {mins > 0 && (
                <View
                  style={{
                    backgroundColor: app.isLocked ? Colors.primaryLight : Colors.successLight,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 12,
                  }}
                >
                  <Text
                    style={{
                      color: app.isLocked ? Colors.primary : Colors.success,
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
              backgroundColor: Colors.card,
              borderRadius: 12,
              padding: 14,
              marginTop: 12,
              borderWidth: 1,
              borderColor: Colors.borderLight,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <InfoIcon size={14} color={Colors.primary} />
              <Text
                style={{
                  color: Colors.primary,
                  fontFamily: Fonts.heading,
                  fontSize: 13,
                }}
              >
                How it works
              </Text>
            </View>
            <Text style={{ color: Colors.textLight, fontFamily: Fonts.body, fontSize: 12, lineHeight: 18 }}>
              {"\u2022 Usage is tracked automatically by Android\n\u2022 Aura drains based on real screen time\n\u2022 Locked apps trigger a 3x penalty + native block overlay\n\u2022 Pull down to refresh your stats"}
            </Text>
          </View>
        )}

        {/* Lock service toggle */}
        {trackedApps.some((a) => a.isLocked) && hasOverlayPerm && (
          <View
            style={{
              backgroundColor: Colors.card,
              borderRadius: 12,
              padding: 14,
              marginTop: 12,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              borderWidth: 1,
              borderColor: lockServiceRunning ? Colors.success : Colors.border,
            }}
          >
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <ShieldIcon size={16} color={Colors.primary} />
                <Text style={{ color: Colors.text, fontFamily: Fonts.heading, fontSize: 14 }}>
                  App Lock Service
                </Text>
              </View>
              <Text style={{ color: Colors.textSecondary, fontFamily: Fonts.body, fontSize: 11, marginTop: 2 }}>
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
              trackColor={{ false: Colors.border, true: Colors.success }}
              thumbColor={Colors.card}
            />
          </View>
        )}
        </Animated.View>
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
              backgroundColor: Colors.background,
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
                <Text style={{ fontSize: 20, fontWeight: "bold", color: Colors.text }}>
                  Installed Apps
                </Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <XIcon size={22} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text
                style={{ color: Colors.textSecondary, fontSize: 12, marginTop: 4, marginBottom: 12 }}
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
                      backgroundColor: Colors.card,
                      borderRadius: 10,
                      padding: 12,
                      marginBottom: 6,
                      borderWidth: 1,
                      borderColor: Colors.border,
                    }}
                  >
                    <View style={{ marginRight: 12 }}>
                      <SmartphoneIcon size={22} color={Colors.textSecondary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: Colors.text, fontSize: 14 }}>
                        {app.appName}
                      </Text>
                      <Text style={{ color: Colors.textLight, fontSize: 10 }}>
                        {app.packageName}
                      </Text>
                    </View>
                    <Text style={{ color: Colors.primary, fontSize: 22 }}>+</Text>
                  </TouchableOpacity>
                ))}

              {installedApps.filter(
                (a) => !trackedApps.some((t) => t.packageName === a.packageName)
              ).length === 0 && (
                <Text
                  style={{
                    color: Colors.textSecondary,
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
                backgroundColor: Colors.card,
                borderRadius: 20,
                padding: 24,
                width: "100%",
                maxWidth: 360,
              }}
            >
              <View style={{ alignItems: "center" }}>
                {settingsApp.isLocked ? <LockIcon size={32} color={Colors.primary} /> : <SmartphoneIcon size={32} color={Colors.text} />}
              </View>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "bold",
                  color: Colors.text,
                  textAlign: "center",
                  marginTop: 8,
                }}
              >
                {settingsApp.appName}
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  color: Colors.textLight,
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
                      backgroundColor: Colors.successLight,
                      borderRadius: 10,
                      padding: 12,
                      marginTop: 14,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{ color: Colors.success, fontWeight: "bold", fontSize: 18 }}
                    >
                      {fmt(u.totalMinutes)}
                    </Text>
                    <Text style={{ color: Colors.textSecondary, fontSize: 11, marginTop: 2 }}>
                      used today
                    </Text>
                  </View>
                ) : null;
              })()}

              {/* Drain rate */}
              <Text
                style={{
                  color: Colors.textSecondary,
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
                        settingsApp.drainRate === rate ? Colors.primary : Colors.background,
                      borderWidth: 1,
                      borderColor:
                        settingsApp.drainRate === rate ? Colors.primary : Colors.border,
                    }}
                  >
                    <Text style={{ color: Colors.text, fontSize: 14 }}>{rate}x</Text>
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
                  backgroundColor: Colors.background,
                  padding: 14,
                  borderRadius: 10,
                }}
              >
                <View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    {settingsApp.isLocked ? <LockIcon size={16} color={Colors.primary} /> : <UnlockIcon size={16} color={Colors.success} />}
                    <Text style={{ color: Colors.text, fontFamily: Fonts.heading }}>
                      {settingsApp.isLocked ? "Locked" : "Unlocked"}
                    </Text>
                  </View>
                  <Text style={{ color: Colors.textSecondary, fontSize: 11, marginTop: 2 }}>
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
                  trackColor={{ false: Colors.border, true: Colors.primary }}
                  thumbColor={Colors.card}
                />
              </View>

              {/* Remove */}
              <TouchableOpacity
                onPress={() => handleRemoveApp(settingsApp.packageName)}
                style={{
                  backgroundColor: Colors.errorLight,
                  padding: 12,
                  borderRadius: 10,
                  alignItems: "center",
                  marginTop: 16,
                  borderWidth: 1,
                  borderColor: Colors.error + "33",
                }}
              >
                <Text style={{ color: Colors.error, fontWeight: "bold" }}>
                  Remove App
                </Text>
              </TouchableOpacity>

              {/* Close */}
              <TouchableOpacity
                onPress={() => setSettingsApp(null)}
                style={{ alignItems: "center", marginTop: 14 }}
              >
                <Text style={{ color: Colors.textSecondary }}>Close</Text>
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
          <View style={{ backgroundColor: "rgba(255,255,255,0.1)", borderRadius: Radii.full, padding: 20, marginBottom: 8 }}>
            <LockIcon size={48} color={Colors.error} />
          </View>
          <Text
            style={{
              fontSize: 26,
              fontFamily: Fonts.heading,
              color: Colors.error,
              marginTop: 16,
              textAlign: "center",
            }}
          >
            Aura Depleted!
          </Text>
          <Text
            style={{
              fontSize: 15,
              fontFamily: Fonts.body,
              color: Colors.textSecondary,
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
              backgroundColor: Colors.primary,
              padding: 16,
              borderRadius: Radii.md,
              alignItems: "center",
              marginTop: 20,
              width: "100%",
              ...Shadows.sm,
            }}
          >
            <Text style={{ color: Colors.textInverse, fontSize: 17, fontFamily: Fonts.heading }}>
              Go to Learning Hub
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowAppLock(false)}
            style={{ marginTop: 14 }}
          >
            <Text style={{ color: Colors.textSecondary, fontSize: 14 }}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}
