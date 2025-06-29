import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

/**
 * Interface for user profile data
 * Matches the structure of the user_profiles table in Supabase
 */
export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  onboarding_completed: boolean;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * UserService class handles all user profile-related operations
 * Follows the BaaS First architecture pattern using Supabase client
 * Implements comprehensive logging and error handling
 */
export class UserService {
  /**
   * Fetches the current user's profile data from user_profiles table
   * Uses RLS (Row Level Security) to ensure users can only access their own profile
   * @returns Promise<UserProfile | null> - User profile data or null if not found
   */
  static async getCurrentUserProfile(): Promise<UserProfile | null> {
    logger.info('Fetching current user profile');
    
    try {
      // Get current authenticated user session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        logger.error('Failed to get user session', { error: sessionError });
        throw new Error('Authentication error');
      }
      
      if (!session?.user?.id) {
        logger.warn('No authenticated user found');
        return null;
      }
      
      const userId = session.user.id;
      logger.debug('Fetching profile for user', { userId });
      
      // Fetch user profile from database
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No profile found - this might happen for OAuth users who haven't completed onboarding
          logger.info('User profile not found', { userId });
          return null;
        }
        
        logger.error('Failed to fetch user profile', { 
          userId, 
          error: error.message,
          errorCode: error.code 
        });
        throw new Error('Failed to fetch user profile');
      }
      
      logger.info('User profile fetched successfully', { 
        userId, 
        hasName: !!profile.full_name,
        onboardingCompleted: profile.onboarding_completed 
      });
      
      return profile;
    } catch (error) {
      logger.error('Unexpected error fetching user profile', { error });
      throw error;
    }
  }
  
  /**
   * Gets the user's display name with fallback options
   * Tries full_name first, then email username, then default
   * @returns Promise<string> - Display name for the user
   */
  static async getUserDisplayName(): Promise<string> {
    logger.info('Getting user display name');
    
    try {
      const profile = await this.getCurrentUserProfile();
      
      if (profile?.full_name?.trim()) {
        // Extract first name from full name for friendlier greeting
        const firstName = profile.full_name.trim().split(' ')[0];
        logger.debug('Using full name for display', { firstName });
        return firstName;
      }
      
      // Fallback to email username if no full name
      if (profile?.email) {
        const emailUsername = profile.email.split('@')[0];
        logger.debug('Using email username for display', { emailUsername });
        return emailUsername;
      }
      
      // Final fallback for any edge cases
      logger.debug('Using default name - no profile data available');
      return 'Creator';
    } catch (error) {
      logger.error('Error getting user display name, using fallback', { error });
      return 'Creator';
    }
  }
  
  /**
   * Updates the user's profile information
   * @param updates - Partial profile data to update
   * @returns Promise<UserProfile> - Updated profile data
   */
  static async updateUserProfile(updates: Partial<Omit<UserProfile, 'id' | 'user_id' | 'created_at' | 'updated_at'>>): Promise<UserProfile> {
    logger.info('Updating user profile', { updates });
    
    try {
      // Get current authenticated user
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user?.id) {
        logger.error('No authenticated user for profile update');
        throw new Error('Authentication required');
      }
      
      const userId = session.user.id;
      
      // Update profile in database
      const { data: updatedProfile, error } = await supabase
        .from('user_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) {
        logger.error('Failed to update user profile', { 
          userId, 
          error: error.message,
          errorCode: error.code 
        });
        throw new Error('Failed to update profile');
      }
      
      logger.info('User profile updated successfully', { userId });
      return updatedProfile;
    } catch (error) {
      logger.error('Unexpected error updating user profile', { error });
      throw error;
    }
  }
  
  /**
   * Creates a user profile for OAuth users who don't have one yet
   * This is typically called during the OAuth callback process
   * @param userId - The user ID from Supabase Auth
   * @param email - The user's email from OAuth provider
   * @param name - Optional name from OAuth provider
   * @returns Promise<UserProfile> - Created profile data
   */
  static async createUserProfileForOAuth(
    userId: string, 
    email: string, 
    name?: string
  ): Promise<UserProfile> {
    logger.info('Creating OAuth user profile', { userId, email, hasName: !!name });
    
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .insert({
          id: userId,
          user_id: userId,
          full_name: name || null,
          email: email,
          onboarding_completed: false,
        })
        .select()
        .single();
      
      if (error) {
        logger.error('Failed to create OAuth user profile', { 
          userId, 
          error: error.message,
          errorCode: error.code 
        });
        throw new Error('Failed to create user profile');
      }
      
      logger.info('OAuth user profile created successfully', { userId });
      return profile;
    } catch (error) {
      logger.error('Unexpected error creating OAuth user profile', { userId, error });
      throw error;
    }
  }
} 