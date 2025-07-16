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
import { makeRedirectUri } from 'expo-auth-session';
import { logger } from '../../lib/logger';

/**
 * SignUpScreen Component
 * Provides user registration through email/password only
 * Social authentication (Google/Apple) is handled on the main onboarding page
 * Implements keyboard dismissal functionality for better UX
 */
export default function SignUpScreen() {
  // State management for form inputs and loading state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  /**
   * Handles email/password registration using Supabase Auth
   * Validates inputs and provides user feedback
   */
  async function signUpWithEmail() {
    logger.info('Attempting email sign-up', { email });
    
    // Input validation
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
        },
      });

      if (error) {
        logger.error('Email sign-up auth error', { email, error: error.message });
        Alert.alert('Sign Up Error', error.message);
        return;
      }

      // Step 2: Handle session status after sign-up
      if (data.user) {
        if (data.session) {
          // ✅ We have a session → user is logged in immediately
          logger.info('Email sign-up successful with immediate session', { userId: data.user.id });
          router.replace('/(onboarding)/principles' as any);
        } else {
          // ✉️ Email confirmation required
          logger.info('Email verification required for user', { userId: data.user.id });
          Alert.alert(
            'Check your email!', 
            'We have sent you a confirmation link to complete your registration. Once verified, sign in to continue.'
          );
          router.push('/(auth)/login' as any);
        }
      } else {
        logger.warn('No user data returned from sign-up', { email });
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
   * Dismisses the keyboard when user taps outside input fields
   * Improves user experience on mobile devices
   */
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  /**
   * Navigates back to the main onboarding page
   */
  const handleGoBack = () => {
    logger.info('User navigating back to main onboarding');
    router.back();
  };

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Sign Up with Email</Text>
          <Text style={styles.subtitle}>Create your account to start your transformation</Text>
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
            autoComplete="email"
            textContentType="emailAddress"
            editable={!loading}
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
            editable={!loading}
          />
        </View>

        <View style={styles.buttonContainer}>
          {/* Email Sign Up Button */}
          <TouchableOpacity 
            style={styles.button} 
            onPress={signUpWithEmail} 
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#121820" />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Navigate back to main onboarding */}
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={handleGoBack} 
            disabled={loading}
          >
            <Text style={styles.backButtonText}>← Back to sign-up options</Text>
          </TouchableOpacity>

          {/* Navigate to Sign In */}
          <TouchableOpacity 
            style={styles.linkButton} 
            onPress={() => router.push('/(auth)/login' as any)} 
            disabled={loading}
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
    textAlign: 'center',
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
  backButton: {
    alignItems: 'center',
    padding: 8,
  },
  backButtonText: {
    color: '#4A90E2', // Secondary accent color for navigation
    fontFamily: 'Inter-Regular',
    fontSize: 14,
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
}); 