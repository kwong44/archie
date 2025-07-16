import { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  Alert,
  Linking
} from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { finishOAuth } from '../../lib/finishOAuth';
import GoogleLogoIcon from '../../components/GoogleLogoIcon';
import OnboardingCarousel from '../../components/OnboardingCarousel';

/**
 * OnboardingScreen Component
 * The main landing page that introduces users to The Architect app and handles social sign-up
 * Encourages Google and Apple sign-up with less prominent email option
 * Follows the dark theme design system with proper typography and spacing
 */
export default function OnboardingScreen() {
  const router = useRouter();
  const { session } = useAuth();
  
  // State management for social sign-up loading states
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  // Redirect authenticated users to main app
  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  /**
   * Updates the auto-generated user profile row (created by DB trigger) once we
   * have a valid session. The trigger already ensures a row with matching `id`
   * exists, so we only need to update the name (and any other metadata).
   *
   * NOTE: This is only called when `data.session` is present. If the user
   * requires email confirmation, we skip this step and handle it after the
   * first login, avoiding RLS errors when no session is active.
   * (rule: Security First)
   */
  const updateUserProfile = async (userId: string, name: string) => {
    logger.info('Updating user profile name', { userId, name });

    const { error } = await supabase
      .from('user_profiles')
      .update({ full_name: name.trim() })
      .eq('id', userId);

    if (error) {
      logger.error('Failed to update user profile name', { userId, error });
      throw error;
    }

    logger.info('User profile name updated successfully', { userId });
  };

  /**
   * Handles Google OAuth registration using Supabase Auth
   * Uses expo-web-browser for secure OAuth flow with deep linking
   * Full-width button design with Google branding
   * OAuth callback automatically creates user profiles with available data
   */
  async function signUpWithGoogle() {
    logger.info('Initiating Google OAuth sign-up from onboarding');
    setGoogleLoading(true);
    
    try {
      const redirectUrl = makeRedirectUri({
        scheme: 'archie',
        path: 'success',
      });
      
      logger.info('Using OAuth redirect URL', { redirectUrl });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        logger.error('Google OAuth error', { error: error.message });
        Alert.alert('Google Sign Up Error', error.message);
        return;
      }

      if (data.url) {
        logger.info('Opening OAuth URL in browser');
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        
        if (result.type === 'success') {
          logger.info('OAuth completed successfully', { 
            resultType: result.type,
            url: result.url 
          });

          // 👉 Exchange the auth code for a session
          try {
            await finishOAuth(result.url!, redirectUrl);
            logger.info('Session obtained after OAuth exchange');
          } catch (exchangeError) {
            logger.error('OAuth exchange failed', { exchangeError });
            Alert.alert('Authentication Error', 'Failed to complete sign up. Please try again.');
          }
        } else {
          logger.info('OAuth was cancelled or failed', { 
            resultType: result.type,
            url: (result as any).url 
          });
        }
      }
    } catch (error) {
      logger.error('Unexpected Google OAuth error', { error });
      Alert.alert('Error', 'Failed to sign up with Google. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  }

  /**
   * Handles Apple OAuth registration using Supabase Auth.
   * Uses expo-apple-authentication for the native sign-in flow.
   * On first sign-up, it attempts to update the user's profile with their full name.
   */
  async function signUpWithApple() {
    logger.info('Initiating Apple OAuth sign-up from onboarding');
    setAppleLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Check if you received the identity token
      if (credential.identityToken) {
        logger.info('Apple sign-in successful, exchanging token with Supabase.');
        // Sign in with Supabase using the identity token
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        });

        if (error) {
          Alert.alert('Error', 'Failed to sign up with Apple. Please try again.');
          logger.error('Supabase sign-in with Apple ID token error:', { error });
        } else {
          // Successful sign-in
          logger.info('Successfully signed up with Apple');
          if (credential.fullName && data.user) {
            // If user provides name during first Apple sign up, update their profile.
            // Subsequent sign ins will not return fullName.
            const { givenName, familyName } = credential.fullName;
            const name = [givenName, familyName].filter(Boolean).join(' ');
            if (name) {
              await updateUserProfile(data.user.id, name);
            }
          }
          // navigation will be handled by AuthContext listener
        }
      } else {
        logger.warn('No identityToken found from Apple credential');
        throw new Error('No identityToken found');
      }
    } catch (e: any) {
      if (e.code === 'ERR_REQUEST_CANCELED') {
        // Handle user canceling the sign-in flow
        logger.info('User canceled Apple Sign-Up.');
      } else {
        Alert.alert('Error', 'An unexpected error occurred. Please try again.');
        logger.error('Apple Sign-Up error:', { error: e });
      }
    } finally {
      setAppleLoading(false);
    }
  }

  /**
   * Navigates to email sign-up page for users who prefer email registration
   */
  const handleEmailSignup = () => {
    logger.info('User chose email sign-up option');
    router.push('/(auth)/signup' as any);
  };

  /**
   * Opens a web link and handles potential errors
   * @param {string} url - The URL to open
   */
  const openLink = (url: string) => {
    Linking.openURL(url).catch(err => {
      logger.error('Failed to open URL', { url, error: err });
      Alert.alert('Error', 'Could not open the link.');
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <OnboardingCarousel />

        <View style={styles.bottomContainer}>
          {/* Social Sign Up Section */}
          <View style={styles.signUpContainer}>
            {/* Google Sign Up Button - Full Width with Icon */}
            <TouchableOpacity 
              style={styles.googleButton} 
              onPress={signUpWithGoogle}
              disabled={googleLoading || appleLoading}
            >
              {googleLoading ? (
                <ActivityIndicator color="#374151" size="small" />
              ) : (
                <View style={styles.googleButtonContent}>
                  {/* Google Icon - Using official SVG logo */}
                  <View style={styles.googleIconContainer}>
                    <GoogleLogoIcon />
                  </View>
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Apple Sign Up Button */}
            {appleLoading ? (
              <ActivityIndicator color="#FFFFFF" style={styles.appleButton} />
            ) : (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                cornerRadius={12}
                style={styles.appleButton}
                onPress={signUpWithApple}
              />
            )}

            {/* Email Sign Up - Less Prominent */}
            <TouchableOpacity 
              style={styles.emailLinkContainer} 
              onPress={handleEmailSignup}
              disabled={googleLoading || appleLoading}
            >
              <Text style={styles.emailLinkText}>Continue with Email</Text>
            </TouchableOpacity>
          </View>
        
          {/* Terms and Privacy Policy */}
          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By tapping continue, you agree to our{' '}
              <Text style={styles.linkText} onPress={() => openLink('https://example.com/terms')}>
                Terms
              </Text>
              {' and '}
              <Text style={styles.linkText} onPress={() => openLink('https://example.com/privacy')}>
                Privacy Policy
              </Text>
            </Text>
          </View>
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
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  bottomContainer: {
    gap: 25,
  },
  signUpContainer: {
    gap: 16,
    alignItems: 'center',
  },
  // Google Button Styles - Full width with white background and icon
  googleButton: {
    backgroundColor: '#FFFFFF', // White background for Google branding
    borderWidth: 1,
    borderColor: '#DADCE0', // Light gray border similar to Google's design
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    width: '100%',
    // Subtle shadow for depth
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconContainer: {
    marginRight: 12,
  },
  googleButtonText: {
    color: '#374151', // Dark gray text on white background
    fontFamily: 'Inter-Medium',
    fontSize: 18,
  },
  appleButton: {
    width: '100%',
    height: 50,
  },
  emailLinkContainer: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  emailLinkText: {
    color: '#9CA3AF', // Secondary text color for less prominence
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  termsContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  termsText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280', // Tertiary text for legal text
    textAlign: 'center',
    lineHeight: 16,
  },
  linkText: {
    color: '#9CA3AF', // Secondary text color to make links stand out
    textDecorationLine: 'underline',
  },
}); 