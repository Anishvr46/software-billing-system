-- ============================================================
-- FIX: bills_payment_method_check constraint
-- Run this in Supabase SQL Editor
-- ============================================================

-- Step 1: Drop the old check constraint
ALTER TABLE public.bills DROP CONSTRAINT IF EXISTS bills_payment_method_check;

-- Step 2: Recreate with lowercase values (cash, upi, card)
ALTER TABLE public.bills 
ADD CONSTRAINT bills_payment_method_check 
CHECK (payment_method IN ('cash', 'upi', 'card'));

-- Verify it works
SELECT conname, consrc FROM pg_constraint WHERE conname = 'bills_payment_method_check';
