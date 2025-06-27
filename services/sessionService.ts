import { supabase } from '@/lib/supabase';
import { createContextLogger } from '@/lib/logger';
import { LexiconService } from './lexiconService';

// Create context-specific logger for session operations
const sessionLogger = createContextLogger('SessionService');

/**
 * Type definitions for journal session data
 */
export interface JournalSession {
  id: string;
  user_id: string;
  original_transcript: string;
  reframed_text?: string;
  ai_summary?: string;
  audio_url?: string;
  mood_before?: string;
  mood_after?: string;
  session_duration_seconds?: number;
  transformations_applied: TransformationApplied[];
  created_at: string;
  updated_at: string;
}

export interface TransformationApplied {
  lexicon_id: string;
  old_word: string;
  new_word: string;
  position_in_text: number;
}

export interface CreateSessionData {
  original_transcript: string;
  reframed_text?: string;
  ai_summary?: string;
  audio_url?: string;
  mood_before?: string;
  mood_after?: string;
  session_duration_seconds?: number;
  transformations_applied: TransformationApplied[];
}

/**
 * SessionService
 * Handles all journal session operations including creating, updating, and tracking transformations
 * Follows the BaaS First architecture using Supabase directly
 */
export class SessionService {
  /**
   * Creates a new journal session and tracks transformation usage
   * Updates usage counts for applied word pairs
   * 
   * @param userId - The authenticated user's ID
   * @param sessionData - The session data to save
   * @returns Promise resolving to the created session
   */
  static async createSession(
    userId: string,
    sessionData: CreateSessionData
  ): Promise<JournalSession> {
    sessionLogger.info('Creating new journal session', {
      userId,
      transcriptLength: sessionData.original_transcript.length,
      transformationsCount: sessionData.transformations_applied.length,
      hasSummary: !!sessionData.ai_summary
    });

    try {
      // Create the journal session record
      const { data: session, error: sessionError } = await supabase
        .from('journal_sessions')
        .insert({
          user_id: userId,
          original_transcript: sessionData.original_transcript,
          reframed_text: sessionData.reframed_text,
          ai_summary: sessionData.ai_summary,
          audio_url: sessionData.audio_url,
          mood_before: sessionData.mood_before,
          mood_after: sessionData.mood_after,
          session_duration_seconds: sessionData.session_duration_seconds,
          transformations_applied: sessionData.transformations_applied,
        })
        .select()
        .single();

      if (sessionError) {
        sessionLogger.error('Failed to create journal session', {
          userId,
          error: sessionError.message
        });
        throw new Error(`Failed to create session: ${sessionError.message}`);
      }

      sessionLogger.info('Journal session created successfully', {
        userId,
        sessionId: session.id
      });

      // Track transformation usage and update usage counts
      await Promise.all([
        this.trackTransformationUsage(userId, session.id, sessionData.transformations_applied),
        this.updateLexiconUsageCounts(userId, sessionData.transformations_applied)
      ]);

      return session;

    } catch (error) {
      sessionLogger.error('Error creating journal session', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Records individual transformation usage for analytics
   * Creates entries in the transformation_usage table
   * 
   * @param userId - The authenticated user's ID
   * @param sessionId - The session ID where transformations were applied
   * @param transformations - Array of transformations that were applied
   */
  private static async trackTransformationUsage(
    userId: string,
    sessionId: string,
    transformations: TransformationApplied[]
  ): Promise<void> {
    if (transformations.length === 0) {
      sessionLogger.debug('No transformations to track', { userId, sessionId });
      return;
    }

    sessionLogger.info('Tracking transformation usage', {
      userId,
      sessionId,
      transformationsCount: transformations.length
    });

    try {
      // Deduplicate transformations to prevent unique constraint violations
      // Group by session_id + lexicon_id + old_word_instance (the unique constraint)
      const uniqueTransformations = transformations.reduce((acc, transformation) => {
        const key = `${transformation.lexicon_id}_${transformation.old_word.toLowerCase()}`;
        
        // Keep the first occurrence of each unique transformation
        if (!acc.has(key)) {
          acc.set(key, transformation);
        }
        
        return acc;
      }, new Map<string, TransformationApplied>());

      const usageRecords = Array.from(uniqueTransformations.values()).map(transformation => ({
        user_id: userId,
        lexicon_id: transformation.lexicon_id,
        session_id: sessionId,
        old_word_instance: transformation.old_word.toLowerCase(),
        new_word_instance: transformation.new_word.toLowerCase(),
        context_before: `Position ${transformation.position_in_text}`,
        context_after: null,
      }));

      const { error } = await supabase
        .from('transformation_usage')
        .insert(usageRecords);

      if (error) {
        sessionLogger.error('Failed to track transformation usage', {
          userId,
          sessionId,
          error: error.message,
          errorCode: error.code
        });
        
        // Handle specific error cases gracefully
        if (error.code === '23505') {
          // Duplicate key error - log warning but don't fail the session
          sessionLogger.warn('Duplicate transformation usage record detected, skipping', {
            userId,
            sessionId
          });
        } else {
          throw new Error(`Failed to track transformations: ${error.message}`);
        }
      }

      sessionLogger.info('Transformation usage tracked successfully', {
        userId,
        sessionId,
        recordsCreated: usageRecords.length
      });

    } catch (error) {
      sessionLogger.error('Error tracking transformation usage', {
        userId,
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Updates usage counts for word pairs that were used in the session
   * Increments the usage_count field in user_lexicon table
   * 
   * @param userId - The authenticated user's ID
   * @param transformations - Array of transformations that were applied
   */
  private static async updateLexiconUsageCounts(
    userId: string,
    transformations: TransformationApplied[]
  ): Promise<void> {
    if (transformations.length === 0) {
      sessionLogger.debug('No lexicon usage counts to update', { userId });
      return;
    }

    sessionLogger.info('Updating lexicon usage counts', {
      userId,
      uniqueLexiconIds: [...new Set(transformations.map(t => t.lexicon_id))].length
    });

    try {
      // Group transformations by lexicon_id to count multiple uses
      const usageCountMap = transformations.reduce((acc, transformation) => {
        acc[transformation.lexicon_id] = (acc[transformation.lexicon_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Update each word pair's usage count
      const updatePromises = Object.entries(usageCountMap).map(([lexiconId]) =>
        LexiconService.incrementWordPairUsage(userId, lexiconId)
      );

      await Promise.all(updatePromises);

      sessionLogger.info('Lexicon usage counts updated successfully', {
        userId,
        updatedPairs: Object.keys(usageCountMap).length
      });

    } catch (error) {
      sessionLogger.error('Error updating lexicon usage counts', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Retrieves recent journal sessions for a user
   * 
   * @param userId - The authenticated user's ID
   * @param limit - Maximum number of sessions to return
   * @returns Promise resolving to array of journal sessions
   */
  static async getUserSessions(
    userId: string,
    limit: number = 10
  ): Promise<JournalSession[]> {
    sessionLogger.info('Fetching user journal sessions', { userId, limit });

    try {
      const { data, error } = await supabase
        .from('journal_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        sessionLogger.error('Failed to fetch user sessions', {
          userId,
          error: error.message
        });
        throw new Error(`Failed to fetch sessions: ${error.message}`);
      }

      sessionLogger.info('User sessions fetched successfully', {
        userId,
        sessionsCount: data?.length || 0
      });

      return data || [];

    } catch (error) {
      sessionLogger.error('Error fetching user sessions', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Gets session statistics for dashboard display
   * 
   * @param userId - The authenticated user's ID
   * @returns Promise resolving to session statistics
   */
  static async getSessionStats(userId: string): Promise<{
    totalSessions: number;
    totalTransformations: number;
    averageSessionDuration: number;
    mostRecentSession?: JournalSession;
  }> {
    sessionLogger.info('Calculating session statistics', { userId });

    try {
      const sessions = await this.getUserSessions(userId, 50); // Get more for accurate stats

      const totalSessions = sessions.length;
      const totalTransformations = sessions.reduce(
        (sum, session) => sum + (session.transformations_applied?.length || 0),
        0
      );
      
      const validDurations = sessions
        .map(s => s.session_duration_seconds)
        .filter((duration): duration is number => duration !== null && duration !== undefined);
      
      const averageSessionDuration = validDurations.length > 0
        ? Math.round(validDurations.reduce((sum, duration) => sum + duration, 0) / validDurations.length)
        : 0;

      const stats = {
        totalSessions,
        totalTransformations,
        averageSessionDuration,
        mostRecentSession: sessions[0] || undefined,
      };

      sessionLogger.info('Session statistics calculated', {
        userId,
        ...stats
      });

      return stats;

    } catch (error) {
      sessionLogger.error('Error calculating session statistics', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
} 