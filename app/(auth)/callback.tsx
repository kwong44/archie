import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserService } from '../../services/userService';
import { logger } from '../../lib/logger';

/**
 * OAuth Callback Handler
 * Processes OAuth redirects from social authentication providers
 * Handles tokens and redirects users to appropriate screens
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    handleOAuthCallback();
  }, []);

  /**
   * Processes OAuth callback parameters and exchanges them for a session
   * Handles success and error cases appropriately
   * Creates user profiles for new OAuth users
   */
  const handleOAuthCallback = async () => {
    logger.info('Processing OAuth callback', { hasParams: Object.keys(params).length > 0 });

    try {
      // Check if we have the necessary OAuth parameters
      if (typeof params.access_token === 'string' && typeof params.refresh_token === 'string') {
        logger.info('OAuth tokens found, setting session');
        
        // Set the session using the tokens from the OAuth callback
        const { data, error } = await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        });

        if (error) {
          logger.error('Error setting OAuth session', { error: error.message });
          router.replace('/(auth)/login');
          return;
        }

        if (data.session?.user) {
          const user = data.session.user;
          logger.info('OAuth session established successfully', { 
            userId: user.id,
            email: user.email 
          });
          
          // Check if this is a new user (first time signing in)
          const isNewUser = user.created_at === user.last_sign_in_at;
          
          if (isNewUser) {
            logger.info('New OAuth user detected, creating profile', { userId: user.id });
            
            try {
              // Check if profile already exists (edge case handling)
              const existingProfile = await UserService.getCurrentUserProfile();
              
              if (!existingProfile) {
                // Create user profile for new OAuth user
                await UserService.createUserProfileForOAuth(
                  user.id,
                  user.email || '',
                  user.user_metadata?.full_name || user.user_metadata?.name
                );
                
                logger.info('OAuth user profile created successfully', { userId: user.id });
              } else {
                logger.info('OAuth user profile already exists', { userId: user.id });
              }
              
              router.replace('/(onboarding)/principles');
            } catch (profileError) {
              logger.error('Failed to create OAuth user profile', { 
                userId: user.id, 
                error: profileError 
              });
              
              // Continue to onboarding even if profile creation fails
              // The profile can be created later during onboarding
              router.replace('/(onboarding)/principles');
            }
          } else {
            logger.info('Existing OAuth user, redirecting to app', { userId: user.id });
            router.replace('/(tabs)');
          }
        }
      } else if (typeof params.error === 'string') {
        logger.error('OAuth error received', { error: params.error });
        router.replace('/(auth)/login');
      } else {
        logger.warn('No valid OAuth parameters found', { params });
        router.replace('/(auth)/login');
      }
    } catch (error) {
      logger.error('Unexpected error in OAuth callback', { error });
      router.replace('/(auth)/login');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#FFC300" />
        <Text style={styles.text}>Completing sign in...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121820', // Primary background color
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  text: {
    color: '#F5F5F0', // Primary text color
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
}); 