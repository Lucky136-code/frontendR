-- =============================================
-- RETIX: Create Profiles Table
-- Run this in Supabase Dashboard → SQL Editor
-- =============================================

-- Create the profiles table to store all user details
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT        NOT NULL,
  email       TEXT        NOT NULL,
  phone       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Allow anyone (with anon key) to insert their own profile on signup
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert on signup"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow user to read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- ✅ After running this, go to Table Editor → profiles
-- You will see every user's name, email, phone, and signup time!
