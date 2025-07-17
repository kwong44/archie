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
  birthday: string | null;
  gender: string | null;
  onboarding_completed: boolean;
  onboarding_completed_at: string | null;
  welcome_seen: boolean;
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

  /**
   * Updates the full_name for a given user.
   * @param userId - The ID of the user to update.
   * @param fullName - The new full name for the user.
   */
  static async updateUserProfileName(userId: string, fullName: string) {
    logger.info('Updating user full_name in user_profiles', { userId, fullName });

    const { error } = await supabase
      .from('user_profiles')
      .update({ full_name: fullName.trim() })
      .eq('id', userId);

    if (error) {
      logger.error('Failed to update user full_name', { userId, error });
      throw error;
    }

    logger.info('User full_name updated successfully', { userId });
  }

  /**
   * Updates the birthday for a given user.
   * @param userId - The ID of the user to update.
   * @param birthday - The birthday in YYYY-MM-DD format.
   */
  static async updateUserBirthday(userId: string, birthday: string) {
    logger.info('Updating user birthday in user_profiles', { userId, birthday });

    const { error } = await supabase
      .from('user_profiles')
      .update({ birthday })
      .eq('id', userId);

    if (error) {
      logger.error('Failed to update user birthday', { userId, error });
      throw error;
    }

    logger.info('User birthday updated successfully', { userId });
  }

  /**
   * Updates the gender for a given user.
   * @param userId - The ID of the user to update.
   * @param gender - The user's gender.
   */
  static async updateUserGender(userId: string, gender: string) {
    logger.info('Updating user gender in user_profiles', { userId, gender });

    const { error } = await supabase
      .from('user_profiles')
      .update({ gender })
      .eq('id', userId);

    if (error) {
      logger.error('Failed to update user gender', { userId, error });
      throw error;
    }

    logger.info('User gender updated successfully', { userId });
  }

  /**
   * Determines the next onboarding step based on user profile completion
   * This ensures users are routed to the correct onboarding screen
   * @returns Promise<string> - The route path for the next onboarding step
   */
  static async getNextOnboardingStep(): Promise<string> {
    logger.info('Determining next onboarding step for user');
    
    try {
      const profile = await this.getCurrentUserProfile();
      
      if (!profile) {
        // This can happen if the profile creation trigger is slow
        // A user without a profile is definitely new.
        logger.info('No profile found, directing to welcome step');
        return '/(onboarding)/welcome';
      }

      // Step 0: Check if the user has seen the welcome screen yet
      if (!profile.welcome_seen) {
        logger.info('Welcome screen not seen, directing to welcome');
        return '/(onboarding)/welcome';
      }

      // Check onboarding completion status first
      if (profile.onboarding_completed) {
        logger.info('Onboarding already completed, directing to main app');
        return '/(tabs)';
      }

      // Step 1: Check if name is missing
      if (!profile.full_name?.trim()) {
        logger.info('Name missing, directing to name step');
        return '/(onboarding)/name';
      }

      // Step 2: Check if birthday is missing
      if (!profile.birthday) {
        logger.info('Birthday missing, directing to birthday step');
        return '/(onboarding)/birthday';
      }

      // Step 3: Check if gender is missing
      if (!profile.gender) {
        logger.info('Gender missing, directing to gender step');
        return '/(onboarding)/gender';
      }

      // Step 4: Check if principles are missing (check user_principles table)
      const { data: principles, error: principlesError } = await supabase
        .from('user_principles')
        .select('*')
        .eq('user_id', profile.user_id)
        .limit(1);

      if (principlesError) {
        logger.error('Error checking principles', { error: principlesError });
        // If we can't check principles, assume they need to set them
        return '/(onboarding)/principles';
      }

      if (!principles || principles.length === 0) {
        logger.info('Principles missing, directing to principles step');
        return '/(onboarding)/principles';
      }

      // Step 5: Check if lexicon setup is missing (check lexicon_words table)
      const { data: lexicon, error: lexiconError } = await supabase
        .from('lexicon_words')
        .select('*')
        .eq('user_id', profile.user_id)
        .limit(1);

      if (lexiconError) {
        logger.error('Error checking lexicon', { error: lexiconError });
        // If we can't check lexicon, assume they need to set it up
        return '/(onboarding)/lexicon-setup';
      }

      if (!lexicon || lexicon.length === 0) {
        logger.info('Lexicon missing, directing to lexicon setup step');
        return '/(onboarding)/lexicon-setup';
      }

      // All steps completed, but onboarding_completed flag not set
      // Mark as completed and direct to main app
      logger.info('All onboarding steps completed, marking as done and directing to main app');
      await this.updateUserProfile({ 
        onboarding_completed: true, 
        onboarding_completed_at: new Date().toISOString() 
      });
      
      return '/(tabs)';

    } catch (error) {
      logger.error('Error determining next onboarding step', { error });
      // Fallback to welcome step if there's any error, as it's the safest entry point
      return '/(onboarding)/welcome';
    }
  }

  /**
   * Marks the welcome screen as seen for the current user.
   * This is called after the user proceeds from the welcome screen.
   */
  static async markWelcomeAsSeen(): Promise<void> {
    logger.info('Marking welcome screen as seen for current user');
    
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user?.id) {
        logger.error('No authenticated user for marking welcome as seen');
        throw new Error('Authentication required');
      }
      
      const userId = session.user.id;
      
      const { error } = await supabase
        .from('user_profiles')
        .update({ welcome_seen: true })
        .eq('user_id', userId);
        
      if (error) {
        logger.error('Failed to mark welcome as seen', { userId, error });
        throw new Error('Failed to update profile');
      }
      
      logger.info('Welcome screen marked as seen successfully', { userId });
    } catch (error) {
      logger.error('Unexpected error marking welcome as seen', { error });
      throw error;
    }
  }
} 