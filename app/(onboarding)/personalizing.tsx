import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { UserService } from '@/services/userService';
import { createContextLogger } from '@/lib/logger';

// Screen-scoped logger (rule: Logging)
const screenLogger = createContextLogger('PersonalizingScreen');

// Theme constants (rule: ui-guidelines)
const BG_PRIMARY = '#121820';
const ACCENT_PRIMARY = '#FFC300';
const TEXT_PRIMARY = '#F5F5F0';
const TEXT_SECONDARY = '#9CA3AF';

/**
 * PersonalizingScreen – simple placeholder that greets the user and shows
 * an animated personalization state.
 * Flow: Reminder-setup → Personalizing → (next screen TBD / tabs)
 */
export default function PersonalizingScreen() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string>('creator');
  const [isPersonalizing, setPersonalizing] = useState(false);

  // Fetch a friendly display name on mount (rule: Separation of Concerns)
  useEffect(() => {
    UserService.getUserDisplayName()
      .then((name) => setDisplayName(name))
      .catch((err) => screenLogger.error('Failed to get display name', { error: String(err) }));
  }, []);

  /**
   * Handles primary button press – toggles state and routes after 2s to illustrate
   * background personalization work. In real implementation we will trigger
   * actual backend personalization request.
   */
  const handlePress = () => {
    if (isPersonalizing) return; // debounce
    screenLogger.trackUserAction('personalize_get_started', 'onboarding');

    setPersonalizing(true);

    // Simulate async work then navigate to next step (placeholder)
    setTimeout(() => {
      screenLogger.info('Personalization simulated complete – navigating onwards');
      router.replace('/(onboarding)/trial-intro' as any);
    }, 2500);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Title */}
      <Text style={styles.title}>{`Welcome to Archie, ${displayName}!`}</Text>

      {/* Placeholder visual – replace with Lottie or SVG later */}
      <View style={styles.visualPlaceholder}>
        {isPersonalizing && <ActivityIndicator size="large" color={ACCENT_PRIMARY} />}
      </View>

      {/* Pagination dots mimic screenshot – static */}
      <View style={styles.dotsContainer}>
        <View style={[styles.dot, styles.dotActive]} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </View>

      {/* CTA Button */}
      <TouchableOpacity
        style={[styles.button, isPersonalizing && styles.buttonDisabled]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        {isPersonalizing ? (
          <Text style={styles.buttonText}>Personalizing your experience...</Text>
        ) : (
          <Text style={styles.buttonText}>Get started</Text>
        )}
      </TouchableOpacity>

      {/* Progress bar placeholder */}
      <View style={styles.progressBar} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_PRIMARY,
    paddingHorizontal: 24,
    justifyContent: 'space-between', // keep title top, progress bar bottom
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 32,
    color: TEXT_PRIMARY,
    marginTop: 20,
    lineHeight: 38,
  },
  visualPlaceholder: {
    alignSelf: 'center',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: TEXT_SECONDARY,
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: ACCENT_PRIMARY,
    width: 24,
  },
  button: {
    backgroundColor: ACCENT_PRIMARY,
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: BG_PRIMARY,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: TEXT_SECONDARY,
    marginBottom: 12,
    alignSelf: 'stretch',
  },
}); 