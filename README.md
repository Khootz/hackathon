# AuraMax

A gamified parental control app that turns screen time into a teachable moment. Children earn and manage **Aura**, a virtual currency that drains with app usage and grows through learning. Parents get real-time visibility and AI-powered suspicious activity detection.

Built with **Expo / React Native** (Android), **AWS Bedrock** for AI, **AWS Polly** for text-to-speech, and **Supabase** for backend services.

---

## Project Overview

### Problem Statement

Smartphone usage among children aged 8–16 has reached unprecedented levels. According to recent studies, the average child spends over 4 hours per day on their phone, much of it on social media and entertainment apps. This creates a cascade of interconnected problems:

1. **Parents lack visibility and control.** Traditional parental control apps are binary as they either block apps entirely or allow unrestricted access. Parents have no real-time insight into *what* their child is doing, *how long* they're spending, or *whether* they're accessing age-inappropriate content. The result is either over-restriction (damaging trust) or under-restriction (exposing children to harm).

2. **Children develop unhealthy digital habits.** Excessive, unstructured screen time leads to dopamine-driven feedback loops. Children lose awareness of time passing, struggle to self-regulate, and develop patterns that carry into adulthood. Current solutions (eg: China's 3 hour rule; Australia's social media ban) punish screen time but offer no positive alternative, there's no incentive to *earn* screen time or develop healthier habits.

3. **Passive exposure to harmful content goes undetected.** Children may install or access apps involving gambling, anonymous messaging, dating, adult content, or other age-inappropriate material. Parents typically discover this after the fact, if at all. Existing parental controls rely on static blocklists that can't evaluate the nuance of an app's actual risk given a child's specific age and usage context.

4. **Financial illiteracy starts early.** Children grow up without understanding the value of earning, saving, or investing. Screen time, something they already value deeply, is an untapped opportunity to introduce these concepts in a relatable way, but no existing tool leverages this.

### Solution

AuraMax reimagines parental control as a **positive-sum system** where both parents and children benefit. Instead of punishing screen time, it transforms it into a currency that children actively manage, earning through learning, spending through usage, and growing through smart financial decisions.

The platform is built on four core pillars:

1. **Time Wallet (Aura Points)** — Aura is a screen-time currency. Children start with a balance that *drains* as they use monitored apps (Instagram, TikTok, YouTube, etc.), each with a parent-configurable drain rate. To replenish their balance, children complete AI-generated quizzes in the Learning Hub. If a child accesses inappropriate content, aura penalties are automatically applied. When aura reaches zero, a lock overlay prevents further app usage until more is earned. This creates a self-regulating economy: children learn to budget their time because they *feel* the cost of every minute spent.

2. **Aurafarming (Learning Hub)** — The Learning Hub uses **Amazon Nova 2 Lite** (via AWS Bedrock) to generate personalized 5-question quizzes tailored to the child's age, school subject, and personal interests. A child who loves Clash Royale gets maths word problems set in Clash Royale scenarios. A chess enthusiast gets science questions framed around chess strategy. Each quiz question is read aloud using **AWS Polly TTS** (Matthew neural voice) for accessibility and engagement. Accuracy determines the aura reward: 100% earns a full bonus, while lower scores earn proportionally less. This turns "screen time" from a guilty pleasure into a positive learning loop.

3. **Auramaxxing (Financial Literacy Simulation)** — Children can *invest* their aura points into a simulated savings account that earns compound interest over time. They learn concepts like principal, interest rate, and compounding by watching their aura grow passively. They can also *withdraw* invested aura back to their spendable balance, but learn the trade-off of short-term spending vs. long-term growth. A full transaction ledger tracks every earn, spend, invest, and compound event, teaching financial record-keeping.

4. **Content Moderation & Suspicious Activity Detection** — A two-tier AI pipeline protects children from harmful content:
   - **Tier 1 — Local Pattern Matching:** An instant, offline check against a curated risk registry of known dangerous app patterns (adult content, dating, gambling, anonymous browsing, dark web, self-harm, etc.). This catches obvious threats with zero latency.
   - **Tier 2 — AI Analysis (AWS Bedrock AgentCore):** For apps that don't match the static registry, context is sent to an **AWS Bedrock AgentCore** agent for nuanced evaluation. The agent receives the app name, package ID, category, time-of-day, session duration, child's age, and prior flags and then returns a structured JSON verdict with a confidence score, severity level (minor/moderate/critical), reasoning, and recommended parent action. If AgentCore is unavailable, the system falls back to a direct **Bedrock Converse** call using Amazon Nova 2 Lite with the same child-safety system prompt.
   - Parents receive real-time alerts with severity filtering. Critical alerts can trigger WhatsApp notifications via OpenClaw.

### Target Users

- **Children (ages 8–16)** — Students who use smartphones daily and need structured, positive incentives to develop healthy screen-time habits, stay engaged with learning, and build foundational financial literacy.
- **Parents / Guardians** — Adults who want granular, real-time visibility into their child's phone usage, the ability to configure per-app controls and drain rates, and automated AI-powered alerts when suspicious activity is detected without having to constantly monitor their child's device themselves.

---

## Team Members

| Name | Role |
|------|------|
| Akshat | Frontend, Backend |
| Marcus | UI/UX Design, Acting |
| Thien | Video Editing, UI/UX Design, Frontend |
| Ian | Backend, AWS Cloud |
| Abdullah | Video Editing, Acting |

---

## Setup Instructions

### Prerequisites

Before you begin, ensure you have the following installed and configured:

- **Node.js** 18+ — [Download here](https://nodejs.org/)
- **Android Studio** — with the Android SDK installed (SDK 34+) and either:
  - An Android emulator configured (e.g. Pixel 7 API 34), or
  - A physical Android device connected via USB with Developer Mode and USB Debugging enabled
- **JDK 17** — Android builds require Java 17. Set the `JAVA_HOME` environment variable to your JDK path (e.g. `C:\Program Files\Android\Android Studio\jbr` on Windows)
- **Git** — for cloning the repository
- **A Supabase account** — free tier at [supabase.com](https://supabase.com)
- **An AWS account** with:
  - An IAM user (or role) with permissions: `bedrock:InvokeModel`, `bedrock:InvokeModelWithResponseStream`, `polly:SynthesizeSpeech`
  - **Amazon Nova 2 Lite** model access enabled in the AWS Bedrock console (region: `us-east-1`)

### Step 1 — Clone the repository

```bash
git clone https://github.com/Khootz/hackathon.git
cd AuraMax
```

### Step 2 — Install dependencies

```bash
npm install
```

This installs all required packages including Expo, React Native, Zustand, NativeWind, Supabase client, crypto-js, expo-av, and expo-file-system.

### Step 3 — Configure environment variables

Create a `.env` file in the project root (`AuraMax/.env`) with the following:

```env
# Supabase — get these from your Supabase project dashboard (Settings → API)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# AWS Credentials — from your IAM user (Security Credentials → Access Keys)
EXPO_PUBLIC_AWS_ACCESS_KEY_ID=your-aws-access-key-id
EXPO_PUBLIC_AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
EXPO_PUBLIC_AWS_REGION=us-east-1

# Bedrock AgentCore (optional — falls back to Converse if unset)
EXPO_PUBLIC_BEDROCK_AGENT_ID=your-agent-id
EXPO_PUBLIC_BEDROCK_AGENT_ALIAS_ID=your-agent-alias-id
```

### Step 4 — Set up the Supabase database

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the entire contents of `supabase-schema.sql` from the repo
4. Paste and run it — this creates all tables (profiles, family_links, aura_balance, aura_transactions, activity_logs, learning_modules, app_controls, security_alerts), triggers, functions, and RLS policies

### Step 5 — Enable the AI model in AWS Bedrock

1. Go to the [AWS Bedrock console](https://console.aws.amazon.com/bedrock/) (region: `us-east-1`)
2. Navigate to **Model access** in the left sidebar
3. Request access to **Amazon Nova 2 Lite** (`amazon.nova-lite-v1:0`)
4. Wait for the access status to show "Access granted" (usually instant)

### Step 6 — Start the Android emulator (if using emulator)

Open Android Studio → **Device Manager** → Launch your emulator (e.g. Pixel 7 API 34). Wait until the emulator is fully booted and shows the Android home screen.

If using a physical device, connect it via USB cable and ensure USB Debugging is enabled in Developer Options.

### Step 7 — Build and run the app

Set `JAVA_HOME` and run the Expo build:

```bash
# Windows (PowerShell)
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
npx expo run:android

# macOS / Linux
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
npx expo run:android
```

The first build takes 3–5 minutes (Gradle downloads dependencies and compiles native code). Subsequent builds are faster.

### Step 8 — Use the app

1. The app opens on your emulator or phone
2. **Sign up** as a Parent or Student
3. If Parent: generate an invite code from the dashboard, share it with the student
4. If Student: enter the invite code in Settings to link to a parent
5. Start using the Learning Hub to earn aura, watch your balance drain as you use apps, and explore the investment simulator

---

## Tech Stack

### Frameworks & Libraries

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Framework | **Expo SDK** | 55 | Managed workflow for React Native — handles native builds, module linking, and development tooling without manual Xcode/Gradle configuration |
| Runtime | **React Native** | 0.83.2 | Cross-platform mobile UI framework. We target Android exclusively for this hackathon |
| JavaScript Engine | **Hermes** | (bundled) | React Native's default JS engine — fast startup, low memory, but lacks `crypto.subtle` (hence our custom SigV4 signer) |
| Navigation | **Expo Router** | 55 | File-system-based routing. We use route groups — `(auth)/`, `(student)/`, `(parent)/` — to enforce role-based navigation with separate tab bars |
| State Management | **Zustand** | 5.0.11 | Minimal, hook-based stores. Six stores manage auth, aura economy, family links, learning, screen time, and alerts without boilerplate |
| Styling | **NativeWind** | 4 | Tailwind CSS for React Native — compiles `className` strings to native `StyleSheet` objects at build time |
| Audio | **expo-av** | 16.0.8 | Audio playback for Polly TTS — loads MP3 files from cache and plays them with start/stop/unload control |
| File System | **expo-file-system** | 55.0.10 | SDK 55's new `File` / `Paths` API — used to write Polly MP3 audio bytes to the device cache directory before playback |
| Charts | **react-native-chart-kit** | 6.12.0 | Line and bar charts for visualizing screen time usage trends in the parent monitoring dashboard |
| SVG | **react-native-svg** | 15.15.3 | Renders custom SVG icons (speaker button, decorative elements, aura badges) as native views |
| Animations | **react-native-reanimated** | 4.2.1 | Hardware-accelerated animations for screen transitions and UI interactions |
| Crypto | **crypto-js** | (peer dep) | Pure-JS implementation of HMAC-SHA256, SHA-256, and hex encoding — used exclusively for AWS SigV4 request signing since Hermes doesn't support `crypto.subtle` |
| Async Storage | **@react-native-async-storage** | 2.2.0 | Persistent key-value storage for Supabase auth session tokens |

### Backend & Cloud Services

| Service | Technology | How It's Used |
|---------|-----------|---------------|
| **Database** | **Supabase (PostgreSQL)** | Stores all application data — user profiles, family links, aura balances, transaction ledgers, learning modules (quiz JSON), app controls, and security alerts. All tables are protected by Row-Level Security (RLS) policies that enforce strict family-level data isolation (a parent can only see their linked children's data, students can only access their own records). |
| **Authentication** | **Supabase Auth** | Email/password sign-up and login with role selection (parent or student). Sessions are persisted via AsyncStorage. A database trigger auto-creates a profile row on sign-up. |
| **Realtime** | **Supabase Realtime** | Live subscriptions so parent dashboards update instantly when a child's aura changes, a quiz is completed, or a suspicious app is detected — no polling required. |
| **AI — Quiz Generation** | **AWS Bedrock Converse API** | Generates personalized 5-question multiple-choice quizzes. The app sends a system prompt + user prompt (containing the child's age, chosen subject, and interests) to **Amazon Nova 2 Lite** (`amazon.nova-lite-v1:0`) via the Converse API. The model returns structured JSON with questions, options, correct answers, and explanations. The request is signed with SigV4 using `crypto-js`. |
| **AI — Suspicious Activity** | **AWS Bedrock AgentCore** | Runs a child-safety agent that evaluates potentially harmful apps. The agent receives rich context (app name, package ID, category, time-of-day, session duration, child's age, prior flags) and returns a structured JSON verdict with confidence score, severity, reasoning, and recommended action. **Fallback:** If AgentCore is unavailable or unconfigured, the system falls back to a direct **Bedrock Converse** call using Amazon Nova 2 Lite with an inlined child-safety system prompt. |
| **Text-to-Speech** | **AWS Polly** | Synthesizes natural-sounding speech for each quiz question using the **Matthew** neural voice (US-English). The app sends text to Polly's `SynthesizeSpeech` REST API (SigV4-signed), receives raw MP3 audio bytes, writes them to a temporary cache file via `expo-file-system`, and plays them via `expo-av`. Audio files are automatically cleaned up after playback. |
| **Request Signing** | **Custom SigV4** (`lib/awsSigner.ts`) | A pure-JavaScript AWS Signature Version 4 implementation using `crypto-js`. Signs all requests to Bedrock and Polly without requiring the full AWS SDK — reducing bundle size by ~2MB and avoiding native crypto dependencies that don't work on Hermes. |
| **Messaging** | **OpenClaw** | WhatsApp alert delivery for critical security events (stretch feature). |

### AI Models

| Model | Provider | Service | Use Case | Details |
|-------|----------|---------|----------|---------|
| **Amazon Nova 2 Lite** | Amazon | AWS Bedrock Converse API | Quiz Generation | Generates structured JSON quizzes (5 questions, 4 options each, with correct answer and explanation). Prompts include the child's age, school subject, and personal interests to create personalized, engaging questions. The model was chosen for its fast inference speed, low cost, and strong instruction-following for JSON output. Model ID: `amazon.nova-lite-v1:0` |
| **Amazon Nova 2 Lite** | Amazon | AWS Bedrock AgentCore / Converse (fallback) | Suspicious Activity Analysis | Powers the Tier 2 AI analysis in the suspicious activity pipeline. An AgentCore agent evaluates app metadata against child safety criteria and outputs structured risk verdicts with confidence scores, severity levels, and recommended parental actions. Falls back to a direct Converse call with the same model and system prompt if AgentCore is unavailable. |
| **Matthew (Neural)** | Amazon | AWS Polly | Text-to-Speech | Reads each quiz question aloud with natural-sounding US-English speech. The neural engine produces significantly higher quality output than standard voices, making the learning experience more engaging for children. Voice ID: `Matthew`, Engine: `neural`, Output: MP3 |

### Architecture

```
app/                    Expo Router screens
  (auth)/               Login, Signup, Parent-child linking
  (student)/            Dashboard, Learning Hub, Settings
  (parent)/             Dashboard, Monitor, Controls, Notifications

lib/
  awsSigner.ts          AWS SigV4 request signing (crypto-js, Hermes-compatible)
  bedrock.ts            Bedrock Converse API — quiz generation (Amazon Nova 2 Lite)
  bedrockAgentCore.ts   Bedrock AgentCore — suspicious activity agent
  polly.ts              AWS Polly TTS — reads quiz questions aloud (Matthew neural)
  supabase.ts           Supabase client (auth, database, realtime)
  suspiciousActivity.ts Two-tier app detection (local registry + AgentCore/Converse)
  openclaw.ts           WhatsApp alerting via OpenClaw
  elevenlabs.ts         TTS integration (legacy, unused)

store/                  Zustand state management
  authStore.ts          Auth, session, role routing
  auraStore.ts          Balance, invest, drain, compound interest, transactions
  familyStore.ts        Parent-child linking, invite codes, realtime sync
  learningStore.ts      AI quiz generation, completion tracking, aura rewards
  screenTimeStore.ts    App session tracking, usage logging
  alertStore.ts         Security alerts, severity filtering
  suspiciousActivityStore.ts  Detection pipeline orchestration

constants/              Risk registry, app categories
modules/usage-stats/    Native Android module for foreground app detection (UsageStatsManager)
```

### Database

Full schema in `supabase-schema.sql`. All tables are protected by Row-Level Security (RLS) policies enforcing strict data isolation between families.

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| **profiles** | Extends Supabase Auth users with app-specific data | `role` (parent/student), `name`, `interests[]`, `avatar_url` |
| **family_links** | Parent ↔ child relationships via invite codes | `parent_id`, `child_id`, `invite_code`, `status` (pending/accepted) |
| **aura_balance** | Current aura state per student | `balance`, `invested`, `last_compound_at` |
| **aura_transactions** | Immutable ledger of all aura changes | `amount`, `type` (reward/drain/invest/compound/penalty/withdraw), `description` |
| **activity_logs** | Per-app screen time sessions | `app_name`, `package_name`, `duration_seconds`, `started_at` |
| **learning_modules** | AI-generated quiz data | `subject`, `interest`, `quiz_data` (JSONB), `score`, `completed` |
| **app_controls** | Parent-configured monitoring rules | `app_name`, `drain_rate`, `is_monitored`, `is_locked` |
| **security_alerts** | Flagged suspicious activity | `severity` (minor/moderate/critical), `ai_reasoning`, `acknowledged` |
