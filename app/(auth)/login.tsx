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
        Alert.alert('Google Sign In Error', error.message);
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
      Alert.alert('Error', 'Failed to sign in with Google. Please try again.');
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
            editable={!loading && !googleLoading}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#6B7280"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading && !googleLoading}
          />
        </View>

        <View style={styles.buttonContainer}>
          {/* Email Sign In Button */}
          <TouchableOpacity 
            style={styles.button} 
            onPress={signInWithEmail} 
            disabled={loading || googleLoading}
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

          {/* Navigate to Sign Up */}
          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]} 
            onPress={() => router.push('/(auth)/signup' as any)} 
            disabled={loading || googleLoading}
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
}); 