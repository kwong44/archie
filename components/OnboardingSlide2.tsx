import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { DarkSkiaArt } from './DarkSkiaArt';

/**
 * Word pairs used for the interactive reframing demonstration.
 * These examples show users how language transformation works in practice.
 * (rule: Comment Everything)
 */
const wordPairs = [
  { before: 'Doing', after: 'Experimenting' },
  { before: 'Problem', after: 'Challenge' },
  { before: 'Failure', after: 'Lesson' },
];

/**
 * OnboardingSlide2 Component
 * Demonstrates the power of language reframing through interactive word pairs.
 * Features a dynamic Skia art background and tappable word transformations.
 * (rule: Modular Architecture)
 * (rule: TypeScript Everywhere)
 */
export const OnboardingSlide2: React.FC = () => {
  // State to cycle through different word pair examples
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  /**
   * Handles the tap interaction to cycle through word pairs.
   * Loops back to the beginning when reaching the end of the array.
   * (rule: Comment Everything - explain the "why")
   */
  const handlePress = (): void => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % wordPairs.length);
  };

  // Get the current word pair for display
  const currentWords = wordPairs[currentIndex];

  return (
    <View style={styles.container}>
      {/* Dynamic DarkSkia art background - provides unique visual identity for this slide */}
      <View style={styles.skiaContainer}>
        <DarkSkiaArt id="onboarding_power_slide" />
      </View>

      {/* Overlay content positioned above the Skia background */}
      <View style={styles.content}>
        {/* Main headline explaining the concept */}
        <Text style={styles.title}>Your Words Shape Your World</Text>
        
        {/* Supporting explanation text */}
        <Text style={styles.subtitle}>
          The language you use influences your perception and can physically rewire your brain's pathways over time.
        </Text>

        {/* Interactive word transformation demonstration */}
        <TouchableOpacity 
          style={styles.interactiveWrapper} 
          onPress={handlePress} 
          activeOpacity={0.7}
          accessibilityLabel={`Tap to see word reframing examples. Currently showing ${currentWords.before} becomes ${currentWords.after}`}
        >
          <Text style={styles.interactiveInstructions}>Tap to reframe:</Text>
          
          {/* Word pair display with visual transformation indicator */}
          <View style={styles.wordContainer}>
            <Text style={styles.wordBefore}>{currentWords.before}</Text>
            <Text style={styles.arrow}>→</Text>
            <Text style={styles.wordAfter}>{currentWords.after}</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

/**
 * Styles for OnboardingSlide2 component.
 * Follows UI guidelines for colors, typography, and spacing.
 * (rule: Styling Standards)
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 24,
  },
  skiaContainer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    overflow: 'hidden', // Ensures Skia canvas respects border radius
  },
  content: {
    width: '100%',
    alignItems: 'flex-start', // Left-align content
    justifyContent: 'center',
    flex: 1,
    marginTop: 0,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Inter-Bold',
    color: '#F5F5F0', // Primary text color
    textAlign: 'left',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 19,
    fontFamily: 'Inter-Regular',
    color: '#F5F5F0', // Primary text color
    textAlign: 'left',
    lineHeight: 26,
    marginBottom: 40,
  },
  interactiveWrapper: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)', // Semi-transparent component background
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#374151', // Border color
    width: '100%',
  },
  interactiveInstructions: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF', // Secondary text color
    textAlign: 'center',
    marginBottom: 16,
  },
  wordContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  wordBefore: {
    fontSize: 22,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF', // Secondary text color
    textDecorationLine: 'line-through', // Visual indication of "old" word
  },
  arrow: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: '#F5F5F0', // Primary text color
  },
  wordAfter: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: '#A7F3D0', // Success green - indicates positive transformation
  },
}); 