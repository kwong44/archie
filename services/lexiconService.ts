import { supabase } from '@/lib/supabase';

/**
 * Type definitions for lexicon data
 */
export interface WordPair {
  id: string;
  old_word: string;
  new_word: string;
  description?: string;
  usage_count: number;
  selected_at: string;
  created_at: string;
  updated_at: string;
}

export interface LexiconStats {
  totalWordPairs: number;
  totalTransformations: number;
  mostUsedPair?: WordPair;
  recentlyAddedPair?: WordPair;
  averageUsage: number;
}

/**
 * LexiconService
 * Handles all lexicon-related operations including fetching, creating, and updating word pairs
 * Follows the BaaS First architecture using Supabase directly
 */
export class LexiconService {
  /**
   * Retrieves all word pairs for a user from the database
   * Orders by usage count (most used first) then by creation date
   * 
   * @param userId - The authenticated user's ID
   * @returns Promise resolving to array of user word pairs
   */
  static async getUserWordPairs(userId: string): Promise<WordPair[]> {
    console.log('📖 Fetching user word pairs from database', { userId });

    try {
      const { data, error } = await supabase
        .from('user_lexicon')
        .select('*')
        .eq('user_id', userId)
        .order('usage_count', { ascending: false })
        .order('created_at', { ascending: false });

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
   * Calculates comprehensive statistics for user's lexicon
   * Includes totals, averages, and notable entries
   * 
   * @param userId - The authenticated user's ID
   * @returns Promise resolving to lexicon statistics
   */
  static async getLexiconStats(userId: string): Promise<LexiconStats> {
    console.log('📊 Calculating lexicon statistics', { userId });

    try {
      const wordPairs = await this.getUserWordPairs(userId);

      const totalWordPairs = wordPairs.length;
      const totalTransformations = wordPairs.reduce((sum, pair) => sum + pair.usage_count, 0);
      const averageUsage = totalWordPairs > 0 ? totalTransformations / totalWordPairs : 0;

      // Find most used word pair
      const mostUsedPair = wordPairs.length > 0 
        ? wordPairs.reduce((max, pair) => 
            pair.usage_count > max.usage_count ? pair : max
          )
        : undefined;

      // Find most recently added word pair
      const recentlyAddedPair = wordPairs.length > 0 
        ? wordPairs.reduce((newest, pair) => 
            new Date(pair.created_at) > new Date(newest.created_at) ? pair : newest
          )
        : undefined;

      const stats: LexiconStats = {
        totalWordPairs,
        totalTransformations,
        mostUsedPair,
        recentlyAddedPair,
        averageUsage: Math.round(averageUsage * 10) / 10, // Round to 1 decimal place
      };

      console.log('✅ Lexicon statistics calculated:', stats);
      return stats;

    } catch (error) {
      console.error('❌ Error calculating lexicon statistics:', error);
      throw error;
    }
  }

  /**
   * Adds a new word pair to the user's lexicon
   * Validates input and prevents duplicates
   * 
   * @param userId - The authenticated user's ID
   * @param oldWord - The word to be replaced
   * @param newWord - The replacement word
   * @param description - Optional description for the transformation
   * @returns Promise resolving to the created word pair
   */
  static async addWordPair(
    userId: string,
    oldWord: string,
    newWord: string,
    description?: string
  ): Promise<WordPair> {
    console.log('💾 Adding new word pair to database', { 
      userId, 
      oldWord, 
      newWord 
    });

    try {
      // Validate input
      if (!oldWord.trim() || !newWord.trim()) {
        throw new Error('Both old word and new word are required');
      }

      // Prepare data for insertion
      const wordPairData = {
        user_id: userId,
        old_word: oldWord.toLowerCase().trim(),
        new_word: newWord.toLowerCase().trim(),
        description: description?.trim() || null,
        usage_count: 0,
        selected_at: new Date().toISOString(),
      };

      console.log('📝 Inserting word pair record:', wordPairData);

      // Insert word pair into Supabase
      const { data, error } = await supabase
        .from('user_lexicon')
        .insert(wordPairData)
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to add word pair:', error);
        
        // Handle duplicate key error
        if (error.code === '23505') {
          throw new Error(`You already have a transformation for "${oldWord}"`);
        }
        
        throw new Error(`Failed to add word pair: ${error.message}`);
      }

      console.log('✅ Word pair added successfully:', data);
      return data;

    } catch (error) {
      console.error('❌ Error adding word pair:', error);
      throw error;
    }
  }

  /**
   * Updates an existing word pair in the user's lexicon
   * 
   * @param userId - The authenticated user's ID
   * @param wordPairId - The ID of the word pair to update
   * @param updates - Partial word pair data to update
   * @returns Promise resolving to the updated word pair
   */
  static async updateWordPair(
    userId: string,
    wordPairId: string,
    updates: Partial<Pick<WordPair, 'old_word' | 'new_word' | 'description'>>
  ): Promise<WordPair> {
    console.log('🔄 Updating word pair', { userId, wordPairId, updates });

    try {
      // Prepare update data
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      // Update word pair in Supabase
      const { data, error } = await supabase
        .from('user_lexicon')
        .update(updateData)
        .eq('id', wordPairId)
        .eq('user_id', userId) // Ensure user can only update their own pairs
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to update word pair:', error);
        throw new Error(`Failed to update word pair: ${error.message}`);
      }

      if (!data) {
        throw new Error('Word pair not found or access denied');
      }

      console.log('✅ Word pair updated successfully:', data);
      return data;

    } catch (error) {
      console.error('❌ Error updating word pair:', error);
      throw error;
    }
  }

  /**
   * Increments the usage count for a word pair
   * Called when a word transformation is applied in a session
   * 
   * @param userId - The authenticated user's ID
   * @param wordPairId - The ID of the word pair used
   * @returns Promise resolving to the updated word pair
   */
  static async incrementWordPairUsage(
    userId: string,
    wordPairId: string
  ): Promise<WordPair> {
    console.log('📈 Incrementing word pair usage', { userId, wordPairId });

    try {
      // Update usage count atomically
      const { data, error } = await supabase
        .rpc('increment_word_pair_usage', {
          word_pair_id: wordPairId,
          user_id: userId
        });

      if (error) {
        console.error('❌ Failed to increment usage:', error);
        throw new Error(`Failed to increment usage: ${error.message}`);
      }

      console.log('✅ Word pair usage incremented');
      
      // Fetch the updated word pair
      return await this.getWordPairById(userId, wordPairId);

    } catch (error) {
      console.error('❌ Error incrementing word pair usage:', error);
      throw error;
    }
  }

  /**
   * Retrieves a specific word pair by ID
   * 
   * @param userId - The authenticated user's ID
   * @param wordPairId - The ID of the word pair to retrieve
   * @returns Promise resolving to the word pair
   */
  static async getWordPairById(userId: string, wordPairId: string): Promise<WordPair> {
    console.log('🔍 Fetching word pair by ID', { userId, wordPairId });

    try {
      const { data, error } = await supabase
        .from('user_lexicon')
        .select('*')
        .eq('id', wordPairId)
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('❌ Failed to fetch word pair by ID:', error);
        throw new Error(`Failed to fetch word pair: ${error.message}`);
      }

      if (!data) {
        throw new Error('Word pair not found');
      }

      console.log('✅ Word pair fetched by ID:', data);
      return data;

    } catch (error) {
      console.error('❌ Error fetching word pair by ID:', error);
      throw error;
    }
  }

  /**
   * Deletes a word pair from the user's lexicon
   * 
   * @param userId - The authenticated user's ID
   * @param wordPairId - The ID of the word pair to delete
   * @returns Promise resolving to success status
   */
  static async deleteWordPair(userId: string, wordPairId: string): Promise<void> {
    console.log('🗑️ Deleting word pair', { userId, wordPairId });

    try {
      const { error } = await supabase
        .from('user_lexicon')
        .delete()
        .eq('id', wordPairId)
        .eq('user_id', userId); // Ensure user can only delete their own pairs

      if (error) {
        console.error('❌ Failed to delete word pair:', error);
        throw new Error(`Failed to delete word pair: ${error.message}`);
      }

      console.log('✅ Word pair deleted successfully');

    } catch (error) {
      console.error('❌ Error deleting word pair:', error);
      throw error;
    }
  }
} 