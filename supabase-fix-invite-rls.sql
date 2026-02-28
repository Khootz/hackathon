-- ============================================================
-- FIX: Allow children to accept pending invite codes
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================
-- 
-- BUG: The "Children can accept links" policy required child_id = auth.uid()
-- or parent_id = auth.uid(). But on a pending invite, child_id is NULL,
-- so the child can never match the USING clause — the UPDATE is silently blocked.
-- The child's app shows "linked" because it reads the link data before updating,
-- but the database row is never actually updated.
--
-- FIX: Also allow updates on rows where child_id IS NULL and status = 'pending',
-- so any authenticated user can accept an open invite.
-- ============================================================

-- Drop the broken policy
drop policy if exists "Children can accept links" on public.family_links;

-- Recreate with the fix
create policy "Children can accept links" on public.family_links
  for update using (
    child_id = auth.uid()
    or parent_id = auth.uid()
    or (child_id is null and status = 'pending')
  );
