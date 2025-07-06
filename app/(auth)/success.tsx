import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle, ArrowRight } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
import { finishOAuth } from '@/lib/finishOAuth';

/**
 * SuccessScreen Component
 * Displays a success message after email verification
 * Handles the email confirmation flow and redirects users appropriately
 * Follows the dark theme design system with proper branding
 */
export default function SuccessScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('Initializing...');

  useEffect(() => {
    /**
     * Handles the OAuth callback and email verification process
     * Checks if the user's session is established after OAuth
     * Logs the verification status and handles appropriate redirects
     */
    const handleOAuthCallback = async () => {
      logger.info('OAuth callback success page loaded');
      setDebugInfo('Starting OAuth callback verification...');
      
      try {
        // 1️⃣ Attempt to establish a session from the deep-link parameters.
        const initialUrl = await Linking.getInitialURL();
        logger.debug('Initial URL on success screen', { initialUrl });

        if (initialUrl && (initialUrl.includes('access_token') || initialUrl.includes('code='))) {
          try {
            const redirectUrl = makeRedirectUri({ scheme: 'archie', path: 'success' });
            setDebugInfo('Processing tokens from callback URL...');
            await finishOAuth(initialUrl, redirectUrl);
            logger.info('Session established via finishOAuth');
          } catch (tokenErr) {
            logger.warn('finishOAuth could not establish session', { error: String(tokenErr) });
          }
        }

        // 2️⃣ Wait a moment for Supabase client to persist session (esp. SecureStore)
        setDebugInfo('Waiting for session to persist...');
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Try multiple times to get the session as it might take time to establish
        let session = null;
        let attempts = 0;
        const maxAttempts = 5;
        
        while (!session && attempts < maxAttempts) {
          logger.info(`Attempting to get session (attempt ${attempts + 1}/${maxAttempts})`);
          setDebugInfo(`Checking session... (attempt ${attempts + 1}/${maxAttempts})`);
          
          const { data: { session: currentSession }, error } = await supabase.auth.getSession();
          
          if (error) {
            logger.error('Error getting session during OAuth callback', { error: error.message, attempt: attempts + 1 });
            setDebugInfo(`Error getting session: ${error.message}`);
          } else if (currentSession) {
            session = currentSession;
            logger.info('Session found successfully', { 
              userId: session.user.id, 
              email: session.user.email,
              attempt: attempts + 1
            });
            setDebugInfo(`Session found! User: ${session.user.email}`);
            break;
          } else {
            logger.info('No session found yet, retrying...', { attempt: attempts + 1 });
            setDebugInfo(`No session found yet, retrying in 1 second...`);
          }
          
          attempts++;
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        if (session?.user) {
          logger.info('OAuth callback successful', { 
            userId: session.user.id, 
            email: session.user.email,
            emailConfirmed: session.user.email_confirmed_at 
          });
          
          setIsVerified(true);
          setIsLoading(false);
          setDebugInfo('Success! Redirecting to onboarding...');
          
          // Auto-redirect to onboarding after a brief delay
          setTimeout(() => {
            logger.info('Redirecting to onboarding after OAuth success');
            router.replace('/(onboarding)/principles' as any);
          }, 2000);
        } else {
          logger.warn('No session found after OAuth callback attempts', { attempts });
          setError('Session not established. Please try signing in again.');
          setDebugInfo(`No session found after ${attempts} attempts`);
          setIsLoading(false);
        }
      } catch (error) {
        logger.error('Unexpected error during OAuth callback', { error });
        setError('An unexpected error occurred. Please try signing in again.');
        setDebugInfo(`Unexpected error: ${error}`);
        setIsLoading(false);
      }
    };

    handleOAuthCallback();
  }, [router]);

  /**
   * Handles the continue button press
   * Redirects users to the appropriate screen based on verification status
   */
  const handleContinue = () => {
    if (isVerified) {
      logger.info('User manually continuing to onboarding from success page');
      router.replace('/(onboarding)/principles' as any);
    } else {
      logger.info('User redirected to login from success page');
      router.replace('/(auth)/login' as any);
    }
  };

  /**
   * Handles the sign in button press for error cases
   * Redirects users back to the login screen
   */
  const handleSignIn = () => {
    logger.info('User redirected to login from success page error state');
    router.replace('/(auth)/login' as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            {isLoading ? (
              <ActivityIndicator size="large" color="#FFC300" />
            ) : isVerified ? (
              <CheckCircle color="#10B981" size={48} strokeWidth={1.5} />
            ) : (
              <Text style={styles.errorIcon}>⚠️</Text>
            )}
          </View>
          
          <Text style={styles.title}>
            {isLoading ? 'Verifying...' : isVerified ? 'Welcome to Archie!' : 'Verification Issue'}
          </Text>
          
          <Text style={styles.subtitle}>
            {isLoading 
              ? 'We\'re confirming your email address...' 
              : isVerified 
                ? 'Your email has been verified successfully. You\'ll be redirected to complete your setup in a moment.'
                : error || 'There was an issue with email verification.'
            }
          </Text>

          {/* Debug Information (only show during loading) */}
          {isLoading && (
            <Text style={styles.debugInfo}>
              {debugInfo}
            </Text>
          )}
        </View>

        {/* Action Section */}
        <View style={styles.actionContainer}>
          {!isLoading && (
            <>
              {isVerified ? (
                <>
                  <TouchableOpacity 
                    style={styles.continueButton} 
                    onPress={handleContinue}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.continueButtonText}>Continue Setup</Text>
                    <ArrowRight color="#121820" size={20} strokeWidth={2} />
                  </TouchableOpacity>
                  
                  <Text style={styles.autoRedirectText}>
                    Redirecting automatically in a few seconds...
                  </Text>
                </>
              ) : (
                <>
                  <TouchableOpacity 
                    style={styles.signInButton} 
                    onPress={handleSignIn}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.signInButtonText}>Go to Sign In</Text>
                  </TouchableOpacity>
                  
                  <Text style={styles.helpText}>
                    If you continue to have issues, please contact support
                  </Text>
                </>
              )}
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121820', // Primary background
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1F2937', // Component background
    borderWidth: 1,
    borderColor: '#374151', // Border color
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  errorIcon: {
    fontSize: 32,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#F5F5F0', // Primary text
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF', // Secondary text
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  debugInfo: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#FFC300', // Accent color for debug info
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
  },
  actionContainer: {
    width: '100%',
    alignItems: 'center',
  },
  continueButton: {
    backgroundColor: '#FFC300', // Primary accent
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    width: '100%',
  },
  continueButtonText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#121820', // Primary background for contrast
    marginRight: 8,
  },
  signInButton: {
    backgroundColor: '#1F2937', // Component background
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderWidth: 1,
    borderColor: '#374151', // Border color
    marginBottom: 16,
    width: '100%',
  },
  signInButtonText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#F5F5F0', // Primary text
    textAlign: 'center',
  },
  autoRedirectText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF', // Secondary text
    textAlign: 'center',
  },
  helpText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF', // Secondary text
    textAlign: 'center',
    paddingHorizontal: 20,
  },
}); 