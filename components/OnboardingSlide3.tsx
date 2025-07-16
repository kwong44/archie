import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { DarkSkiaArt } from './DarkSkiaArt';
import { AffirmationAnimation } from './AffirmationAnimation';
import { logger } from '@/lib/logger';

/**
 * OnboardingSlide3 - The Affirmation Slide Component
 * 
 * This component represents the final slide in the onboarding carousel where users
 * affirm their intention to begin their transformation journey. It features:
 * - Interactive affirmation circle that responds to user touch
 * - Dynamic content that changes after affirmation
 * - Animated background using DarkSkiaArt component
 * - Visual feedback with color and text changes
 * 
 * @returns {JSX.Element} The rendered affirmation slide component
 */
export const OnboardingSlide3: React.FC = () => {
  // State to track whether the user has affirmed their intention
  const [isAffirmed, setIsAffirmed] = useState<boolean>(false);

  /**
   * Handles the affirmation action when user taps the circle
   * Sets the affirmed state to true, triggering UI changes
   */
  const handleAffirmation = (): void => {
    logger.info('User has affirmed their intention on the onboarding slide.');
    setIsAffirmed(true);
  };

  // Dynamic content based on affirmation state
  // Changes messaging to welcome the user after they've affirmed
  const title: string = isAffirmed ? 'Welcome, Architect' : 'Your Story Awaits';
  const subtitle: string = isAffirmed
    ? 'Your journey begins now.'
    : 'Tap the circle to affirm your intention.';

  return (
    <View style={styles.container}>
      {/* 
        DarkSkiaArt provides a consistent animated background for the slide.
      */}
      <View style={styles.skiaContainer}>
        <DarkSkiaArt id={'onboarding_architect'} />
      </View>

      {/* Main content overlay positioned above the Skia background */}
      <View style={styles.content}>
        {/* Text content container for title and subtitle */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        {/* 
          Interactive affirmation circle
          - Shows empty circle before affirmation
          - Shows checkmark and changes color after affirmation
          - Uses Pressable for touch feedback
        */}
        <Pressable onPress={handleAffirmation} style={styles.pressableCircle} disabled={isAffirmed}>
          <View style={[styles.circle, styles.largeCircle, isAffirmed && styles.circleAffirmed]}>
            {isAffirmed ? (
              <AffirmationAnimation size={180} />
            ) : null}
          </View>
        </Pressable>
      </View>
    </View>
  );
};

/**
 * StyleSheet following The Architect UI Guidelines
 * Uses consistent colors, spacing, and typography from the design system
 */
const styles = StyleSheet.create({
  // Main container taking full space and centering content
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  // Skia background container positioned absolutely to fill entire slide
  skiaContainer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16, // Standard border radius from UI guidelines
    overflow: 'hidden', // Ensures background respects border radius
  },
  // Content overlay with proper spacing and layout
  content: {
    paddingHorizontal: 24, // Standard horizontal padding
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-around', // Distributes space between text and circle
    flex: 1,
  },
  // Container for title and subtitle text
  textContainer: {
    alignItems: 'center',
    marginBottom: 40, // Space between text and circle
  },
  // Main title styling using Inter-Bold font
  title: {
    fontSize: 26,
    fontFamily: 'Inter-Bold',
    color: '#F5F5F0', // text-primary from color palette
    textAlign: 'center',
    marginBottom: 12,
  },
  // Subtitle styling using Inter-Regular font
  subtitle: {
    fontSize: 17,
    fontFamily: 'Inter-Regular',
    color: '#F5F5F0', // text-primary from color palette
    textAlign: 'center',
    lineHeight: 26,
  },
  // Pressable area for the circle (larger touch target for better UX)
  pressableCircle: {
    padding: 20, // Increases touch area beyond visual circle
  },
  // Base circle styling - initially empty with border
  circle: {
    width: 100,
    height: 100,
    borderRadius: 50, // Perfect circle
    borderWidth: 2,
    borderColor: '#9CA3AF', // text-secondary from color palette
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent', // Initially transparent
  },
  // Larger size for Flower of Life to prevent clipping
  largeCircle: {
    width: 185,
    height: 185,
    borderRadius: 92.5,
  },
  // Affirmed state styling - becomes a container for the animation
  circleAffirmed: {
    borderColor: 'transparent', // Hide border to let animation shine
  },
});
