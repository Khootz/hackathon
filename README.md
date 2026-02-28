# AuraMax

A gamified parental control app that turns screen time into a teachable moment. Children earn and manage **Aura** — a virtual currency that drains with app usage and grows through learning. Parents get real-time visibility and AI-powered suspicious activity detection.

Built with **Expo / React Native** (Android) and **AWS Bedrock** for AI.

---

## Architecture

```
app/                    Expo Router screens
  (auth)/               Login, Signup, Parent-child linking
  (student)/            Dashboard, Learning Hub, Settings
  (parent)/             Dashboard, Monitor, Controls, Notifications

lib/
  awsSigner.ts          AWS SigV4 request signing (crypto-js, Hermes-compatible)
  bedrock.ts            Bedrock Converse API — quiz generation (Amazon Nova Lite)
  bedrockAgentCore.ts   Bedrock Agent Runtime — suspicious activity analysis
  supabase.ts           Supabase client
  suspiciousActivity.ts Two-tier app detection (local registry + AI)
  openclaw.ts           WhatsApp alerting via OpenClaw
  elevenlabs.ts         TTS integration (unused)

store/                  Zustand state management
  authStore.ts          Auth, session, role routing
  auraStore.ts          Balance, invest, drain, compound interest, transactions
  familyStore.ts        Parent-child linking, invite codes, realtime sync
  learningStore.ts      AI quiz generation, completion tracking, aura rewards
  screenTimeStore.ts    App session tracking, usage logging
  alertStore.ts         Security alerts, severity filtering
  suspiciousActivityStore.ts  Detection pipeline runtime

constants/              Risk registry, app categories
modules/usage-stats/    Native module for foreground app detection
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 55 / React Native 0.83 |
| Navigation | Expo Router (file-based) |
| State | Zustand 5 |
| Backend | Supabase (Auth, Postgres, Realtime, RLS) |
| AI — Quiz Generation | AWS Bedrock Converse API — **Amazon Nova 2 Lite** (`amazon.nova-2- lite-v1:0`) |
| AI — Suspicious Activity | AWS Bedrock Agent Runtime (with Converse fallback) |
| Styling | NativeWind (Tailwind CSS) |
| Crypto | crypto-js (SigV4 signing, Hermes-compatible) |
| Messaging | OpenClaw (WhatsApp alerts) |

## AI Integration

### Quiz Generation (Bedrock Converse)

The Learning Hub generates personalized quizzes using **Amazon Nova Lite** via the Bedrock Converse API. Quizzes are tailored to the child's age, subject, and personal interests.

**Flow:** `learning.tsx` → `learningStore.generateModule()` → `bedrock.generateQuiz()` → Bedrock Converse API → parsed JSON quiz

### Suspicious Activity Detection (Bedrock Agent / Converse)

A two-tier detection pipeline identifies harmful apps:

1. **Tier 1 — Local pattern matching** (`matchRiskRegistry`): Instant, offline check against a curated risk registry of known dangerous app patterns (adult content, dating, gambling, anonymous browsing, etc.)

2. **Tier 2 — AI analysis** (`analyzeSuspiciousApp`): Sends app context (name, package, category, time-of-day, session length, child age, prior flags) to a Bedrock Agent for nuanced evaluation. Returns a structured JSON verdict with confidence score, severity, reasoning, and recommended action.

**Fallback chain:** Bedrock Agent Runtime → Bedrock Converse (Nova Lite) → hardcoded fail-safe (`suspicious: true, confidence: 0.7`)

### AWS SigV4 Signing

All AWS API calls are signed using a custom SigV4 implementation built on `crypto-js` — no AWS SDK required. This keeps the bundle small and works natively in React Native's Hermes engine (which lacks `crypto.subtle`).

## Environment Variables

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=

# AWS Bedrock
EXPO_PUBLIC_AWS_ACCESS_KEY_ID=
EXPO_PUBLIC_AWS_SECRET_ACCESS_KEY=
EXPO_PUBLIC_AWS_REGION=us-east-1

# Bedrock Agent (optional — falls back to Converse if unset)
EXPO_PUBLIC_BEDROCK_AGENT_ID=
EXPO_PUBLIC_BEDROCK_AGENT_ALIAS_ID=

# OpenClaw (WhatsApp alerts)
EXPO_PUBLIC_OPENCLAW_API_KEY=
EXPO_PUBLIC_OPENCLAW_PHONE_ID=

# ElevenLabs (TTS — unused)
EXPO_PUBLIC_ELEVENLABS_API_KEY=
```

## Setup

```bash
# Install dependencies
npm install

# Run on Android (emulator or device)
npx expo run:android
```

Requires:
- Node.js 18+
- Android SDK with an emulator or connected device
- JDK 17 (`JAVA_HOME` set)
- AWS IAM user with `bedrock:InvokeModel` and `bedrock:Converse` permissions
- Amazon Nova Lite model access enabled in AWS Bedrock console (us-east-1)

## Database

Full schema in `supabase-schema.sql`. Key tables:

- **profiles** — user role (parent/student), age, display name
- **family_links** — invite-code-based parent↔child linking
- **aura_balance** — current balance + compound interest tracking
- **aura_transactions** — full ledger (earn, drain, invest, withdraw, compound)
- **activity_logs** — per-app screen time sessions
- **learning_modules** — AI-generated quiz data (JSONB)
- **app_controls** — parent-configured drain rates per app
- **security_alerts** — flagged activity with severity + AI reasoning

All tables have Row-Level Security (RLS) policies enforcing data isolation between families.
