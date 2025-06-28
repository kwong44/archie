-- Database Schema for The Architect App
-- This file contains all the SQL statements needed to set up the database tables
-- Run these commands in the Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Profiles Table
-- Extends Supabase auth.users with additional profile information
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    onboarding_completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT user_profiles_user_id_key UNIQUE (user_id)
);

-- User Principles Table
-- Stores the core principles selected during onboarding
CREATE TABLE IF NOT EXISTS public.user_principles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    principle TEXT NOT NULL,
    selected_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT user_principles_user_principle_key UNIQUE (user_id, principle)
);

-- User Lexicon Table
-- Stores word transformation pairs (old word -> new word)
CREATE TABLE IF NOT EXISTS public.user_lexicon (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    old_word TEXT NOT NULL,
    new_word TEXT NOT NULL,
    description TEXT,
    usage_count INTEGER DEFAULT 0,
    selected_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT user_lexicon_user_old_word_key UNIQUE (user_id, old_word)
);

-- Journal Sessions Table
-- Stores completed reframing sessions
CREATE TABLE IF NOT EXISTS public.journal_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    original_transcript TEXT NOT NULL,
    reframed_text TEXT,
    ai_summary TEXT,
    audio_url TEXT,
    mood_before TEXT,
    mood_after TEXT,
    session_duration_seconds INTEGER,
    transformations_applied JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transformation Usage Table
-- Tracks when specific word transformations are used
CREATE TABLE IF NOT EXISTS public.transformation_usage (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    lexicon_id UUID REFERENCES public.user_lexicon(id) NOT NULL,
    session_id UUID REFERENCES public.journal_sessions(id) NOT NULL,
    old_word_instance TEXT NOT NULL,
    new_word_instance TEXT NOT NULL,
    context_before TEXT,
    context_after TEXT,
    used_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT transformation_usage_session_lexicon_key UNIQUE (session_id, lexicon_id, old_word_instance)
);

-- User Achievements Table
-- Stores gamification achievements
CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    achievement_type TEXT NOT NULL,
    achievement_name TEXT NOT NULL,
    achievement_description TEXT,
    icon_name TEXT,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT user_achievements_user_type_key UNIQUE (user_id, achievement_type)
);

-- Prompt Engagement Table
-- Tracks user interactions with journal prompts for personalization and analytics
CREATE TABLE IF NOT EXISTS public.prompt_engagement (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    prompt_id TEXT NOT NULL,
    prompt_category TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('viewed', 'used', 'skipped')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT prompt_engagement_user_prompt_action_key UNIQUE (user_id, prompt_id, action)
);

-- RLS (Row Level Security) Policies
-- These policies ensure users can only access their own data

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_principles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_lexicon ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transformation_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_engagement ENABLE ROW LEVEL SECURITY;

-- User Profiles Policies
CREATE POLICY "Users can view their own profile."
    ON public.user_profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile."
    ON public.user_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile."
    ON public.user_profiles FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- User Principles Policies
CREATE POLICY "Users can view their own principles."
    ON public.user_principles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own principles."
    ON public.user_principles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own principles."
    ON public.user_principles FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own principles."
    ON public.user_principles FOR DELETE
    USING (auth.uid() = user_id);

-- User Lexicon Policies
CREATE POLICY "Users can view their own lexicon."
    ON public.user_lexicon FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own lexicon."
    ON public.user_lexicon FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lexicon."
    ON public.user_lexicon FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lexicon."
    ON public.user_lexicon FOR DELETE
    USING (auth.uid() = user_id);

-- Journal Sessions Policies
CREATE POLICY "Users can view their own sessions."
    ON public.journal_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions."
    ON public.journal_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions."
    ON public.journal_sessions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Transformation Usage Policies
CREATE POLICY "Users can view their own transformation usage."
    ON public.transformation_usage FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transformation usage."
    ON public.transformation_usage FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- User Achievements Policies
CREATE POLICY "Users can view their own achievements."
    ON public.user_achievements FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements."
    ON public.user_achievements FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Prompt Engagement Policies
CREATE POLICY "Users can view their own prompt engagement."
    ON public.prompt_engagement FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own prompt engagement."
    ON public.prompt_engagement FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Functions for automatic timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to atomically increment word pair usage count
CREATE OR REPLACE FUNCTION public.increment_word_pair_usage(
  user_id UUID,
  word_pair_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Increment usage count for the specified word pair
  -- Only allow users to increment their own word pairs
  UPDATE public.user_lexicon
  SET 
    usage_count = usage_count + 1,
    updated_at = NOW()
  WHERE 
    id = word_pair_id 
    AND user_id = increment_word_pair_usage.user_id;
    
  -- Check if any row was updated
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Word pair not found or access denied';
  END IF;
END;
$$;

-- Triggers for updated_at timestamps
CREATE TRIGGER handle_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_user_lexicon_updated_at
    BEFORE UPDATE ON public.user_lexicon
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_journal_sessions_updated_at
    BEFORE UPDATE ON public.journal_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Function to automatically create user profile after signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, user_id, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_principles_user_id ON public.user_principles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_lexicon_user_id ON public.user_lexicon(user_id);
CREATE INDEX IF NOT EXISTS idx_user_lexicon_old_word ON public.user_lexicon(old_word);
CREATE INDEX IF NOT EXISTS idx_journal_sessions_user_id ON public.journal_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_sessions_created_at ON public.journal_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transformation_usage_user_id ON public.transformation_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_prompt_engagement_user_id ON public.prompt_engagement(user_id);
CREATE INDEX IF NOT EXISTS idx_prompt_engagement_created_at ON public.prompt_engagement(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_engagement_category ON public.prompt_engagement(prompt_category);
CREATE INDEX IF NOT EXISTS idx_prompt_engagement_action ON public.prompt_engagement(action);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Comments for documentation
COMMENT ON TABLE public.user_profiles IS 'Extended user profile information beyond Supabase auth';
COMMENT ON TABLE public.user_principles IS 'Core principles selected by users during onboarding';
COMMENT ON TABLE public.user_lexicon IS 'Personal word transformation pairs (old -> new words)';
COMMENT ON TABLE public.journal_sessions IS 'Completed reframing sessions with transcripts and AI summaries';
COMMENT ON TABLE public.transformation_usage IS 'Tracks when specific transformations are applied in sessions';
COMMENT ON TABLE public.user_achievements IS 'Gamification achievements earned by users';
COMMENT ON TABLE public.prompt_engagement IS 'Tracks user interactions with journal prompts for personalization and analytics'; 