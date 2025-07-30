// supabase/functions/_shared/types.ts

/**
 * Represents a single emotion identified by the emotion-worker.
 */
export interface Emotion {
  emotion: string;
  justification: string;
}

/**
 * Standardized response format for all workers.
 */
export interface WorkerResponse<T> {
  workerName: string;
  data: T;
  error?: string;
}

// Specific response types for each worker

export type EmotionWorkerResponse = WorkerResponse<{ emotions: Emotion[] }>;

/**
 * Represents a single cognitive distortion identified by the cbt-identifier-worker.
 */
export interface CbtDistortion {
  distortion: string;
  justification: string;
  quote: string;
}

export type CbtIdentifierWorkerResponse = WorkerResponse<{ distortions: CbtDistortion[] }>;

/**
 * Represents a single reframe suggestion from the cbt-reframer-worker.
 */
export interface CbtReframe {
  original_quote: string;
  reframe: string;
  justification: string;
}

export type CbtReframerWorkerResponse = WorkerResponse<{ reframes: CbtReframe[] }>;

/**
 * Represents a single theme identified by the theme-worker.
 */
export interface Theme {
  theme: string;
  justification: string;
}

export type ThemeWorkerResponse = WorkerResponse<{ themes: Theme[] }>;
