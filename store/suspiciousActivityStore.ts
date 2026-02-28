import { create } from "zustand";
import { Platform } from "react-native";
import * as UsageStats from "../modules/usage-stats";
import {
  matchRiskRegistry,
  analyzeSuspiciousApp,
  DetectionResult,
} from "../lib/suspiciousActivity";
import { AuraRules, DetectionConfig } from "../constants";
import { useAlertStore } from "./alertStore";
import { useAuraStore } from "./auraStore";
import { sendWhatsAppAlert } from "../lib/openclaw";
import { supabase } from "../lib/supabase";

// ── Types ────────────────────────────────────────────────────────────────────

export interface PendingAlert {
  appName: string;
  severity: "minor" | "critical";
  reasoning: string;
  auraDeducted: boolean;
}

export interface DetectionLog {
  id: string;
  timestamp: number;
  appName: string;
  packageName: string;
  tier1Category: string | null;
  tier2Result: DetectionResult | null;
  action: string;
  error?: string;
}

interface SuspiciousActivityState {
  // Controls
  isEnabled: boolean;
  devMode: boolean;

  // Runtime
  isDetecting: boolean;
  lastCheckedApp: string | null;
  lastCheckedAt: number;
  flagCountToday: number;

  // Alert UI
  pendingAlert: PendingAlert | null;

  // Cooldowns & tracking
  cooldowns: Record<string, number>;     // packageName → last alert timestamp
  sessionStarts: Record<string, number>; // packageName → first-seen timestamp

  // Dev logs (last 50)
  detectionLogs: DetectionLog[];

  // Actions
  setEnabled: (v: boolean) => void;
  setDevMode: (v: boolean) => void;
  dismissPendingAlert: () => void;
  clearLogs: () => void;
  startDetection: (childId: string, parentId: string | null, childAge: number) => void;
  stopDetection: () => void;
  simulateDetection: (
    appName: string,
    packageName: string,
    childAge: number,
    childId: string,
    parentId: string | null
  ) => Promise<void>;
}

// Module-level interval handle so we never double-start
let _intervalId: ReturnType<typeof setInterval> | null = null;
let _genId = 0;
const genId = () => `log_${Date.now()}_${_genId++}`;

const timeStr = () => {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

async function fetchParentPhone(parentId: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from("profiles")
      .select("phone")
      .eq("id", parentId)
      .maybeSingle();
    return (data as any)?.phone ?? null;
  } catch {
    return null;
  }
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useSuspiciousActivityStore = create<SuspiciousActivityState>(
  (set, get) => ({
    isEnabled: false,
    devMode: false,
    isDetecting: false,
    lastCheckedApp: null,
    lastCheckedAt: 0,
    flagCountToday: 0,
    pendingAlert: null,
    cooldowns: {},
    sessionStarts: {},
    detectionLogs: [],

    setEnabled: (v) => {
      set({ isEnabled: v });
      if (!v) get().stopDetection();
    },
    setDevMode: (v) => set({ devMode: v }),
    dismissPendingAlert: () => set({ pendingAlert: null }),
    clearLogs: () => set({ detectionLogs: [] }),

    // ── addLog helper (not exported, used internally) ───────────────────────
    // We'll define it inline since zustand actions can only call set/get

    startDetection: (
      childId: string,
      parentId: string | null,
      childAge: number
    ) => {
      if (Platform.OS !== "android") return;
      if (_intervalId !== null) return;
      if (!get().isEnabled) return;

      console.log("[AuraMax] ▶ Detection started");
      set({ isDetecting: true });

      const addLog = (log: Omit<DetectionLog, "id" | "timestamp">) => {
        const entry: DetectionLog = { ...log, id: genId(), timestamp: Date.now() };
        set((s) => ({
          detectionLogs: [entry, ...s.detectionLogs].slice(0, 50),
        }));
      };

      _intervalId = setInterval(async () => {
        if (!get().isEnabled) {
          get().stopDetection();
          return;
        }

        if (get().flagCountToday >= DetectionConfig.MAX_FLAGS_PER_DAY) {
          addLog({ appName: "-", packageName: "-", tier1Category: null, tier2Result: null, action: "⏸ Max daily flags reached" });
          return;
        }

        // ── Step 1: Get foreground app ──────────────────────────────────────
        let pkg = "";
        let appName = "";
        try {
          const fg = await UsageStats.getForegroundApp();
          if (!fg?.packageName) return;
          pkg = fg.packageName;
          appName = fg.appName ?? pkg;
        } catch (e: any) {
          addLog({ appName: "-", packageName: "-", tier1Category: null, tier2Result: null, action: "❌ getForegroundApp failed", error: e?.message });
          return;
        }

        // Skip our own app
        if (pkg.includes("auramax")) return;

        // Skip duplicate check within SAME_APP_SKIP_MS
        const now = Date.now();
        const { lastCheckedApp, lastCheckedAt } = get();
        if (lastCheckedApp === pkg && now - lastCheckedAt < DetectionConfig.SAME_APP_SKIP_MS) return;

        set({ lastCheckedApp: pkg, lastCheckedAt: now });

        // ── Step 2: Tier 1 — registry match ─────────────────────────────────
        const match = matchRiskRegistry(pkg, appName);
        if (!match) {
          addLog({ appName, packageName: pkg, tier1Category: null, tier2Result: null, action: "✅ Safe — no registry match" });
          return;
        }

        // ── Step 3: Cooldown check ──────────────────────────────────────────
        const lastAlertTime = get().cooldowns[pkg] ?? 0;
        if (now - lastAlertTime < DetectionConfig.ALERT_COOLDOWN_MS) {
          const minLeft = Math.round((DetectionConfig.ALERT_COOLDOWN_MS - (now - lastAlertTime)) / 60000);
          addLog({ appName, packageName: pkg, tier1Category: match.category, tier2Result: null, action: `⏳ Cooldown — ${minLeft}min left` });
          return;
        }

        // ── Step 4: Track session start ─────────────────────────────────────
        const sessions = get().sessionStarts;
        if (!sessions[pkg]) {
          set((s) => ({ sessionStarts: { ...s.sessionStarts, [pkg]: now } }));
        }
        const sessionMin = Math.floor((now - (sessions[pkg] || now)) / 60000);

        // Check minimum time before flagging
        if (sessionMin < match.minMinutes) {
          addLog({ appName, packageName: pkg, tier1Category: match.category, tier2Result: null, action: `⏱ Waiting ${sessionMin}/${match.minMinutes}min` });
          return;
        }

        // ── Step 5: Tier 2 — LLM analysis ───────────────────────────────────
        addLog({ appName, packageName: pkg, tier1Category: match.category, tier2Result: null, action: "🤖 Calling LLM..." });

        const prevFlags = get().flagCountToday;
        let result: DetectionResult;
        try {
          result = await analyzeSuspiciousApp({
            appName,
            packageName: pkg,
            category: match.category,
            description: match.description,
            timeOfDay: timeStr(),
            sessionMinutes: sessionMin,
            childAge,
            previousFlagsToday: prevFlags,
          });
        } catch (e: any) {
          addLog({ appName, packageName: pkg, tier1Category: match.category, tier2Result: null, action: "❌ LLM call failed", error: e?.message });
          return;
        }

        // ── Step 6: Confidence threshold check ──────────────────────────────
        if (!result.suspicious || result.confidence < DetectionConfig.CONFIDENCE_THRESHOLD) {
          addLog({ appName, packageName: pkg, tier1Category: match.category, tier2Result: result, action: `✅ Cleared — confidence ${(result.confidence * 100).toFixed(0)}% < ${(DetectionConfig.CONFIDENCE_THRESHOLD * 100).toFixed(0)}%` });
          return;
        }

        // ── Step 7: FLAGGED ─────────────────────────────────────────────────
        const isCritical = result.severity === "critical";
        addLog({
          appName, packageName: pkg, tier1Category: match.category, tier2Result: result,
          action: `🚨 FLAGGED [${result.severity.toUpperCase()}] confidence=${(result.confidence * 100).toFixed(0)}%${isCritical ? " | −50 Aura" : ""}`,
        });

        set((s) => ({
          cooldowns: { ...s.cooldowns, [pkg]: now },
          flagCountToday: s.flagCountToday + 1,
          pendingAlert: {
            appName,
            severity: result.severity,
            reasoning: result.reasoning,
            auraDeducted: isCritical,
          },
        }));

        // Log alert to Supabase
        try {
          await useAlertStore
            .getState()
            .createAlert(childId, parentId ?? childId, result.severity, result.reasoning, appName);
        } catch (e) {
          console.error("[AuraMax] Alert insert failed:", e);
        }

        // Critical path: aura penalty + WhatsApp
        if (isCritical) {
          try {
            await useAuraStore
              .getState()
              .drainAura(childId, Math.abs(AuraRules.SUSPICIOUS_ACTIVITY_PENALTY), `Suspicious activity: ${appName}`);
          } catch (e) {
            console.error("[AuraMax] Aura drain failed:", e);
          }

          if (parentId) {
            try {
              const phone = await fetchParentPhone(parentId);
              if (phone) {
                const waMsg =
                  `🚨 AuraMax Alert\n` +
                  `Your child opened ${appName} (${match.category}).\n` +
                  `${result.reasoning}\n` +
                  `−${Math.abs(AuraRules.SUSPICIOUS_ACTIVITY_PENALTY)} Aura deducted.`;
                const sent = await sendWhatsAppAlert(phone, waMsg);
                if (sent) {
                  const latest = useAlertStore.getState().alerts[0];
                  if (latest) {
                    await supabase.from("security_alerts").update({ sent_whatsapp: true }).eq("id", latest.id);
                  }
                }
              }
            } catch (e) {
              console.log("[AuraMax] WhatsApp skipped:", e);
            }
          }
        }
      }, DetectionConfig.INTERVAL_MS);
    },

    stopDetection: () => {
      if (_intervalId !== null) {
        clearInterval(_intervalId);
        _intervalId = null;
      }
      set({ isDetecting: false });
      console.log("[AuraMax] ⏹ Detection stopped");
    },

    // ── Simulate: runs Tier 1 + Tier 2 without needing an actual foreground app ──
    simulateDetection: async (
      appName: string,
      packageName: string,
      childAge: number,
      childId: string,
      parentId: string | null
    ) => {
      const addLog = (log: Omit<DetectionLog, "id" | "timestamp">) => {
        const entry: DetectionLog = { ...log, id: genId(), timestamp: Date.now() };
        set((s) => ({
          detectionLogs: [entry, ...s.detectionLogs].slice(0, 50),
        }));
      };

      addLog({ appName, packageName, tier1Category: null, tier2Result: null, action: "🧪 SIMULATE — Starting test..." });

      // Tier 1
      const match = matchRiskRegistry(packageName, appName);
      if (!match) {
        addLog({ appName, packageName, tier1Category: null, tier2Result: null, action: "🧪 RESULT: No registry match — app is SAFE" });
        return;
      }

      addLog({ appName, packageName, tier1Category: match.category, tier2Result: null, action: `🧪 Tier 1 HIT: ${match.category} (base: ${match.baseSeverity})` });

      // Tier 2
      addLog({ appName, packageName, tier1Category: match.category, tier2Result: null, action: "🧪 Calling LLM for Tier 2 analysis..." });

      try {
        const result = await analyzeSuspiciousApp({
          appName,
          packageName,
          category: match.category,
          description: match.description,
          timeOfDay: timeStr(),
          sessionMinutes: 10, // simulate 10 min session
          childAge,
          previousFlagsToday: get().flagCountToday,
        });

        const wouldFlag = result.suspicious && result.confidence >= DetectionConfig.CONFIDENCE_THRESHOLD;

        addLog({
          appName, packageName, tier1Category: match.category, tier2Result: result,
          action: wouldFlag
            ? `🧪 🚨 WOULD FLAG [${result.severity.toUpperCase()}] — confidence=${(result.confidence * 100).toFixed(0)}%, action=${result.trigger_action}`
            : `🧪 ✅ WOULD CLEAR — confidence=${(result.confidence * 100).toFixed(0)}% (need ≥${(DetectionConfig.CONFIDENCE_THRESHOLD * 100).toFixed(0)}%)`,
        });

        // Show banner preview for flagged simulations
        if (wouldFlag) {
          set({
            pendingAlert: {
              appName,
              severity: result.severity,
              reasoning: result.reasoning,
              auraDeducted: result.severity === "critical",
            },
          });
        }
      } catch (e: any) {
        addLog({ appName, packageName, tier1Category: match.category, tier2Result: null, action: "🧪 ❌ Tier 2 failed", error: e?.message });
      }
    },
  })
);
