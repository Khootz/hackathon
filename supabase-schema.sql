-- ============================================================
-- AuraMax — Supabase Database Schema
-- Run this ENTIRE script in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. PROFILES TABLE
-- Extends auth.users with app-specific data
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  role text not null check (role in ('student', 'parent')),
  avatar_url text,
  interests text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. FAMILY LINKS TABLE
-- Parent-child relationships via invite codes
create table if not exists public.family_links (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  child_id uuid references public.profiles(id) on delete cascade,
  invite_code text unique not null,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz default now()
);

-- 3. AURA BALANCE TABLE
-- Current aura state for each student
create table if not exists public.aura_balance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references public.profiles(id) on delete cascade,
  balance numeric not null default 500,
  invested numeric not null default 0,
  last_compound_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. AURA TRANSACTIONS TABLE
-- Ledger of all aura changes
create table if not exists public.aura_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric not null,
  type text not null check (type in ('reward', 'drain', 'invest', 'compound', 'penalty', 'withdraw')),
  description text,
  created_at timestamptz default now()
);

-- 5. ACTIVITY LOGS TABLE
-- Screen time tracking per app
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  app_name text not null,
  duration_minutes numeric not null default 0,
  aura_drained numeric not null default 0,
  session_date date not null default current_date,
  created_at timestamptz default now()
);

-- 6. LEARNING MODULES TABLE
-- AI-generated quiz modules
create table if not exists public.learning_modules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null,
  interest text not null,
  title text not null default '',
  quiz_data jsonb not null default '{}',
  score numeric,
  total_questions numeric,
  aura_reward numeric not null default 0,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- 7. APP CONTROLS TABLE
-- Parent-configured app monitoring rules
create table if not exists public.app_controls (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  child_id uuid not null references public.profiles(id) on delete cascade,
  app_name text not null,
  drain_rate numeric not null default 1,
  is_monitored boolean not null default true,
  is_locked boolean not null default false,
  daily_limit_minutes numeric,
  created_at timestamptz default now(),
  unique(parent_id, child_id, app_name)
);

-- 8. SECURITY ALERTS TABLE
-- Alert history
create table if not exists public.security_alerts (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid not null references public.profiles(id) on delete cascade,
  severity text not null check (severity in ('minor', 'critical')),
  message text not null,
  app_name text,
  sent_whatsapp boolean not null default false,
  acknowledged boolean not null default false,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.family_links enable row level security;
alter table public.aura_balance enable row level security;
alter table public.aura_transactions enable row level security;
alter table public.activity_logs enable row level security;
alter table public.learning_modules enable row level security;
alter table public.app_controls enable row level security;
alter table public.security_alerts enable row level security;

-- PROFILES: Users can read/update their own profile; parents can read linked children
create policy "Users can read own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Parents can read linked children profiles" on public.profiles
  for select using (
    id in (
      select child_id from public.family_links
      where parent_id = auth.uid() and status = 'accepted'
    )
  );

-- FAMILY LINKS: Parents create, children accept
create policy "Parents can create links" on public.family_links
  for insert with check (parent_id = auth.uid());

create policy "Users can read own links" on public.family_links
  for select using (parent_id = auth.uid() or child_id = auth.uid());

-- Allow children to accept pending invites (child_id is NULL on unaccepted rows)
-- and allow parents/children to update their own links
create policy "Children can accept links" on public.family_links
  for update using (
    child_id = auth.uid()
    or parent_id = auth.uid()
    or (child_id is null and status = 'pending')
  );

create policy "Anyone can find invite code" on public.family_links
  for select using (true);

-- AURA BALANCE: Students read/update own, parents read linked children
create policy "Users can manage own aura" on public.aura_balance
  for all using (user_id = auth.uid());

create policy "Parents can read child aura" on public.aura_balance
  for select using (
    user_id in (
      select child_id from public.family_links
      where parent_id = auth.uid() and status = 'accepted'
    )
  );

-- AURA TRANSACTIONS: Same pattern
create policy "Users can manage own transactions" on public.aura_transactions
  for all using (user_id = auth.uid());

create policy "Parents can read child transactions" on public.aura_transactions
  for select using (
    user_id in (
      select child_id from public.family_links
      where parent_id = auth.uid() and status = 'accepted'
    )
  );

-- ACTIVITY LOGS: Students write, parents read
create policy "Users can manage own activity" on public.activity_logs
  for all using (user_id = auth.uid());

create policy "Parents can read child activity" on public.activity_logs
  for select using (
    user_id in (
      select child_id from public.family_links
      where parent_id = auth.uid() and status = 'accepted'
    )
  );

-- LEARNING MODULES: Students own, parents read
create policy "Users can manage own modules" on public.learning_modules
  for all using (user_id = auth.uid());

create policy "Parents can read child modules" on public.learning_modules
  for select using (
    user_id in (
      select child_id from public.family_links
      where parent_id = auth.uid() and status = 'accepted'
    )
  );

-- APP CONTROLS: Parents manage, students read own
create policy "Parents can manage controls" on public.app_controls
  for all using (parent_id = auth.uid());

create policy "Students can read own controls" on public.app_controls
  for select using (child_id = auth.uid());

-- SECURITY ALERTS: System inserts, parents and children read own
create policy "Parents can manage alerts" on public.security_alerts
  for all using (parent_id = auth.uid());

create policy "Children can read own alerts" on public.security_alerts
  for select using (child_id = auth.uid());

create policy "Users can insert alerts" on public.security_alerts
  for insert with check (child_id = auth.uid());

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'student')
  );
  
  -- Auto-create aura balance for students
  if coalesce(new.raw_user_meta_data->>'role', 'student') = 'student' then
    insert into public.aura_balance (user_id, balance, invested)
    values (new.id, 500, 0);
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists and recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Function to compound aura investments
create or replace function public.compound_aura(p_user_id uuid)
returns numeric as $$
declare
  v_balance record;
  v_days numeric;
  v_interest numeric;
begin
  select * into v_balance from public.aura_balance where user_id = p_user_id;
  
  if v_balance is null or v_balance.invested <= 0 then
    return 0;
  end if;
  
  v_days := extract(epoch from (now() - v_balance.last_compound_at)) / 86400.0;
  
  if v_days < 0.0007 then -- less than ~1 minute, skip
    return 0;
  end if;
  
  v_interest := round((v_balance.invested * 0.02 * v_days)::numeric, 2);
  
  if v_interest > 0 then
    update public.aura_balance
    set balance = balance + v_interest,
        invested = invested + v_interest,
        last_compound_at = now(),
        updated_at = now()
    where user_id = p_user_id;
    
    insert into public.aura_transactions (user_id, amount, type, description)
    values (p_user_id, v_interest, 'compound', 'Daily compound interest on invested aura');
  end if;
  
  return v_interest;
end;
$$ language plpgsql security definer;

-- ============================================================
-- DONE! Now go to Authentication → Settings → 
-- Disable "Enable email confirmations" for demo mode
-- ============================================================
