import { create } from "zustand";
import { supabase } from "../lib/supabase";

/** App entry configured by a parent for a specific child */
export interface AppControl {
  id: string;
  app_name: string;
  drain_rate: number;
  is_monitored: boolean;
  is_locked: boolean;
  daily_limit_minutes: number | null;
}

export interface AppUsage {
  app_name: string;
  duration_minutes: number;
  aura_drained: number;
  drain_rate: number;
}

interface ScreenTimeState {
  // Active session
  activeApp: string | null;
  sessionStart: number | null;
  /** Timestamp when the app went to background with an active session */
  backgroundAt: number | null;
  isTracking: boolean;

  // Usage data
  todayUsage: AppUsage[];
  totalMinutesToday: number;

  // App list fetched from Supabase (parent-configured for this child)
  appControls: AppControl[];

  // ---- Actions ----
  startSession: (appName: string) => void;
  stopSession: (userId: string) => Promise<void>;
  fetchTodayUsage: (userId: string) => Promise<void>;
  logUsage: (
    userId: string,
    appName: string,
    minutes: number,
    auraDrained: number
  ) => Promise<void>;
  fetchChildActivity: (childId: string) => Promise<AppUsage[]>;

  /** Fetch parent-configured app controls for this child */
  fetchAppControls: (userId: string) => Promise<void>;

  /** Call when AppState changes to 'background' while a session is active */
  markBackgrounded: () => void;

  /**
   * Call when AppState returns to 'active'. Returns elapsed minutes in background.
   * Caller is responsible for draining aura based on returned minutes + drain rate.
   */
  consumeBackgroundTime: () => number;
}

// ---- Aggregation helper ----
function aggregateUsage(rows: any[]): AppUsage[] {
  const map: Record<string, AppUsage> = {};
  for (const log of rows) {
    if (!map[log.app_name]) {
      map[log.app_name] = {
        app_name: log.app_name,
        duration_minutes: 0,
        aura_drained: 0,
        drain_rate: 1,
      };
    }
    map[log.app_name].duration_minutes += log.duration_minutes;
    map[log.app_name].aura_drained += log.aura_drained;
  }
  return Object.values(map);
}

export const useScreenTimeStore = create<ScreenTimeState>((set, get) => ({
  activeApp: null,
  sessionStart: null,
  backgroundAt: null,
  isTracking: false,
  todayUsage: [],
  totalMinutesToday: 0,
  appControls: [],

  startSession: (appName: string) => {
    set({
      activeApp: appName,
      sessionStart: Date.now(),
      isTracking: true,
      backgroundAt: null,
    });
  },

  stopSession: async (userId: string) => {
    const { activeApp, sessionStart } = get();
    if (!activeApp || !sessionStart) return;
    set({ activeApp: null, sessionStart: null, isTracking: false, backgroundAt: null });
  },

  fetchTodayUsage: async (userId: string) => {
    const today = new Date().toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("session_date", today);

    if (error) {
      console.error("Error fetching usage:", error);
      return;
    }

    const usage = aggregateUsage(data ?? []);
    const total = usage.reduce((sum, u) => sum + u.duration_minutes, 0);
    set({ todayUsage: usage, totalMinutesToday: total });
  },

  logUsage: async (userId, appName, minutes, auraDrained) => {
    const today = new Date().toISOString().split("T")[0];
    await supabase.from("activity_logs").insert({
      user_id: userId,
      app_name: appName,
      duration_minutes: Math.round(minutes * 100) / 100,
      aura_drained: Math.round(auraDrained * 100) / 100,
      session_date: today,
    });
    await get().fetchTodayUsage(userId);
  },

  fetchChildActivity: async (childId: string) => {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("activity_logs")
      .select("*")
      .eq("user_id", childId)
      .eq("session_date", today);
    return aggregateUsage(data ?? []);
  },

  fetchAppControls: async (userId: string) => {
    const { data, error } = await supabase
      .from("app_controls")
      .select("id, app_name, drain_rate, is_monitored, is_locked, daily_limit_minutes")
      .eq("child_id", userId)
      .eq("is_monitored", true);

    if (error) {
      console.error("fetchAppControls error:", error);
      return;
    }
    set({ appControls: data ?? [] });
  },

  markBackgrounded: () => {
    if (get().isTracking) {
      set({ backgroundAt: Date.now() });
    }
  },

  consumeBackgroundTime: () => {
    const { backgroundAt } = get();
    if (!backgroundAt) return 0;
    const elapsed = (Date.now() - backgroundAt) / 60000; // minutes
    set({ backgroundAt: null });
    return elapsed;
  },
}));
