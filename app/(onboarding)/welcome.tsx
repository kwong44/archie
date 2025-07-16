import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { logger } from '../../lib/logger';

/**
 * WelcomeScreen Component
 * This is the first screen the user sees after a successful sign-up and verification.
 * It presents a congratulatory message and prompts the user to begin the onboarding process.
 * The design is based on a user-provided screenshot with a distinct light theme.
 */
export default function WelcomeScreen() {
  const router = useRouter();

  /**
   * Handles the continue button press.
   * Navigates the user to the next step in the onboarding flow (principles setup).
   */
  const handleContinue = () => {
    logger.info('User continuing from welcome screen to principles setup.');
    router.replace('/(onboarding)/principles');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainContent}>
        <Text style={styles.congratsText}>congrats you are</Text>
        <Text style={styles.inText}>in</Text>
      </View>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.button} onPress={handleContinue} activeOpacity={0.8}>
          <Text style={styles.buttonText}>let's make pillowtalk yours</Text>
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
  inText: {
    fontSize: 150,
    fontFamily: 'Inter-Bold',
    color: '#6D28D9',
    lineHeight: 160,
    textAlign: 'center',
    marginTop: -20,
  },
  footer: {
    justifyContent: 'flex-end',
  },
  button: {
    backgroundColor: '#F3F4F6',
    borderRadius: 30,
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
    textTransform: 'lowercase',
  },
}); 