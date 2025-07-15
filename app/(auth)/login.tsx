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
import * as AppleAuthentication from 'expo-apple-authentication';

/**
 * LoginScreen Component
 * Provides user authentication through email/password and Google OAuth
 * Simplified authentication flow with only Google and Email options
 * Implements keyboard dismissal functionality for better UX
 */
export default function LoginScreen() {
  // State management for form inputs and loading states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const router = useRouter();

  /**
   * Handles email/password authentication using Supabase Auth
   * Validates inputs and provides user feedback
   */
  async function signInWithEmail() {
    console.log('🔐 Attempting email sign-in for user:', email);
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        console.error('❌ Email sign-in error:', error.message);
        Alert.alert('Sign In Error', error.message);
      } else {
        console.log('✅ Email sign-in successful');
        // Navigation handled by AuthContext
      }
    } catch (error) {
      console.error('❌ Unexpected sign-in error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Handles Google OAuth authentication using Supabase Auth
   * Uses expo-web-browser for secure OAuth flow with deep linking
   * Full-width button design with Google branding
   */
  async function signInWithGoogle() {
    console.log('🔵 Initiating Google OAuth sign-in');
    setGoogleLoading(true);
    
    try {
      const redirectUrl = makeRedirectUri({
        scheme: 'archie',
        path: 'success',
      });
      
      console.log('🔗 Using redirect URL:', redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.error('❌ Google OAuth error:', error.message);
        Alert.alert('Google Sign In Error', error.message);
        return;
      }

      if (data.url) {
        console.log('🌐 Opening OAuth URL in browser');
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        
        if (result.type === 'success') {
          console.log('✅ OAuth completed successfully', { 
            resultType: result.type,
            url: result.url 
          });
          logger.info('OAuth completed successfully from login screen', { 
            resultType: result.type,
            url: result.url 
          });

          // 👉 Exchange the auth code for a session
          try {
            await finishOAuth(result.url!, redirectUrl);
            logger.info('Session obtained after OAuth exchange');
          } catch (exchangeError) {
            console.error('❌ OAuth exchange failed:', exchangeError);
            Alert.alert('Authentication Error', 'Failed to complete sign in. Please try again.');
          }
        } else {
          console.log('❌ OAuth was cancelled or failed:', result.type);
          logger.info('OAuth was cancelled or failed from login screen', { 
            resultType: result.type,
            url: (result as any).url 
          });
        }
      }
    } catch (error) {
      console.error('❌ Unexpected Google OAuth error:', error);
      Alert.alert('Error', 'Failed to sign in with Google. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  }

  /**
   * Handles Apple Sign-In using the native flow.
   * It requests user credentials and then uses the identity token
   * to authenticate with Supabase.
   */
  async function signInWithApple() {
    logger.info('Initiating Apple OAuth sign-in');
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
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        });

        if (error) {
          Alert.alert('Error', 'Failed to sign in with Apple. Please try again.');
          logger.error('Supabase sign-in with Apple ID token error:', { error });
        } else {
          // Successful sign-in, navigation will be handled by your AuthContext
          logger.info('Successfully signed in with Apple');
        }
      } else {
        logger.warn('No identityToken found from Apple credential');
        throw new Error('No identityToken found');
      }
    } catch (e: any) {
      if (e.code === 'ERR_REQUEST_CANCELED') {
        // Handle user canceling the sign-in flow
        logger.info('User canceled Apple Sign-In.');
      } else {
        Alert.alert('Error', 'An unexpected error occurred. Please try again.');
        logger.error('Apple Sign-In error:', { error: e });
      }
    } finally {
      setAppleLoading(false);
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
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue your journey</Text>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#6B7280"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading && !googleLoading && !appleLoading}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#6B7280"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading && !googleLoading && !appleLoading}
          />
        </View>

        <View style={styles.buttonContainer}>
          {/* Email Sign In Button */}
          <TouchableOpacity 
            style={styles.button} 
            onPress={signInWithEmail} 
            disabled={loading || googleLoading || appleLoading}
          >
            {loading ? (
              <ActivityIndicator color="#121820" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Social Sign In Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign In Button - Full Width with Icon */}
          <TouchableOpacity 
            style={styles.googleButton} 
            onPress={signInWithGoogle}
            disabled={loading || googleLoading || appleLoading}
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

          {/* Apple Sign In Button */}
          {appleLoading ? (
             <ActivityIndicator color="#FFFFFF" style={styles.appleButton} />
          ) : (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
              cornerRadius={12}
              style={styles.appleButton}
              onPress={signInWithApple}
            />
          )}

          {/* Navigate to Sign Up */}
          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]} 
            onPress={() => router.push('/(auth)/signup' as any)} 
            disabled={loading || googleLoading || appleLoading}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>Create Account</Text>
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
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#374151', // Border color
  },
  secondaryButtonText: {
    color: '#F5F5F0', // Primary text color
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
  appleButton: {
    width: '100%',
    height: 50,
  },
}); 