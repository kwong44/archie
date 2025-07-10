import { useState } from 'react';
import { 
  View, 
  TextInput, 
  Alert, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  TouchableWithoutFeedback,
  Keyboard 
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { logger } from '../../lib/logger';
import { finishOAuth } from '../../lib/finishOAuth';

/**
 * SignUpScreen Component
 * Provides user registration through email/password and Google OAuth
 * Simplified authentication flow with only Google and Email options
 * Implements keyboard dismissal functionality for better UX
 * Creates user profile with full name during registration
 */
export default function SignUpScreen() {
  // State management for form inputs and loading states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();

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
   * Handles email/password registration using Supabase Auth
   * Validates inputs and provides user feedback
   * Creates user profile after successful authentication
   */
  async function signUpWithEmail() {
    logger.info('Attempting email sign-up', { email, hasName: !!fullName.trim() });
    
    // Input validation
    if (!fullName.trim()) {
      Alert.alert('Name Required', 'Please enter your full name.');
      return;
    }
    
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your email address.');
      return;
    }
    
    if (!password.trim()) {
      Alert.alert('Password Required', 'Please enter a password.');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Create auth user
      const redirectUrl = makeRedirectUri({ scheme: 'archie', path: 'success' });

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (error) {
        logger.error('Email sign-up auth error', { email, error: error.message });
        Alert.alert('Sign Up Error', error.message);
        return;
      }

      // Step 2: Create user profile if auth was successful AND we have a session
      if (data.user) {
        if (data.session) {
          // ✅ We have a session → RLS allows us to update profile safely
          try {
            await updateUserProfile(data.user.id, fullName);
            logger.info('Email sign-up successful with immediate session');
            router.replace('/(onboarding)/principles' as any);
          } catch (profileError) {
            // Non-fatal: The profile row exists; only name update failed
            logger.error('Failed to update profile during signup', { 
              userId: data.user.id, 
              error: profileError 
            });
            router.replace('/(onboarding)/principles' as any);
          }
        } else {
          // ✉️ Email confirmation required → skip profile update for now
          logger.info('Email verification required, profile will be completed after confirmation');
          Alert.alert(
            'Check your email!', 
            'We have sent you a confirmation link to complete your registration. Once verified, sign in to continue.'
          );
          router.push('/(auth)/login' as any);
        }
      } else {
        logger.warn('No user data returned from sign-up');
        Alert.alert('Registration Error', 'No user data received. Please try again.');
      }
    } catch (error) {
      logger.error('Unexpected sign-up error', { email, error });
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Handles Google OAuth registration using Supabase Auth
   * Uses expo-web-browser for secure OAuth flow with deep linking
   * Full-width button design with Google branding
   * OAuth callback automatically creates user profiles with available data
   */
  async function signUpWithGoogle() {
    logger.info('Initiating Google OAuth sign-up');
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
   * Dismisses the keyboard when user taps outside input fields
   * Improves user experience on mobile devices
   */
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Your Blueprint</Text>
          <Text style={styles.subtitle}>Start your journey of transformation</Text>
        </View>

        <View style={styles.inputContainer}>
          {/* Full Name Input Field */}
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor="#6B7280"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            editable={!loading && !googleLoading}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#6B7280"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            editable={!loading && !googleLoading}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#6B7280"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            editable={!loading && !googleLoading}
          />
        </View>

        <View style={styles.buttonContainer}>
          {/* Email Sign Up Button */}
          <TouchableOpacity 
            style={styles.button} 
            onPress={signUpWithEmail} 
            disabled={loading || googleLoading}
          >
            {loading ? (
              <ActivityIndicator color="#121820" />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Social Sign Up Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign Up Button - Full Width with Icon */}
          <TouchableOpacity 
            style={styles.googleButton} 
            onPress={signUpWithGoogle}
            disabled={loading || googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color="#374151" size="small" />
            ) : (
              <View style={styles.googleButtonContent}>
                {/* Google Icon - Using G text as placeholder for actual Google icon */}
                <View style={styles.googleIcon}>
                  <Text style={styles.googleIconText}>G</Text>
                </View>
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Navigate to Sign In */}
          <TouchableOpacity 
            style={styles.linkButton} 
            onPress={() => router.push('/(auth)/login' as any)} 
            disabled={loading || googleLoading}
          >
            <Text style={styles.linkButtonText}>Already have an account? Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121820', // Primary background color
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#F5F5F0', // Primary text color
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF', // Secondary text color
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#1F2937', // Component background color
    borderColor: '#374151', // Border color
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    color: '#F5F5F0', // Primary text color
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    marginBottom: 16,
  },
  buttonContainer: {
    gap: 16,
  },
  button: {
    backgroundColor: '#FFC300', // Primary accent color
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  buttonText: {
    color: '#121820', // Dark text on light background
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  linkButton: {
    alignItems: 'center',
    padding: 8,
  },
  linkButtonText: {
    color: '#9CA3AF', // Secondary text color
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#374151', // Border color
  },
  dividerText: {
    color: '#9CA3AF', // Secondary text color
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    marginHorizontal: 16,
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
  googleIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4285F4', // Google blue
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  googleIconText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
    fontSize: 14,
  },
  googleButtonText: {
    color: '#374151', // Dark gray text on white background
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
}); 