import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { logger } from '../../lib/logger';
import { UserService } from '@/services/userService';

/**
 * WelcomeScreen Component
 * This is the first screen the user sees after a successful sign-up and verification.
 * It presents a congratulatory message and prompts the user to begin the onboarding process.
 * The design is based on a user-provided screenshot with a distinct light theme.
 */
export default function WelcomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  /**
   * Handles the continue button press.
   * Marks the welcome screen as seen and navigates to the name entry screen.
   */
  const handleContinue = async () => {
    setLoading(true);
    logger.info('User continuing from welcome screen to name setup.');

    try {
      await UserService.markWelcomeAsSeen();
      router.replace('/(onboarding)/name' as any);
    } catch (error) {
      logger.error('Failed to mark welcome as seen', { error });
      Alert.alert(
        'Error', 
        'Could not proceed with onboarding. Please try again.',
        [{ text: 'OK' }]
      );
      setLoading(false);
    }
    // No need to set loading to false on success, as we are navigating away
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainContent}>
        <Text style={styles.congratsText}>Your journey begins</Text>
        <Text style={styles.nowText}>now</Text>
      </View>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.button} onPress={handleContinue} activeOpacity={0.8} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#1F2937" />
          ) : (
            <Text style={styles.buttonText}>Let's get to know you</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#A7F3D0',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  congratsText: {
    fontSize: 36,
    fontFamily: 'Inter-Regular',
    color: '#6D28D9',
    textAlign: 'center',
  },
  nowText: {
    alignSelf: 'flex-end',
    fontSize: 100,
    fontFamily: 'Inter-Bold',
    color: '#6D28D9',
    lineHeight: 160,
    textAlign: 'right',
    marginTop: -50,
    justifyContent: 'flex-end',
  },
  footer: {
    justifyContent: 'flex-end',
  },
  button: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: '#1F2937',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
}); 