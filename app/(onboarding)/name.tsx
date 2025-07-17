import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput,
  Keyboard,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { logger } from '../../lib/logger';
import { useAuth } from '../../context/AuthContext';
import { UserService } from '../../services/userService';
import { ArrowRight } from 'lucide-react-native';
import { SkiaArt } from '../../components/SkiaArt';

/**
 * NameScreen Component
 * This screen prompts the user to enter their name as part of the onboarding process.
 * It features a progress bar, a prominent title, an animated character,
 * a text input field, and navigation to the next step.
 * The keyboard is automatically focused on screen load for a seamless user experience.
 */
export default function NameScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const textInputRef = useRef<TextInput>(null);

  /**
   * Focus the text input when the component mounts.
   */
  useEffect(() => {
    // Adding a slight delay to ensure the screen is fully transitioned
    // and the keyboard can be shown.
    const timer = setTimeout(() => {
      textInputRef.current?.focus();
    }, 500);

    return () => clearTimeout(timer);
  }, []);
  
  /**
   * Handles the continue button press.
   * Updates the user's profile with the entered name and navigates to the next screen.
   */
  const handleContinue = async () => {
    if (!name.trim()) {
      Alert.alert("Name Required", "Please enter what you'd like to be called.");
      return;
    }

    if (!session?.user) {
        Alert.alert("Error", "No user session found. Please restart the app.");
        logger.error('No user found on name screen');
        return;
    }

    setLoading(true);
    const userId = session.user.id;
    logger.info("User proceeding from name screen.", { userId, name });

    try {
      await UserService.updateUserProfileName(userId, name.trim());
      logger.info("User name updated successfully.", { userId });
      // Navigate to the next step in onboarding - birthday screen using push to allow back navigation
      router.push('/(onboarding)/birthday' as any);
    } catch (error) {
      logger.error('Failed to update user name', { userId, error });
      Alert.alert("Error", "Could not save your name. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Log every time the name changes so we can visually debug seed changes
   * in the SkiaArt component. (Rule: Logging)
   */
  useEffect(() => {
    logger.debug('SkiaArt seed updated', { seed: name });
  }, [name]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Progress bar row matching design: track with fill, progress text, skip */}
      <View style={styles.progressContainer}>
        {/* Grey track background */}
        <View style={styles.progressTrack}>
          {/* Green fill representing current progress */}
          <View style={styles.progressFill} />
        </View>

        {/* Current step text */}
        <Text style={styles.progressText}>1/5</Text>

        {/* Skip button */}
        <TouchableOpacity onPress={() => router.push('/(onboarding)/birthday' as any)}>
          <Text style={styles.skipText}>skip</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mainContent}>
        <Text style={styles.title}>What should Archie call you?</Text>
        
        {/* Dynamic generative art seeded by the user's input */}
        <View style={styles.skiaArtContainer}>
          {/* Fallback seed ensures deterministic art before the user types */}
          <SkiaArt id={name || 'name_placeholder'} />
        </View>

        <TextInput
          ref={textInputRef}
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder=""
          placeholderTextColor="#6B7280"
          textAlign="center"
          autoCapitalize="words"
          onSubmitEditing={handleContinue}
        />
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.nextButton} onPress={handleContinue} disabled={loading || !name.trim()}>
          {loading ? (
            <ActivityIndicator color="#121820" />
          ) : (
            <ArrowRight color="#121820" size={28} />
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121820',
    paddingHorizontal: 20,
  },
  progressContainer: {
    flexDirection: 'row', // Horizontal layout
    alignItems: 'center', // Vertical centering
    marginTop: 10,
    marginBottom: 20,
    marginLeft: 40, // Offset to match layout where a back button would occupy space
  },
  progressTrack: {
    flex: 1, // Take up remaining space
    height: 4,
    backgroundColor: '#374151', // Grey background track
    borderRadius: 2,
    overflow: 'hidden', // Ensure fill stays within track
    marginRight: 8, // Space between track and text
  },
  progressFill: {
    height: '100%',
    width: '20%', // 20% progress (1/5)
    backgroundColor: '#A7F3D0', // Green fill
  },
  progressText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#F5F5F0',
    marginRight: 16,
  },
  skipText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#9CA3AF',
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start', // Start from top to showcase art & prompt
    paddingTop: 40,
    paddingBottom: 0,
  },
  title: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 28,
    color: '#F5F5F0',
    textAlign: 'center',
    marginBottom: 40,
  },
  skiaArtContainer: {
    width: 200,
    height: 150,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 40,
    // Attempt to give the container a slightly diagonal feel – this creates
    // a subtle dynamic edge without resorting to complex clipping masks.
    transform: [{ rotate: '-5deg' }],
  },
  input: {
    fontFamily: 'Inter-Bold',
    fontSize: 36,
    color: '#F5F5F0',
    borderBottomWidth: 2,
    borderColor: '#374151',
    width: '90%',
    textAlign: 'center',
    paddingBottom: 8,
  },
  footer: {
    paddingBottom: 20,
    alignItems: 'flex-end',
  },
  nextButton: {
    backgroundColor: '#F5F5F0',
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#374151',
  }
}); 