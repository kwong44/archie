// types/ai.ts
// Centralised TypeScript types for AI-related responses and requests.
// Follow project rule: TypeScript First & Modular Architecture.

/** Actionable insight returned by analysis agents */
export interface ActionableInsight {
  reflection_prompt: string;
  action_suggestion?: {
    title: string;
    description: string;
  };
}

/** Response structure from new agentic analyze-entry edge function */
export interface AnalyzeEntryResponse {
  entry_breakdown: string;
  mood: string[];
  people: string[];
  identified_themes: string[];
  actionable_insight: ActionableInsight;
  processing_time_ms: number;
  lexicon_words_identified: Array<{
    old: string;
    new: string;
    context?: string;
  }>;
}

/** Request sent from the client to analyze a journal entry */
export interface AnalyzeEntryRequest {
  journal_session_id: string;
}
