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
   * Creates a user profile record in the user_profiles table
   * Links the profile to the authenticated user via user_id
   * @param userId - The UUID of the authenticated user from Supabase Auth
   * @param name - The user's full name
   * @param userEmail - The user's email address
   */
  const createUserProfile = async (userId: string, name: string, userEmail: string) => {
    logger.info('Creating user profile', { userId, name, email: userEmail });
    
    try {
      const { error } = await supabase
        .from('user_profiles')
        .insert({
          id: userId, // Primary key matches auth.users.id
          user_id: userId, // Foreign key reference to auth.users.id
          full_name: name.trim(),
          email: userEmail,
          onboarding_completed: false,
        });

      if (error) {
        logger.error('Failed to create user profile', { 
          userId, 
          error: error.message,
          errorCode: error.code 
        });
        throw error;
      }

      logger.info('User profile created successfully', { userId, name });
    } catch (error) {
      logger.error('Unexpected error creating user profile', { userId, error });
      throw error;
    }
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
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
      });

      if (error) {
        logger.error('Email sign-up auth error', { email, error: error.message });
        Alert.alert('Sign Up Error', error.message);
        return;
      }

      // Step 2: Create user profile if auth was successful
      if (data.user) {
        try {
          await createUserProfile(data.user.id, fullName, email.trim());
          
          if (data.session) {
            logger.info('Email sign-up successful with immediate session');
            router.replace('/(onboarding)/principles' as any);
          } else {
            logger.info('Email verification required, profile created');
            Alert.alert(
              'Check your email!', 
              'We have sent you a confirmation link to complete your registration. Your profile has been created and will be ready when you verify your email.'
            );
            router.push('/(auth)/login' as any);
          }
        } catch (profileError) {
          logger.error('Failed to create user profile during signup', { 
            userId: data.user.id, 
            error: profileError 
          });
          
          // Clean up auth user if profile creation fails
          await supabase.auth.signOut();
          
          Alert.alert(
            'Registration Error', 
            'There was an issue setting up your profile. Please try again.'
          );
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
        path: 'auth/callback',
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
          logger.info('OAuth completed successfully');
          // The callback will handle profile creation if needed
        } else {
          logger.info('OAuth was cancelled or failed', { resultType: result.type });
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