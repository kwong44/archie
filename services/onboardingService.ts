import { supabase } from '@/lib/supabase';
import { z } from 'zod';

/**
 * Validation schemas for onboarding data
 */
const principleSchema = z.object({
  id: z.string().uuid(),
  principle: z.string().min(10, 'Principle must be at least 10 characters'),
  selected_at: z.string().datetime(),
});

const wordPairSchema = z.object({
  id: z.string().uuid(),
  old_word: z.string().min(1, 'Old word is required'),
  new_word: z.string().min(1, 'New word is required'),
  description: z.string().optional(),
  selected_at: z.string().datetime(),
});

// Type definitions
export interface UserPrinciple {
  id: string;
  principle: string;
  selected_at: string;
}

export interface UserWordPair {
  id: string;
  old_word: string;
  new_word: string;
  description?: string;
  selected_at: string;
}

/**
 * OnboardingService
 * Handles saving and retrieving onboarding data including principles and lexicon word pairs
 * Follows the BaaS First architecture using Supabase directly
 */
export class OnboardingService {
  /**
   * Saves user-selected principles to the database
   * Creates entries in the user_principles table with proper validation
   * 
   * @param userId - The authenticated user's ID
   * @param principles - Array of principle strings selected by the user
   * @returns Promise resolving to saved principle records
   */
  static async savePrinciples(
    userId: string,
    principles: string[]
  ): Promise<UserPrinciple[]> {
    console.log('💾 Saving user principles to database', { userId, count: principles.length });

    try {
      // Validate input data
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      if (!principles.length) {
        throw new Error('At least one principle must be provided');
      }

      // Prepare data for insertion
      const principleRecords = principles.map(principle => ({
        user_id: userId,
        principle,
        selected_at: new Date().toISOString(),
      }));

      console.log('📝 Inserting principle records:', principleRecords);

      // Insert principles into Supabase
      const { data, error } = await supabase
        .from('user_principles')
        .insert(principleRecords)
        .select('id, principle, selected_at');

      if (error) {
        console.error('❌ Failed to save principles:', error);
        throw new Error(`Failed to save principles: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data returned from principles insert');
      }

      console.log('✅ Principles saved successfully:', data);
      return data;

    } catch (error) {
      console.error('❌ Error saving principles:', error);
      throw error;
    }
  }

  /**
   * Saves user-selected lexicon word pairs to the database
   * Creates entries in the user_lexicon table with proper validation
   * 
   * @param userId - The authenticated user's ID
   * @param wordPairs - Array of word pair objects selected by the user
   * @returns Promise resolving to saved word pair records
   */
  static async saveWordPairs(
    userId: string,
    wordPairs: Array<{
      id: string;
      oldWord: string;
      newWord: string;
      description?: string;
    }>
  ): Promise<UserWordPair[]> {
    console.log('💾 Saving user word pairs to database', { userId, count: wordPairs.length });

    try {
      // Validate input data
      if (!userId) {
        throw new Error('User ID is required');
      }
      
      if (!wordPairs.length) {
        console.log('⚠️ No word pairs to save, skipping database operation');
        return [];
      }

      // Prepare data for insertion
      const wordPairRecords = wordPairs.map(pair => ({
        user_id: userId,
        old_word: pair.oldWord.toLowerCase().trim(),
        new_word: pair.newWord.toLowerCase().trim(),
        description: pair.description || null,
        selected_at: new Date().toISOString(),
      }));

      console.log('📝 Inserting word pair records:', wordPairRecords);

      // Insert word pairs into Supabase
      const { data, error } = await supabase
        .from('user_lexicon')
        .insert(wordPairRecords)
        .select('id, old_word, new_word, description, selected_at');

      if (error) {
        console.error('❌ Failed to save word pairs:', error);
        throw new Error(`Failed to save word pairs: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data returned from word pairs insert');
      }

      console.log('✅ Word pairs saved successfully:', data);
      return data;

    } catch (error) {
      console.error('❌ Error saving word pairs:', error);
      throw error;
    }
  }

  /**
   * Retrieves user's saved principles from the database
   * 
   * @param userId - The authenticated user's ID
   * @returns Promise resolving to array of user principles
   */
  static async getUserPrinciples(userId: string): Promise<UserPrinciple[]> {
    console.log('📖 Fetching user principles from database', { userId });

    try {
      const { data, error } = await supabase
        .from('user_principles')
        .select('id, principle, selected_at')
        .eq('user_id', userId)
        .order('selected_at', { ascending: true });

      if (error) {
        console.error('❌ Failed to fetch principles:', error);
        throw new Error(`Failed to fetch principles: ${error.message}`);
      }

      console.log('✅ Principles fetched successfully:', data?.length || 0);
      return data || [];

    } catch (error) {
      console.error('❌ Error fetching principles:', error);
      throw error;
    }
  }

  /**
   * Retrieves user's saved lexicon word pairs from the database
   * 
   * @param userId - The authenticated user's ID
   * @returns Promise resolving to array of user word pairs
   */
  static async getUserWordPairs(userId: string): Promise<UserWordPair[]> {
    console.log('📖 Fetching user word pairs from database', { userId });

    try {
      const { data, error } = await supabase
        .from('user_lexicon')
        .select('id, old_word, new_word, description, selected_at')
        .eq('user_id', userId)
        .order('selected_at', { ascending: true });

      if (error) {
        console.error('❌ Failed to fetch word pairs:', error);
        throw new Error(`Failed to fetch word pairs: ${error.message}`);
      }

      console.log('✅ Word pairs fetched successfully:', data?.length || 0);
      return data || [];

    } catch (error) {
      console.error('❌ Error fetching word pairs:', error);
      throw error;
    }
  }

  /**
   * Completes the onboarding process by saving both principles and word pairs
   * This is a convenience method for the final onboarding step
   * 
   * @param userId - The authenticated user's ID
   * @param principles - Array of selected principle strings
   * @param wordPairs - Array of selected word pair objects
   * @returns Promise resolving to completion status
   */
  static async completeOnboarding(
    userId: string,
    principles: string[],
    wordPairs: Array<{
      id: string;
      oldWord: string;
      newWord: string;
      description?: string;
    }>
  ): Promise<{ success: boolean; principleCount: number; wordPairCount: number }> {
    console.log('🎯 Completing onboarding process', { 
      userId, 
      principleCount: principles.length, 
      wordPairCount: wordPairs.length 
    });

    try {
      // Save principles and word pairs in parallel for better performance
      const [savedPrinciples, savedWordPairs] = await Promise.all([
        this.savePrinciples(userId, principles),
        this.saveWordPairs(userId, wordPairs),
      ]);

      // Update user's onboarding status
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ 
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('❌ Failed to update onboarding status:', updateError);
        // Don't throw here as the core data was saved successfully
      }

      console.log('🎉 Onboarding completed successfully', {
        principleCount: savedPrinciples.length,
        wordPairCount: savedWordPairs.length
      });

      return {
        success: true,
        principleCount: savedPrinciples.length,
        wordPairCount: savedWordPairs.length,
      };

    } catch (error) {
      console.error('❌ Error completing onboarding:', error);
      throw error;
    }
  }
} 