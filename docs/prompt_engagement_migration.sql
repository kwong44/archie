-- Migration: Create prompt_engagement table
-- This migration creates the missing prompt_engagement table for tracking user interactions with journal prompts
-- Run this in your Supabase SQL Editor

-- Create prompt_engagement table for tracking user interactions with journal prompts
-- This table helps measure prompt effectiveness and personalize future suggestions
CREATE TABLE IF NOT EXISTS public.prompt_engagement (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    prompt_id TEXT NOT NULL,
    prompt_category TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('viewed', 'used', 'skipped')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT prompt_engagement_user_prompt_action_key UNIQUE (user_id, prompt_id, action)
);

-- Enable RLS on the prompt_engagement table
ALTER TABLE public.prompt_engagement ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for prompt_engagement
CREATE POLICY "Users can view their own prompt engagement."
    ON public.prompt_engagement FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own prompt engagement."
    ON public.prompt_engagement FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_prompt_engagement_user_id ON public.prompt_engagement(user_id);
CREATE INDEX IF NOT EXISTS idx_prompt_engagement_created_at ON public.prompt_engagement(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_engagement_category ON public.prompt_engagement(prompt_category);
CREATE INDEX IF NOT EXISTS idx_prompt_engagement_action ON public.prompt_engagement(action);

-- Add comment to table for documentation
COMMENT ON TABLE public.prompt_engagement IS 'Tracks user interactions with journal prompts for personalization and analytics';
COMMENT ON COLUMN public.prompt_engagement.prompt_category IS 'Category extracted from prompt ID for filtering and analytics';
COMMENT ON COLUMN public.prompt_engagement.action IS 'User action: viewed, used, or skipped'; 