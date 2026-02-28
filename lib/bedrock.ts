/**
 * AWS Bedrock integration for AuraMax.
 *
 * Uses the Bedrock **Runtime** Converse API with IAM access-key auth (SigV4).
 * Works in React Native / Hermes via `crypto-js` (pure JS).
 *
 * Model: Amazon Nova Lite  (amazon.nova-lite-v1:0)
 */

import { signRequest } from "./awsSigner";

// ── Env ──────────────────────────────────────────────────────────────────────

const AWS_REGION = process.env.EXPO_PUBLIC_AWS_REGION ?? "us-east-1";

const BEDROCK_MODEL_ID = "amazon.nova-lite-v1:0";

// ── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

// ── Bedrock Converse API ─────────────────────────────────────────────────────

export async function bedrockConverse(
  messages: Message[],
  modelId: string = BEDROCK_MODEL_ID
): Promise<string> {
  const endpoint = `https://bedrock-runtime.${AWS_REGION}.amazonaws.com/model/${modelId}/converse`;

  // Separate system prompt from conversation messages
  const systemMessages = messages.filter((m) => m.role === "system");
  const conversationMessages = messages.filter((m) => m.role !== "system");

  const requestBody: Record<string, any> = {
    modelId,
    messages: conversationMessages.map((m) => ({
      role: m.role,
      content: [{ text: m.content }],
    })),
    inferenceConfig: {
      maxTokens: 2048,
      temperature: 0.7,
    },
  };

  // Add system prompt if present
  if (systemMessages.length > 0) {
    requestBody.system = systemMessages.map((m) => ({ text: m.content }));
  }

  const body = JSON.stringify(requestBody);

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
    console.error("[Bedrock] Error response:", errText);
    throw new Error(`Bedrock error: ${response.status} — ${errText}`);
  }

  const data = await response.json();

  // Converse API response structure
  const outputMessage = data.output?.message;
  if (!outputMessage?.content?.[0]?.text) {
    throw new Error("Bedrock: unexpected response structure");
  }

  return outputMessage.content[0].text;
}

// ── Quiz generation (replaces openrouter.generateQuiz) ───────────────────────

export async function generateQuiz(
  subject: string,
  interest: string,
  age: number = 13
) {
  const prompt = `Generate a fun, engaging ${subject} quiz for a ${age}-year-old who loves ${interest}. 
Use metaphors and scenarios from ${interest}. Return JSON only (no markdown): {title: string, questions: [{q: string, options: string[], answer: number, explanation: string}]}`;

  const response = await bedrockConverse([
    {
      role: "system",
      content:
        "You are an educational content creator. Always respond with valid JSON only, no markdown formatting.",
    },
    { role: "user", content: prompt },
  ]);

  // Strip any accidental markdown fences
  const cleaned = response
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  return JSON.parse(cleaned);
}
