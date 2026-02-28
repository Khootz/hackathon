import { chatCompletion } from "./openrouter";
import { RISK_REGISTRY, RiskEntry } from "../constants";

// ── Types ────────────────────────────────────────────────────────────────────

export interface DetectionContext {
  appName: string;
  packageName: string;
  category: string;
  description: string;
  timeOfDay: string;        // "HH:MM"
  sessionMinutes: number;
  childAge: number;
  previousFlagsToday: number;
}

export interface DetectionResult {
  suspicious: boolean;
  confidence: number;
  severity: "minor" | "critical";
  reasoning: string;
  trigger_action: "notify_child" | "notify_parent" | "lock_app" | "none";
}

// ── Tier 1: Instant pattern matching (no network) ─────────────────────────────

export function matchRiskRegistry(
  packageName: string,
  appName: string
): RiskEntry | null {
  const lowerPkg = packageName.toLowerCase();
  const lowerApp = appName.toLowerCase();

  for (const entry of RISK_REGISTRY) {
    for (const pattern of entry.patterns) {
      if (lowerPkg.includes(pattern) || lowerApp.includes(pattern)) {
        return entry;
      }
    }
  }
  return null;
}

// ── Tier 2: LLM analysis via OpenRouter ──────────────────────────────────────

const SYSTEM_PROMPT = `You are a child safety AI for AuraMax, a parental control app protecting children aged 10-16.
Evaluate whether the given app context is suspicious or harmful for a minor.
Respond ONLY with valid JSON — no markdown, no code fences, no extra text — in exactly this shape:
{
  "suspicious": boolean,
  "confidence": number,
  "severity": "minor" | "critical",
  "reasoning": "brief max 120 char explanation",
  "trigger_action": "notify_child" | "notify_parent" | "lock_app" | "none"
}
Rules:
- confidence is 0.0–1.0
- severity "critical" = immediate danger (adult content, dating, gambling, stranger chat, anonymous browsing)
- severity "minor" = concerning but not immediately dangerous (social media, chat platforms)
- Increase confidence if child is under 13
- Increase confidence if time is late night (22:00 - 06:00)
- Increase confidence if session > 10 minutes on flagged apps
- trigger_action "lock_app" for critically dangerous apps with repeated flags
- trigger_action "notify_parent" for all critical, "notify_child" for minor`;

export async function analyzeSuspiciousApp(
  ctx: DetectionContext
): Promise<DetectionResult> {
  const userMessage =
    `App name: ${ctx.appName}\n` +
    `Package: ${ctx.packageName}\n` +
    `Category: ${ctx.category}\n` +
    `Known risk: ${ctx.description}\n` +
    `Time: ${ctx.timeOfDay}\n` +
    `Session: ${ctx.sessionMinutes} min\n` +
    `Child age: ${ctx.childAge}\n` +
    `Flags today: ${ctx.previousFlagsToday}\n\n` +
    `Is this suspicious for a minor?`;

  try {
    const raw = await chatCompletion(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      "deepseek/deepseek-chat"
    );

    // Strip any accidental markdown fences
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned) as DetectionResult;

    // Validate structure
    if (
      typeof parsed.suspicious !== "boolean" ||
      typeof parsed.confidence !== "number" ||
      !["minor", "critical"].includes(parsed.severity)
    ) {
      throw new Error("Invalid LLM response structure");
    }

    return parsed;
  } catch (err) {
    console.error("[AuraMax] analyzeSuspiciousApp error:", err);
    // Fail-safe: trust the registry match
    return {
      suspicious: true,
      confidence: 0.7,
      severity: "minor",
      reasoning: "AI analysis unavailable; flagged by safety registry",
      trigger_action: "notify_child",
    };
  }
}
