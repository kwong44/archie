import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { logger } from '@/lib/logger';
import { UserService } from '@/services/userService';
import { useAuth } from '@/context/AuthContext';

/**
 * Gender selection options available in the onboarding flow
 */
const GENDER_OPTIONS = [
  { value: 'man', label: 'Man' },
  { value: 'woman', label: 'Woman' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
] as const;

type GenderValue = typeof GENDER_OPTIONS[number]['value'];

/**
 * Gender selection screen component for onboarding flow
 * Allows users to select their gender identity from predefined options
 * Continues the user profile creation process after birthday selection
 */
export default function GenderScreen() {
  const { session } = useAuth();
  const [selectedGender, setSelectedGender] = useState<GenderValue | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Handles the back navigation
   */
  const handleGoBack = () => {
    logger.info('User navigating back from gender screen');
    router.back();
  };

  /**
   * Handles gender option selection
   * Updates the selected gender state for form submission
   */
  const handleGenderSelect = (gender: GenderValue): void => {
    logger.info('Gender option selected', { 
      userId: session?.user?.id, 
      selectedGender: gender 
    });
    setSelectedGender(gender);
  };

  /**
   * Handles form submission and navigation to next onboarding step
   * Updates user profile with selected gender and continues onboarding flow
   */
  const handleContinue = async (): Promise<void> => {
    if (!selectedGender) {
      logger.warn('Continue attempted without gender selection', { userId: session?.user?.id });
      Alert.alert('Selection Required', 'Please select an option to continue.');
      return;
    }

    if (!session?.user?.id) {
      logger.error('No user found during gender submission');
      Alert.alert('Error', 'User session not found. Please try logging in again.');
      return;
    }

    setIsLoading(true);

    try {
      logger.info('Submitting gender selection', { 
        userId: session.user.id, 
        gender: selectedGender 
      });

      // Update user profile with selected gender
      await UserService.updateUserGender(session.user.id, selectedGender);

      logger.info('Gender selection saved successfully', { 
        userId: session.user.id, 
        gender: selectedGender 
      });

      // Navigate to next onboarding step (principles screen)
      router.replace('/(onboarding)/principles' as any);
    } catch (error) {
      logger.error('Failed to save gender selection', { 
        userId: session.user.id, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      Alert.alert(
        'Error',
        'Unable to save your selection. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles skip functionality for users who prefer not to provide gender
   * Proceeds to next onboarding step without saving gender data
   */
  const handleSkip = (): void => {
    logger.info('Gender selection skipped', { userId: session?.user?.id });
    router.replace('/(onboarding)/principles' as any);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header with back button, progress bar, and skip */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <ArrowLeft color="#F5F5F0" size={24} />
        </TouchableOpacity>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar} />
          <Text style={styles.progressText}>3/5</Text>
          <TouchableOpacity onPress={handleSkip}>
            <Text style={styles.skipText}>skip</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        <Text style={styles.title}>
          what's your gender?
        </Text>
        <Text style={styles.subtitle}>
          this helps us personalize your experience and provide more relevant insights.
        </Text>

        {/* Gender Options */}
        <View style={styles.optionsContainer}>
          {GENDER_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionButton,
                selectedGender === option.value && styles.optionButtonSelected,
              ]}
              onPress={() => handleGenderSelect(option.value)}
              disabled={isLoading}
            >
              <Text
                style={[
                  styles.optionText,
                  selectedGender === option.value && styles.optionTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Footer with continue button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.nextButton,
            (!selectedGender || isLoading) && styles.disabledButton,
          ]}
          onPress={handleContinue}
          disabled={!selectedGender || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#121820" />
          ) : (
            <Text style={styles.nextButtonText}>next</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  progressContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  progressBar: {
    position: 'absolute',
    left: 20,
    height: 4,
    backgroundColor: '#A7F3D0',
    width: '60%', // 3/5 progress
    borderRadius: 2,
  },
  progressText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#F5F5F0',
    marginRight: 10,
  },
  skipText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#9CA3AF',
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 20,
  },
  title: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 28,
    color: '#F5F5F0',
    textAlign: 'center',
    marginBottom: 16,
    textTransform: 'lowercase',
    lineHeight: 34,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 60,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  optionsContainer: {
    width: '100%',
    gap: 16,
  },
  optionButton: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#374151',
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  optionButtonSelected: {
    backgroundColor: '#FFC300',
    borderColor: '#FFC300',
  },
  optionText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#F5F5F0',
  },
  optionTextSelected: {
    color: '#121820',
  },
  footer: {
    paddingBottom: 20,
    alignItems: 'center',
  },
  nextButton: {
    backgroundColor: '#F5F5F0',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#374151',
  },
  nextButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#121820',
    textTransform: 'lowercase',
  },
}); 