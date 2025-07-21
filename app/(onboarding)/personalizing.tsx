import React, { useEffect, useState, useMemo } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { UserService } from '@/services/userService';
import { createContextLogger } from '@/lib/logger';
import { SkiaArt } from '@/components/SkiaArt'; // Generative art (rule: ui-guidelines)

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

  /**
   * Pre-compute positions & sizes for decorative SkiaArt shapes.
   * Shapes now use deterministic positions + smaller sizes to keep
   * the layout consistent across screen mounts (rule: Performance, UI-Guidelines).
   */
  const artShapes = useMemo(() => {
    /**
     * Pre-defined positions ensure visual stability instead of random placement.
     * All coordinates are within the 240×240 visual container.
     */
    const PREDEFINED_POSITIONS: Array<{ top: number; left: number }> = [
      { top: 10, left: 10 },
      { top: 40, left: 160 },
      { top: 100, left: 40 },
      { top: 150, left: 140 },
      { top: 70, left: 90 },
    ];

    // Smaller, varied sizes (40-60 px) compared to previous 60-100 px.
    const SIZES = [40, 48, 36, 52, 44];

    const shapes = PREDEFINED_POSITIONS.map((pos, index) => ({
      size: SIZES[index],
      ...pos,
      // Alternate shape type for subtle variety, yet deterministic
      isCircle: index % 2 === 0,
    }));

    screenLogger.debug('Prepared deterministic SkiaArt shapes', { shapes });
    return shapes;
  }, []);

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
      {/* Inner wrapper ensures consistent horizontal padding */}
      <View style={styles.innerContainer}>
        {/* Title */}
        <Text style={styles.title}>{`Welcome to Archie, ${displayName}!`}</Text>

        {/* Decorative generative art cluster */}
        <View style={styles.visualContainer}>
          {artShapes.map((shape, index) => (
            <View
              // eslint-disable-next-line react/no-array-index-key
              key={index}
              style={[
                styles.artWrapper,
                {
                  top: shape.top,
                  left: shape.left,
                  width: shape.size,
                  height: shape.size,
                  borderRadius: shape.isCircle ? shape.size / 2 : 12,
                },
              ]}
            >
              <SkiaArt id={`personalizing_${index}`} />
            </View>
          ))}

          {isPersonalizing && (
            <ActivityIndicator
              style={styles.activityIndicator}
              size="large"
              color={ACCENT_PRIMARY}
            />
          )}
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

       
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_PRIMARY,
  },
  /** Matches ReminderSetupScreen layout */
  innerContainer: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 32,
    color: TEXT_PRIMARY,
    marginTop: 20,
    lineHeight: 38,
    textAlign: 'center', // Centered like ReminderSetup header (rule: ui-guidelines)
  },
  visualContainer: {
    alignSelf: 'center',
    width: 240,
    height: 240,
    position: 'relative',
  },
  artWrapper: {
    position: 'absolute',
    overflow: 'hidden',
  },
  activityIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -12,
    marginTop: -12,
  },
  button: {
    backgroundColor: '#F5F5F0',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    alignSelf: 'stretch', // stretches within padded container
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
}); 