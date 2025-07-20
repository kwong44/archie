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
   * Pre-compute positions & sizes for a handful of decorative SkiaArt shapes.
   * We memoize so they remain stable across renders (rule: Performance).
   */
  const artShapes = useMemo(() => {
    const shapes = [] as Array<{
      size: number;
      top: number;
      left: number;
      isCircle: boolean;
    }>;

    // Generate 5 random shapes within a 240×240 container.
    for (let i = 0; i < 5; i += 1) {
      const size = 60 + Math.random() * 40; // 60-100 px
      shapes.push({
        size,
        top: Math.random() * (240 - size),
        left: Math.random() * (240 - size),
        isCircle: Math.random() > 0.5,
      });
    }
    screenLogger.debug('Generated SkiaArt shapes for personalizing screen', { shapes });
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