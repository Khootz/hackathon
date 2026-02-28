# AuraMax — Build Progress

## Auth & Onboarding
- [x] Expo project setup + dependencies
- [x] Folder structure (expo-router groups)
- [x] Supabase project setup + schema migration (SQL ready)
- [x] Sign up with role selection (Parent / Student)
- [x] Login + role-based routing
- [x] Parent-child account linking (invite code)

## Student App
- [x] Home screen with live Aura balance (from Supabase)
- [x] Screen time tracker (simulated — tap apps to drain aura)
- [x] Aura drain logic per app (configurable drain rates)
- [x] App lock overlay (modal when aura = 0)
- [x] Learning Hub — AI quiz generation (AWS Bedrock / Amazon Nova Lite)
- [x] Quiz taking flow with scoring + explanations
- [x] Aura reward on module completion (accuracy-based)
- [x] Aura Dashboard + compound interest simulation
- [x] Invest / Withdraw aura
- [x] Transaction history ledger
- [x] Settings with parent link entry
- [ ] Audio playback (ElevenLabs) — deferred
- [ ] Real-time tutor chat — deferred

## Parent App
- [x] Dashboard with child overview (aura, screen time, modules)
- [x] Activity Monitor (per-app usage, weekly chart)
- [x] Controls panel (monitored apps, drain rate config)
- [x] Alert history with severity filters
- [x] Invite code generation for child linking
- [ ] Critical alert → WhatsApp (OpenClaw) — deferred

## Zustand Stores
- [x] authStore (auth, session, role)
- [x] auraStore (balance, invest, drain, compound, transactions)
- [x] familyStore (links, invite codes, children)
- [x] learningStore (modules, quiz generation, completion)
- [x] screenTimeStore (app sessions, usage logging)
- [x] alertStore (security alerts, acknowledge)

## Database (Supabase)
- [x] profiles table + auto-create trigger
- [x] family_links table (invite code system)
- [x] aura_balance table
- [x] aura_transactions ledger
- [x] activity_logs (per-app screen time)
- [x] learning_modules (quiz data as JSONB)
- [x] app_controls (parent-configured drain rates)
- [x] security_alerts
- [x] RLS policies for all tables
- [x] compound_aura() database function

## Integrations
- [x] AWS Bedrock Converse API — quiz generation (Amazon Nova Lite)
- [x] AWS Bedrock Agent Runtime — suspicious activity analysis
- [x] AWS SigV4 signing (crypto-js, Hermes-compatible)
- [ ] Google Classroom API (stretch)
- [ ] ElevenLabs TTS (deferred)
- [ ] OpenClaw WhatsApp (deferred)

## Testing
- [ ] Auth flow E2E test
- [ ] Aura economy unit tests
- [ ] AI generation integration test
- [ ] Parent-child data isolation (RLS) test
- [ ] Alert trigger test (minor + critical)
- [ ] Compound simulation accuracy test
