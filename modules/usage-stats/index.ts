import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

// UsageStats is an Android-only native module. On iOS, use no-op stubs.
const UsageStatsModule = Platform.OS === 'android'
  ? requireNativeModule('UsageStats')
  : {
      isUsageAccessGranted: () => false,
      requestUsageAccess: () => {},
      canDrawOverlays: () => false,
      requestOverlayPermission: () => {},
      getInstalledApps: async () => [],
      getTodayUsage: async () => [],
      getUsageStats: async () => [],
      getForegroundApp: async () => null,
      startLockService: () => {},
      updateLockedApps: () => {},
      stopLockService: () => {},
    };

// ── Types ────────────────────────────────────────────────────────────

export interface AppInfo {
  packageName: string;
  appName: string;
}

export interface UsageStat {
  packageName: string;
  appName: string;
  totalTimeInForeground: number; // milliseconds
  lastTimeUsed: number;
}

export interface TodayUsage {
  packageName: string;
  appName: string;
  totalMinutes: number;
  lastTimeUsed: number;
}

export interface ForegroundApp {
  packageName: string;
  appName: string;
}

// ── Permission helpers ───────────────────────────────────────────────

/** Check if usage-data access has been granted. */
export function isUsageAccessGranted(): boolean {
  return UsageStatsModule.isUsageAccessGranted();
}

/** Open the system settings page where the user grants usage access. */
export function requestUsageAccess(): void {
  UsageStatsModule.requestUsageAccess();
}

/** Check if "Draw over other apps" permission is granted. */
export function canDrawOverlays(): boolean {
  return UsageStatsModule.canDrawOverlays();
}

/** Open the system settings page for overlay permission. */
export function requestOverlayPermission(): void {
  UsageStatsModule.requestOverlayPermission();
}

// ── App / usage queries ──────────────────────────────────────────────

/** Return every non-system, launchable app installed on the device. */
export async function getInstalledApps(): Promise<AppInfo[]> {
  return UsageStatsModule.getInstalledApps();
}

/** Today's usage (apps with ≥ 1 min foreground time), sorted desc. */
export async function getTodayUsage(): Promise<TodayUsage[]> {
  return UsageStatsModule.getTodayUsage();
}

/** Usage stats for an arbitrary time window (ms epoch). */
export async function getUsageStats(
  startTime: number,
  endTime: number,
): Promise<UsageStat[]> {
  return UsageStatsModule.getUsageStats(startTime, endTime);
}

/** Which app is currently in the foreground? */
export async function getForegroundApp(): Promise<ForegroundApp | null> {
  return UsageStatsModule.getForegroundApp();
}

// ── Lock service ─────────────────────────────────────────────────────

/**
 * Start the foreground service that monitors the foreground app and
 * shows a full-screen overlay when a locked app is detected.
 * @param lockedPackages JSON-encoded array of package-name strings.
 */
export function startLockService(lockedPackages: string[]): void {
  UsageStatsModule.startLockService(JSON.stringify(lockedPackages));
}

/** Update the locked-app list in the running service. */
export function updateLockedApps(lockedPackages: string[]): void {
  UsageStatsModule.updateLockedApps(JSON.stringify(lockedPackages));
}

/** Stop the lock-monitoring service. */
export function stopLockService(): void {
  UsageStatsModule.stopLockService();
}
