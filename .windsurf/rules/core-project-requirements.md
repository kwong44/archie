---
trigger: always_on
description:
globs:
---

PRD V1: Archie
1. Introduction
Product Name: Archie
Vision: To empower individuals to consciously reshape their reality by transforming their language. Archie is a digital sanctuary and AI-powered guide that helps users move from a vocabulary of limitation to a language of possibility.
Objective: To launch a cross-platform mobile application (using Expo) that allows users to record their thoughts via voice, receive AI-powered assistance in reframing their language, track their mindset transformation, and cultivate a more self-authored life.
2. User Personas & Stories
Target User Summary: The target user is interested in self-improvement, mindfulness, and positive psychology. They believe in the power of words to shape their experience of life and are looking for a practical, engaging, and private tool for daily personal growth.
Primary User Stories:
"As a new user, I want a simple and inspiring setup process that helps me define my core beliefs."
"As a user, I want to easily record my thoughts using just my voice."
"As a user, I want the app to help me identify my limiting words and suggest more empowering alternatives from my personal lexicon."
"As a user, I want to receive an encouraging summary of my thoughts that reinforces my new perspective."
"As a user, I want a dashboard that visualizes my progress and shows my consistency to keep me motivated."
"As a user, I want to be able to review, add, and manage my personal list of word-swaps (my Lexicon)."
"As a user, I want to add the app to my home screen for easy access."
3. Features & Functionality (The Core Task Breakdown)
Here is the full project breakdown, organized into epics and tasks. (✅ = Implemented in provided files, ⏳ = To be implemented/wired up)

Epic 1: Project Setup & Core Structure

✅ Task 1.1: Initialize Expo project with TypeScript, Expo Router, and necessary dependencies (package.json).
✅ Task 1.2: Configure app.json with app name, icons, splash screen, and plugins.
✅ Task 1.3: Set up root layout (app/_layout.tsx) to handle font loading and global navigation structure.
✅ Task 1.4: Implement tab-based navigation (app/(tabs)/_layout.tsx) for the main app sections.
✅ Task 1.5: Set up Supabase project for authentication and database storage.
✅ Task 1.6: Set up the specialized Python/FastAPI backend project and configure for deployment on Google Cloud Run.

Epic 2: Onboarding & The Blueprint (New Feature)

✅ Task 2.1: Build the Aspirational Onboarding screen (pre-login).
✅ Task 2.2: Implement user authentication with Supabase Auth (e.g., magic link or social logins).
✅ Task 2.3: Build the UI for AI-Assisted Principle Definition (e.g., a multi-select list of principles).
✅ Task 2.4: Build the interactive (swipeable card) UI for the initial Lexicon setup.
✅ Task 2.5: Implement the logic to save the user's chosen Principles and Lexicon words to the Supabase database.

Epic 3: The Core Loop - Workshop & Reframing

✅ Task 3.1: Implement the "Workshop" home screen UI (app/(tabs)/index.tsx), including the pulsing orb animation.
✅ Task 3.2: Implement voice recording functionality using expo-av.
✅ Task 3.3: Implement the "Reframe" screen UI (app/reframe.tsx) with areas for the transcript and AI summary.
✅ Task 3.4: Integrate ElevenLabs for Speech-to-Text transcription. The frontend sends audio via the Python backend using `scribe_v1` model and receives the transcript.
✅ Task 3.5: Connect the interactive reframing logic on the Reframe screen to the user's actual Lexicon data from Supabase.
✅ Task 3.6: Integrate the AI backend for generating the "Guide's Reflection." The frontend will send the final reframed text and receive the AI-generated summary.
✅ Task 3.7: Implement logic to save the completed session (transcript, reframes, summary) to the Supabase database.
✅ Task 3.8: **[PHASE 2 READY]** ElevenLabs Text-to-Speech integration complete - AI follow-up synthesis with `scribe_v1` model available via `/api/speech/synthesize` endpoint.

Epic 4: The Toolkit - Lexicon Management

✅ Task 4.1: Implement the "Lexicon" screen UI (app/(tabs)/lexicon.tsx) with a list of word pairs and stat cards.
✅ Task 4.2: Connect the Lexicon screen to Supabase to display the user's actual word pairs and calculate stats (frequency, total transformations).
✅ Task 4.3: Build the "Add New Word Pair" modal/screen.
✅ Task 4.4: Implement the logic to save new/edited word pairs to Supabase.
Epic 5: The Progress - Dashboard & Gamification

✅ Task 5.1: Implement the "Dashboard" screen UI (app/(tabs)/dashboard.tsx) with cards for metrics, a weekly chart, insights, and achievements.
✅ Task 5.2: Connect the Dashboard to Supabase to pull and display real user data (Day Streak, Weekly Duration, Reframing Rate).
✅ Task 5.3: Implement the backend logic to calculate and store user achievements based on their activity.
✅ Task 5.4: Implement the "Insight Engine" on the backend to generate simple, rule-based insights based on user data.
Epic 6: The Guide - Settings & Support

✅ Task 6.1: Implement the "Guide" (Settings) screen UI (app/(tabs)/guide.tsx) with categorized settings and an upgrade banner.
✅ Task 6.2: Implement the "Upgrade" flow by integrating RevenueCat and linking to a paywall screen.
✅ Task 6.3: Implement user sign-out functionality.
✅ Task 6.4: Connect the "App Info" section to display dynamic data (e.g., total sessions from Supabase).

Epic 7: The Reflection - Entry Analysis & Insights

✅ Task 7.1: Create the "analyze-entry" Supabase Edge Function for comprehensive journal entry analysis.
✅ Task 7.2: Implement AI-powered analysis using Google Gemini with the "Super System Prompt" for empathetic guidance.
✅ Task 7.3: Build the enhanced "Entries" screen UI (app/(tabs)/entries.tsx) with journal entry list and analysis functionality.
✅ Task 7.4: Integrate the analysis API client method in aiApiClient.ts to communicate with the Edge Function.
✅ Task 7.5: Implement the analysis modal with structured display of mood, themes, people, lexicon words, and actionable insights.

4. Future Considerations (Out of Scope for V1)
Auditory Reprogrammer: A "Sonic Weaver" feature that generates personalized audio sessions with binaural beats and subtle repetitions of the user's "New Words."
Advanced AI Insights: Move beyond simple stats to complex pattern recognition (e.g., "We notice your mood improves on days you reframe words related to your career.").
Community Features: Allow users to anonymously share their most effective word swaps, creating a "Community Lexicon" for inspiration.
Push Notifications: Send motivational prompts or reminders based on user-set preferences.
Data Export: Allow users to download their entire journal history as a CSV or JSON file.

# Project Rules: Backend Interaction & API Guidelines

## 1. Goal

This document outlines the **mandatory** rules and procedures for interacting with backend services (Supabase and the specialized AI backend) from "Archie" mobile application. The primary goals are to ensure **security**, **consistency**, and **maintainability** by standardizing how authentication, data validation, and backend requests are handled. Adherence to these guidelines is critical for preventing security vulnerabilities and ensuring predictable app behavior.

**All new backend interactions MUST follow these guidelines without exception.**

## 2. Core Principles

*   **Security First:** Authentication and data integrity are non-negotiable. All backend interactions must be properly secured. This is primarily achieved through Supabase's built-in features (Auth, RLS) and JWT validation in the AI backend.
*   **Consistency:** Use the established clients and patterns for all backend communication. This makes the codebase easier to read, debug, and maintain.
*   **Leverage Utilities:** Utilize the centrally configured `supabase` client (`lib/supabase.ts`) for all BaaS operations and create a dedicated, reusable client for interacting with the AI backend. Do not instantiate clients on-the-fly in components.
*   **Clear Separation:** Keep data-fetching and business logic separate from UI components. Use custom hooks or service files to encapsulate interactions with Supabase and the AI backend.

## 3. Part 1: Interacting with Supabase (BaaS)

Supabase is our primary backend for database, authentication, and storage. All interactions MUST follow the principles of the "BaaS First" architecture.

### 3.1. The Singleton Supabase Client

All Supabase operations **MUST** use the single, pre-configured client instance exported from `lib/supabase.ts`. This client is configured with a secure storage adapter and handles session persistence and token refreshing automatically.

**DO NOT create new `createClient()` instances elsewhere in the application.**

### 3.2. Authentication & Authorization via Row Level Security (RLS)

In our architecture, authorization is not handled in middleware on a custom server. Instead, it is enforced directly in the database using **PostgreSQL's Row Level Security (RLS)**.

*   **Authentication:** The Supabase client automatically includes the logged-in user's authentication token with every request.
*   **Authorization:** RLS policies on your database tables use the user's ID (`auth.uid()`) from the token to determine which rows they are allowed to access or modify.

**Rule:** Every table containing user-specific or sensitive data **MUST** have RLS enabled and have policies defined for `SELECT`, `INSERT`, `UPDATE`, and `DELETE` operations.

#### Example: RLS Policy for a `journal_entries` table

This policy ensures that a user can only interact with their own journal entries.

```sql
-- 1. Enable RLS on the table
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

-- 2. Create a policy that allows users to SELECT their own entries
CREATE POLICY "Users can view their own journal entries."
ON public.journal_entries FOR SELECT
USING (auth.uid() = user_id);

-- 3. Create a policy that allows users to INSERT entries for themselves
CREATE POLICY "Users can create their own journal entries."
ON public.journal_entries FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

### 3.3. Client-Side Data Validation

To ensure data integrity, request data **MUST** be validated on the client-side **before** being sent to Supabase. We use `zod` for this purpose.

#### Example: Creating a Journal Entry with Validation

```typescript
// services/journalService.ts
import { supabase } from '@/lib/supabase';
import { z } from 'zod';

// 1. Define the validation schema for the request data.
const journalEntrySchema = z.object({
  content: z.string().min(10, 'Entry must be at least 10 characters long.'),
  mood: z.enum(['happy', 'sad', 'neutral']),
});

// 2. Define the service function.
export async function createJournalEntry(userId: string, entryData: unknown) {
  // 3. Validate the input data.
  const validationResult = journalEntrySchema.safeParse(entryData);

  if (!validationResult.success) {
    // Throw an error or return a result object to be handled by the UI.
    throw new Error('Invalid journal entry data.', { cause: validationResult.error });
  }

  const validatedData = validationResult.data;

  // 4. Perform the Supabase operation with validated data.
  const { error } = await supabase
    .from('journal_entries')
    .insert({
      user_id: userId,
      content: validatedData.content,
      mood: validatedData.mood,
    });

  if (error) {
    // Handle potential errors from Supabase.
    throw new Error('Failed to create journal entry.', { cause: error });
  }
}
```

## 4. Part 2: Interacting with the Specialized AI Backend

The Python (FastAPI) backend serves a single purpose: to act as a secure proxy to third-party AI services.

### 4.1. Authentication Flow

All requests to the AI backend **MUST** be authenticated using a JWT from the user's current Supabase session.

1.  **Get Token:** Before making a request, retrieve the `access_token` from the active Supabase session.
2.  **Send Token:** Include this token in the `Authorization` header of the request, prefixed with `Bearer `.

### 4.2. Recommended Pattern: Dedicated AI API Client

To ensure consistency, create a dedicated API client for the AI backend. This client should be configured to automatically include the `Authorization` header.

#### Example: `aiApiClient` using `fetch`

```typescript
// lib/aiApiClient.ts
import { supabase } from './supabase';

const AI_BACKEND_URL = process.env.EXPO_PUBLIC_AI_BACKEND_URL; // From environment variables

async function getAuthHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("No active session found. User must be logged in.");
  }
  return `Bearer ${session.access_token}`;
}

export const aiApiClient = {
  post: async <T>(endpoint: string, body: unknown): Promise<T> => {
    const response = await fetch(`${AI_BACKEND_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': await getAuthHeader(),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})); // Gracefully handle non-JSON error responses
      throw new Error(errorData.detail || `HTTP error! Status: ${response.status}`);
    }
    
    return response.json() as Promise<T>;
  },
  // You can add other methods like get, put, etc. if needed.
};

```

### 4.3. Code Implementation Example (Frontend)

Using the `aiApiClient` to call the AI summarization endpoint.

```typescript
// services/aiService.ts
import { aiApiClient } from '@/lib/aiApiClient';

interface SummarizeResponse {
  // Define the expected shape of the AI's response
  summary: string;
}

export async function summarizeJournal(text: string) {
  try {
    const response = await aiApiClient.post<SummarizeResponse>('/api/summarize', {
      text,
    });
    console.log('Summary received:', response.summary);
    return response;
  } catch (error) {
    console.error('Error summarizing journal:', error.message);
    // Show an error message to the user.
    throw error;
  }
}
```

## 5. Part 3: Advanced - Supabase Edge Functions

For business logic that is too complex for RLS or should not run on the client, use **Supabase Edge Functions**.

*   **Use Cases:** Third-party API integrations (e.g., sending an email), complex data mutations, or operations requiring elevated privileges.
*   **Security:** Edge Functions can be invoked with the user's authentication context, allowing you to perform secure server-side actions on their behalf.
*   **Implementation:** Functions are written in TypeScript and deployed via the Supabase CLI.

#### Example: Invoking an Edge Function

```typescript
// Calling a function named 'process-data'
const { data, error } = await supabase.functions.invoke('process-data', {
  body: { somePayload: 'value' },
});

if (error) {
  // Handle error
}
```

## 6. Standardized Error Responses

Consistent error handling is key. Be prepared to handle errors from both Supabase and the AI backend.

*   **Supabase Client Error (`PostgrestError`):**
    *   **Structure:** `{ "message": "...", "details": "...", "hint": "...", "code": "..." }`
    *   **Handling:** Always check for the `error` object in the response from any Supabase query.

*   **AI Backend Error:**
    *   **401 Unauthorized:** `Status: 401`, `Body: { "detail": "Invalid token" }`
    *   **422 Unprocessable Entity (Validation Error):** `Status: 422`, `Body: { "detail": [...] }`
    *   **500 Internal Server Error:** `Status: 500`, `Body: { "error": "An unexpected error occurred." }`PRD V1: Archie
1. Introduction
Product Name: Archie
Vision: To empower individuals to consciously reshape their reality by transforming their language. Archie is a digital sanctuary and AI-powered guide that helps users move from a vocabulary of limitation to a language of possibility.
Objective: To launch a cross-platform mobile application (using Expo) that allows users to record their thoughts via voice, receive AI-powered assistance in reframing their language, track their mindset transformation, and cultivate a more self-authored life.
2. User Personas & Stories
Target User Summary: The target user is interested in self-improvement, mindfulness, and positive psychology. They believe in the power of words to shape their experience of life and are looking for a practical, engaging, and private tool for daily personal growth.
Primary User Stories:
"As a new user, I want a simple and inspiring setup process that helps me define my core beliefs."
"As a user, I want to easily record my thoughts using just my voice."
"As a user, I want the app to help me identify my limiting words and suggest more empowering alternatives from my personal lexicon."
"As a user, I want to receive an encouraging summary of my thoughts that reinforces my new perspective."
"As a user, I want a dashboard that visualizes my progress and shows my consistency to keep me motivated."
"As a user, I want to be able to review, add, and manage my personal list of word-swaps (my Lexicon)."
"As a user, I want to add the app to my home screen for easy access."
3. Features & Functionality (The Core Task Breakdown)
Here is the full project breakdown, organized into epics and tasks. (✅ = Implemented in provided files, ⏳ = To be implemented/wired up)

Epic 1: Project Setup & Core Structure

✅ Task 1.1: Initialize Expo project with TypeScript, Expo Router, and necessary dependencies (package.json).
✅ Task 1.2: Configure app.json with app name, icons, splash screen, and plugins.
✅ Task 1.3: Set up root layout (app/_layout.tsx) to handle font loading and global navigation structure.
✅ Task 1.4: Implement tab-based navigation (app/(tabs)/_layout.tsx) for the main app sections.
✅ Task 1.5: Set up Supabase project for authentication and database storage.
✅ Task 1.6: Set up the specialized Python/FastAPI backend project and configure for deployment on Google Cloud Run.

Epic 2: Onboarding & The Blueprint (New Feature)

✅ Task 2.1: Build the Aspirational Onboarding screen (pre-login).
✅ Task 2.2: Implement user authentication with Supabase Auth (e.g., magic link or social logins).
✅ Task 2.3: Build the UI for AI-Assisted Principle Definition (e.g., a multi-select list of principles).
✅ Task 2.4: Build the interactive (swipeable card) UI for the initial Lexicon setup.
✅ Task 2.5: Implement the logic to save the user's chosen Principles and Lexicon words to the Supabase database.

Epic 3: The Core Loop - Workshop & Reframing

✅ Task 3.1: Implement the "Workshop" home screen UI (app/(tabs)/index.tsx), including the pulsing orb animation.
✅ Task 3.2: Implement voice recording functionality using expo-av.
✅ Task 3.3: Implement the "Reframe" screen UI (app/reframe.tsx) with areas for the transcript and AI summary.
✅ Task 3.4: Integrate ElevenLabs for Speech-to-Text transcription. The frontend sends audio via the Python backend using `scribe_v1` model and receives the transcript.
✅ Task 3.5: Connect the interactive reframing logic on the Reframe screen to the user's actual Lexicon data from Supabase.
✅ Task 3.6: Integrate the AI backend for generating the "Guide's Reflection." The frontend will send the final reframed text and receive the AI-generated summary.
✅ Task 3.7: Implement logic to save the completed session (transcript, reframes, summary) to the Supabase database.
✅ Task 3.8: **[PHASE 2 READY]** ElevenLabs Text-to-Speech integration complete - AI follow-up synthesis with `scribe_v1` model available via `/api/speech/synthesize` endpoint.

Epic 4: The Toolkit - Lexicon Management

✅ Task 4.1: Implement the "Lexicon" screen UI (app/(tabs)/lexicon.tsx) with a list of word pairs and stat cards.
✅ Task 4.2: Connect the Lexicon screen to Supabase to display the user's actual word pairs and calculate stats (frequency, total transformations).
✅ Task 4.3: Build the "Add New Word Pair" modal/screen.
✅ Task 4.4: Implement the logic to save new/edited word pairs to Supabase.
Epic 5: The Progress - Dashboard & Gamification

✅ Task 5.1: Implement the "Dashboard" screen UI (app/(tabs)/dashboard.tsx) with cards for metrics, a weekly chart, insights, and achievements.
✅ Task 5.2: Connect the Dashboard to Supabase to pull and display real user data (Day Streak, Weekly Duration, Reframing Rate).
✅ Task 5.3: Implement the backend logic to calculate and store user achievements based on their activity.
✅ Task 5.4: Implement the "Insight Engine" on the backend to generate simple, rule-based insights based on user data.
Epic 6: The Guide - Settings & Support

✅ Task 6.1: Implement the "Guide" (Settings) screen UI (app/(tabs)/guide.tsx) with categorized settings and an upgrade banner.
✅ Task 6.2: Implement the "Upgrade" flow by integrating RevenueCat and linking to a paywall screen.
✅ Task 6.3: Implement user sign-out functionality.
✅ Task 6.4: Connect the "App Info" section to display dynamic data (e.g., total sessions from Supabase).

Epic 7: The Reflection - Entry Analysis & Insights

✅ Task 7.1: Create the "analyze-entry" Supabase Edge Function for comprehensive journal entry analysis.
✅ Task 7.2: Implement AI-powered analysis using Google Gemini with the "Super System Prompt" for empathetic guidance.
✅ Task 7.3: Build the enhanced "Entries" screen UI (app/(tabs)/entries.tsx) with journal entry list and analysis functionality.
✅ Task 7.4: Integrate the analysis API client method in aiApiClient.ts to communicate with the Edge Function.
✅ Task 7.5: Implement the analysis modal with structured display of mood, themes, people, lexicon words, and actionable insights.

4. Future Considerations (Out of Scope for V1)
Auditory Reprogrammer: A "Sonic Weaver" feature that generates personalized audio sessions with binaural beats and subtle repetitions of the user's "New Words."
Advanced AI Insights: Move beyond simple stats to complex pattern recognition (e.g., "We notice your mood improves on days you reframe words related to your career.").
Community Features: Allow users to anonymously share their most effective word swaps, creating a "Community Lexicon" for inspiration.
Push Notifications: Send motivational prompts or reminders based on user-set preferences.
Data Export: Allow users to download their entire journal history as a CSV or JSON file.

# Project Rules: Backend Interaction & API Guidelines

## 1. Goal

This document outlines the **mandatory** rules and procedures for interacting with backend services (Supabase and the specialized AI backend) from "Archie" mobile application. The primary goals are to ensure **security**, **consistency**, and **maintainability** by standardizing how authentication, data validation, and backend requests are handled. Adherence to these guidelines is critical for preventing security vulnerabilities and ensuring predictable app behavior.

**All new backend interactions MUST follow these guidelines without exception.**

## 2. Core Principles

*   **Security First:** Authentication and data integrity are non-negotiable. All backend interactions must be properly secured. This is primarily achieved through Supabase's built-in features (Auth, RLS) and JWT validation in the AI backend.
*   **Consistency:** Use the established clients and patterns for all backend communication. This makes the codebase easier to read, debug, and maintain.
*   **Leverage Utilities:** Utilize the centrally configured `supabase` client (`lib/supabase.ts`) for all BaaS operations and create a dedicated, reusable client for interacting with the AI backend. Do not instantiate clients on-the-fly in components.
*   **Clear Separation:** Keep data-fetching and business logic separate from UI components. Use custom hooks or service files to encapsulate interactions with Supabase and the AI backend.

## 3. Part 1: Interacting with Supabase (BaaS)

Supabase is our primary backend for database, authentication, and storage. All interactions MUST follow the principles of the "BaaS First" architecture.

### 3.1. The Singleton Supabase Client

All Supabase operations **MUST** use the single, pre-configured client instance exported from `lib/supabase.ts`. This client is configured with a secure storage adapter and handles session persistence and token refreshing automatically.

**DO NOT create new `createClient()` instances elsewhere in the application.**

### 3.2. Authentication & Authorization via Row Level Security (RLS)

In our architecture, authorization is not handled in middleware on a custom server. Instead, it is enforced directly in the database using **PostgreSQL's Row Level Security (RLS)**.

*   **Authentication:** The Supabase client automatically includes the logged-in user's authentication token with every request.
*   **Authorization:** RLS policies on your database tables use the user's ID (`auth.uid()`) from the token to determine which rows they are allowed to access or modify.

**Rule:** Every table containing user-specific or sensitive data **MUST** have RLS enabled and have policies defined for `SELECT`, `INSERT`, `UPDATE`, and `DELETE` operations.

#### Example: RLS Policy for a `journal_entries` table

This policy ensures that a user can only interact with their own journal entries.

```sql
-- 1. Enable RLS on the table
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

-- 2. Create a policy that allows users to SELECT their own entries
CREATE POLICY "Users can view their own journal entries."
ON public.journal_entries FOR SELECT
USING (auth.uid() = user_id);

-- 3. Create a policy that allows users to INSERT entries for themselves
CREATE POLICY "Users can create their own journal entries."
ON public.journal_entries FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

### 3.3. Client-Side Data Validation

To ensure data integrity, request data **MUST** be validated on the client-side **before** being sent to Supabase. We use `zod` for this purpose.

#### Example: Creating a Journal Entry with Validation

```typescript
// services/journalService.ts
import { supabase } from '@/lib/supabase';
import { z } from 'zod';

// 1. Define the validation schema for the request data.
const journalEntrySchema = z.object({
  content: z.string().min(10, 'Entry must be at least 10 characters long.'),
  mood: z.enum(['happy', 'sad', 'neutral']),
});

// 2. Define the service function.
export async function createJournalEntry(userId: string, entryData: unknown) {
  // 3. Validate the input data.
  const validationResult = journalEntrySchema.safeParse(entryData);

  if (!validationResult.success) {
    // Throw an error or return a result object to be handled by the UI.
    throw new Error('Invalid journal entry data.', { cause: validationResult.error });
  }

  const validatedData = validationResult.data;

  // 4. Perform the Supabase operation with validated data.
  const { error } = await supabase
    .from('journal_entries')
    .insert({
      user_id: userId,
      content: validatedData.content,
      mood: validatedData.mood,
    });

  if (error) {
    // Handle potential errors from Supabase.
    throw new Error('Failed to create journal entry.', { cause: error });
  }
}
```

## 4. Part 2: Interacting with the Specialized AI Backend

The Python (FastAPI) backend serves a single purpose: to act as a secure proxy to third-party AI services.

### 4.1. Authentication Flow

All requests to the AI backend **MUST** be authenticated using a JWT from the user's current Supabase session.

1.  **Get Token:** Before making a request, retrieve the `access_token` from the active Supabase session.
2.  **Send Token:** Include this token in the `Authorization` header of the request, prefixed with `Bearer `.

### 4.2. Recommended Pattern: Dedicated AI API Client

To ensure consistency, create a dedicated API client for the AI backend. This client should be configured to automatically include the `Authorization` header.

#### Example: `aiApiClient` using `fetch`

```typescript
// lib/aiApiClient.ts
import { supabase } from './supabase';

const AI_BACKEND_URL = process.env.EXPO_PUBLIC_AI_BACKEND_URL; // From environment variables

async function getAuthHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("No active session found. User must be logged in.");
  }
  return `Bearer ${session.access_token}`;
}

export const aiApiClient = {
  post: async <T>(endpoint: string, body: unknown): Promise<T> => {
    const response = await fetch(`${AI_BACKEND_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': await getAuthHeader(),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})); // Gracefully handle non-JSON error responses
      throw new Error(errorData.detail || `HTTP error! Status: ${response.status}`);
    }
    
    return response.json() as Promise<T>;
  },
  // You can add other methods like get, put, etc. if needed.
};

```

### 4.3. Code Implementation Example (Frontend)

Using the `aiApiClient` to call the AI summarization endpoint.

```typescript
// services/aiService.ts
import { aiApiClient } from '@/lib/aiApiClient';

interface SummarizeResponse {
  // Define the expected shape of the AI's response
  summary: string;
}

export async function summarizeJournal(text: string) {
  try {
    const response = await aiApiClient.post<SummarizeResponse>('/api/summarize', {
      text,
    });
    console.log('Summary received:', response.summary);
    return response;
  } catch (error) {
    console.error('Error summarizing journal:', error.message);
    // Show an error message to the user.
    throw error;
  }
}
```

## 5. Part 3: Advanced - Supabase Edge Functions

For business logic that is too complex for RLS or should not run on the client, use **Supabase Edge Functions**.

*   **Use Cases:** Third-party API integrations (e.g., sending an email), complex data mutations, or operations requiring elevated privileges.
*   **Security:** Edge Functions can be invoked with the user's authentication context, allowing you to perform secure server-side actions on their behalf.
*   **Implementation:** Functions are written in TypeScript and deployed via the Supabase CLI.

#### Example: Invoking an Edge Function

```typescript
// Calling a function named 'process-data'
const { data, error } = await supabase.functions.invoke('process-data', {
  body: { somePayload: 'value' },
});

if (error) {
  // Handle error
}
```

## 6. Standardized Error Responses

Consistent error handling is key. Be prepared to handle errors from both Supabase and the AI backend.

*   **Supabase Client Error (`PostgrestError`):**
    *   **Structure:** `{ "message": "...", "details": "...", "hint": "...", "code": "..." }`
    *   **Handling:** Always check for the `error` object in the response from any Supabase query.

*   **AI Backend Error:**
    *   **401 Unauthorized:** `Status: 401`, `Body: { "detail": "Invalid token" }`
    *   **422 Unprocessable Entity (Validation Error):** `Status: 422`, `Body: { "detail": [...] }`
    *   **500 Internal Server Error:** `Status: 500`, `Body: { "error": "An unexpected error occurred." }`