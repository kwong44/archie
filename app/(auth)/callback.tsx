import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';

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
   */
  const handleOAuthCallback = async () => {
    console.log('🔄 Processing OAuth callback with params:', params);

    try {
      // Check if we have the necessary OAuth parameters
      if (typeof params.access_token === 'string' && typeof params.refresh_token === 'string') {
        console.log('✅ OAuth tokens found, setting session');
        
        // Set the session using the tokens from the OAuth callback
        const { data, error } = await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        });

        if (error) {
          console.error('❌ Error setting OAuth session:', error.message);
          router.replace('/(auth)/login');
          return;
        }

        if (data.session) {
          console.log('✅ OAuth session established successfully');
          // Check if this is a new user (first time signing in)
          if (data.session.user?.created_at === data.session.user?.last_sign_in_at) {
            console.log('🆕 New user detected, redirecting to onboarding');
            router.replace('/(onboarding)/principles');
          } else {
            console.log('👤 Existing user, redirecting to app');
            router.replace('/(tabs)');
          }
        }
      } else if (typeof params.error === 'string') {
        console.error('❌ OAuth error received:', params.error);
        router.replace('/(auth)/login');
      } else {
        console.warn('⚠️ No valid OAuth parameters found');
        router.replace('/(auth)/login');
      }
    } catch (error) {
      console.error('❌ Unexpected error in OAuth callback:', error);
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