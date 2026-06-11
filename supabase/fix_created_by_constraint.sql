-- ============================================================
-- FIX: bills_created_by_fkey constraint
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Step 1: Drop the constraint referencing the old public.users table
ALTER TABLE public.bills 
  DROP CONSTRAINT IF EXISTS bills_created_by_fkey;

-- Step 2: Recreate the constraint referencing auth.users(id)
ALTER TABLE public.bills 
  ADD CONSTRAINT bills_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

-- Backup Option: If referencing auth.users(id) fails due to permissions,
-- you can reference public.profiles(id) instead:
-- 
-- ALTER TABLE public.bills 
--   ADD CONSTRAINT bills_created_by_fkey 
--   FOREIGN KEY (created_by) 
--   REFERENCES public.profiles(id) 
--   ON DELETE SET NULL;
