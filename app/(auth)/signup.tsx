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
  Keyboard,
  Platform 
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

/**
 * SignUpScreen Component
 * Provides user registration through email/password and social providers
 * Supports Google, Apple, and Facebook sign-up options
 * Implements keyboard dismissal functionality for better UX
 */
export default function SignUpScreen() {
  // State management for form inputs and loading states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const router = useRouter();

  /**
   * Handles email/password registration using Supabase Auth
   * Validates inputs and provides user feedback
   */
  async function signUpWithEmail() {
    console.log('📝 Attempting email sign-up for user:', email);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (error) {
        console.error('❌ Email sign-up error:', error.message);
        Alert.alert('Sign Up Error', error.message);
      } else if (data.session) {
        console.log('✅ Email sign-up successful with immediate session');
        router.replace('/(onboarding)/principles' as any);
      } else {
        console.log('📧 Email verification required');
        Alert.alert(
          'Check your email!', 
          'We have sent you a confirmation link to complete your registration.'
        );
        router.push('/(auth)/login' as any);
      }
    } catch (error) {
      console.error('❌ Unexpected sign-up error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Handles Google OAuth registration using Supabase Auth
   * Uses expo-web-browser for secure OAuth flow with deep linking
   */
  async function signUpWithGoogle() {
    console.log('🔵 Initiating Google OAuth sign-up');
    setSocialLoading('google');
    
    try {
      const redirectUrl = makeRedirectUri({
        scheme: 'archie',
        path: 'auth/callback',
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
        Alert.alert('Google Sign Up Error', error.message);
        return;
      }

      if (data.url) {
        console.log('🌐 Opening OAuth URL in browser');
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        
        if (result.type === 'success') {
          console.log('✅ OAuth completed successfully');
          // The callback will be handled by the deep link
        } else {
          console.log('❌ OAuth was cancelled or failed');
        }
      }
    } catch (error) {
      console.error('❌ Unexpected Google OAuth error:', error);
      Alert.alert('Error', 'Failed to sign up with Google. Please try again.');
    } finally {
      setSocialLoading(null);
    }
  }

  /**
   * Handles Apple OAuth registration using Supabase Auth
   * Available on iOS and web platforms
   */
  async function signUpWithApple() {
    console.log('🍎 Initiating Apple OAuth sign-up');
    setSocialLoading('apple');
    
    try {
      const redirectUrl = makeRedirectUri({
        scheme: 'archie',
        path: 'auth/callback',
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.error('❌ Apple OAuth error:', error.message);
        Alert.alert('Apple Sign Up Error', error.message);
        return;
      }

      if (data.url) {
        console.log('🌐 Opening Apple OAuth URL in browser');
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        
        if (result.type === 'success') {
          console.log('✅ Apple OAuth completed successfully');
          // The callback will be handled by the deep link
        } else {
          console.log('❌ Apple OAuth was cancelled or failed');
        }
      }
    } catch (error) {
      console.error('❌ Unexpected Apple OAuth error:', error);
      Alert.alert('Error', 'Failed to sign up with Apple. Please try again.');
    } finally {
      setSocialLoading(null);
    }
  }

  /**
   * Handles Facebook OAuth registration using Supabase Auth
   * Uses expo-web-browser for secure OAuth flow
   */
  async function signUpWithFacebook() {
    console.log('📘 Initiating Facebook OAuth sign-up');
    setSocialLoading('facebook');
    
    try {
      const redirectUrl = makeRedirectUri({
        scheme: 'archie',
        path: 'auth/callback',
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.error('❌ Facebook OAuth error:', error.message);
        Alert.alert('Facebook Sign Up Error', error.message);
        return;
      }

      if (data.url) {
        console.log('🌐 Opening Facebook OAuth URL in browser');
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        
        if (result.type === 'success') {
          console.log('✅ Facebook OAuth completed successfully');
          // The callback will be handled by the deep link
        } else {
          console.log('❌ Facebook OAuth was cancelled or failed');
        }
      }
    } catch (error) {
      console.error('❌ Unexpected Facebook OAuth error:', error);
      Alert.alert('Error', 'Failed to sign up with Facebook. Please try again.');
    } finally {
      setSocialLoading(null);
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
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#6B7280"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading && !socialLoading}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#6B7280"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading && !socialLoading}
          />
        </View>

        <View style={styles.buttonContainer}>
          {/* Email Sign Up Button */}
          <TouchableOpacity 
            style={styles.button} 
            onPress={signUpWithEmail} 
            disabled={loading || socialLoading !== null}
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
            <Text style={styles.dividerText}>Or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Sign Up Buttons */}
          <View style={styles.socialButtonsContainer}>
            {/* Google Sign Up */}
            <TouchableOpacity 
              style={[styles.socialButton, styles.googleButton]} 
              onPress={signUpWithGoogle}
              disabled={loading || socialLoading !== null}
            >
              {socialLoading === 'google' ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.socialButtonText}>Google</Text>
              )}
            </TouchableOpacity>

            {/* Apple Sign Up - Only show on iOS */}
            {Platform.OS === 'ios' && (
              <TouchableOpacity 
                style={[styles.socialButton, styles.appleButton]} 
                onPress={signUpWithApple}
                disabled={loading || socialLoading !== null}
              >
                {socialLoading === 'apple' ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.socialButtonText}>Apple</Text>
                )}
              </TouchableOpacity>
            )}

            {/* Facebook Sign Up */}
            <TouchableOpacity 
              style={[styles.socialButton, styles.facebookButton]} 
              onPress={signUpWithFacebook}
              disabled={loading || socialLoading !== null}
            >
              {socialLoading === 'facebook' ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.socialButtonText}>Facebook</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Navigate to Sign In */}
          <TouchableOpacity 
            style={styles.linkButton} 
            onPress={() => router.push('/(auth)/login' as any)} 
            disabled={loading || socialLoading !== null}
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
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  socialButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  socialButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
  googleButton: {
    backgroundColor: '#4285F4', // Google brand color
  },
  appleButton: {
    backgroundColor: '#000000', // Apple brand color
  },
  facebookButton: {
    backgroundColor: '#1877F2', // Facebook brand color
  },
}); 