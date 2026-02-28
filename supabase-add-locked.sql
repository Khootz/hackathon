-- Run this in Supabase SQL Editor to add app locking support
-- Only needed if you already ran supabase-schema.sql without it

ALTER TABLE public.app_controls
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false;

-- Index for quick child-side lookups
CREATE INDEX IF NOT EXISTS idx_app_controls_child_locked
  ON public.app_controls (child_id, is_locked);
