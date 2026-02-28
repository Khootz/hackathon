/**
 * AWS Bedrock AgentCore integration for suspicious-app analysis.
 *
 * Calls the Bedrock Agent Runtime `InvokeAgent` API.
 * The agent is pre-configured in AWS with the child-safety system prompt
 * and returns a JSON DetectionResult.
 *
 * Falls back to Bedrock Converse (Nova Lite) if AgentCore is unavailable.
 */

import { bedrockConverse } from "./bedrock";
import { signRequest } from "./awsSigner";

// ── Env ──────────────────────────────────────────────────────────────────────

const AWS_REGION = process.env.EXPO_PUBLIC_AWS_REGION ?? "us-east-1";
const AGENT_ID = process.env.EXPO_PUBLIC_BEDROCK_AGENT_ID ?? "";
const AGENT_ALIAS_ID = process.env.EXPO_PUBLIC_BEDROCK_AGENT_ALIAS_ID ?? "";

// ── AgentCore InvokeAgent ────────────────────────────────────────────────────

interface AgentCoreResponse {
  completion: string;
}

/**
 * Invoke a Bedrock Agent to analyse a suspicious-app context.
 *
 * @param inputText  The user message describing the app context
 * @param sessionId  Unique session (e.g. `childId-timestamp`)
 */
export async function invokeAgent(
  inputText: string,
  sessionId: string
): Promise<string> {
  // If agent is not configured, fall back to Bedrock Converse
  if (!AGENT_ID || !AGENT_ALIAS_ID) {
    console.warn(
      "[AgentCore] AGENT_ID/AGENT_ALIAS_ID not set — falling back to Bedrock Converse"
    );
    return bedrockFallback(inputText);
  }

  const endpoint =
    `https://bedrock-agent-runtime.${AWS_REGION}.amazonaws.com` +
    `/agents/${AGENT_ID}/agentAliases/${AGENT_ALIAS_ID}/sessions/${sessionId}/text`;

  const body = JSON.stringify({ inputText });

  const baseHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const signedHeaders = signRequest(
    "POST",
    endpoint,
    baseHeaders,
    body,
    "bedrock"
  );

  const response = await fetch(endpoint, {
    method: "POST",
    headers: signedHeaders,
    body,
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("[AgentCore] Error response:", errText);
    // Fall back to Bedrock Converse on AgentCore failure
    console.warn("[AgentCore] Falling back to Bedrock Converse");
    return bedrockFallback(inputText);
  }

  const data = await response.json();

  // AgentCore response structure: { completion: "..." }
  return data.completion ?? data.output?.text ?? JSON.stringify(data);
}

// ── Fallback: use Bedrock Converse directly ──────────────────────────────────

const CHILD_SAFETY_SYSTEM_PROMPT = `You are a child safety AI for AuraMax, a parental control app protecting children aged 10-16.
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

async function bedrockFallback(inputText: string): Promise<string> {
  return bedrockConverse([
    { role: "system", content: CHILD_SAFETY_SYSTEM_PROMPT },
    { role: "user", content: inputText },
  ]);
}
