import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import PagerView from 'react-native-pager-view';
import { OnboardingSlide1 } from './OnboardingSlide1';
import { OnboardingSlide2 } from './OnboardingSlide2';
import { OnboardingSlide3 } from './OnboardingSlide3';
import { logger } from '../lib/logger';

// Get device width for proper slide sizing
const { width } = Dimensions.get('window');

/**
 * OnboardingCarousel Component
 * A multi-slide onboarding experience with automatic transitions.
 * Features smooth paging and demonstrates app features and concepts.
 * (rule: Modular Architecture)
 * (rule: Comment Everything)
 * (rule: TypeScript Everywhere)
 */
export default function OnboardingCarousel(): React.ReactElement {
  // Reference to the PagerView for programmatic control
  const pagerRef = useRef<PagerView>(null);
  
  // State to track current slide index
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  
  const TOTAL_SLIDES = 3; // Updated to include OnboardingSlide3

  /**
   * Handles manual page selection when user swipes.
   * Updates state to sync with user interaction.
   * (rule: Comment Everything - explain manual override behavior)
   */
  const handlePageSelected = (event: any): void => {
    const selectedPage = event.nativeEvent.position;
    
    logger.info('User manually selected slide', { 
      selectedPage,
      previousSlide: currentSlide 
    });
    
    setCurrentSlide(selectedPage);
  };

  return (
    <View style={styles.container}>
      {/* PagerView provides smooth horizontal paging between slides */}
      <PagerView
        ref={pagerRef}
        style={styles.pagerView}
        initialPage={0}
        onPageSelected={handlePageSelected}
        scrollEnabled={true} // Allow manual swiping
      >
        {/* Slide 1: App introduction and feature overview */}
        <View key="slide1" style={styles.slide}>
          <OnboardingSlide1 />
        </View>

        {/* Slide 2: Language reframing demonstration */}
        <View key="slide2" style={styles.slide}>
          <OnboardingSlide2 />
        </View>

        {/* Slide 3: Affirmation and welcome message */}
        <View key="slide3" style={styles.slide}>
          <OnboardingSlide3 />
        </View>
      </PagerView>

      {/* Slide indicators to show current position */}
      <View style={styles.indicatorContainer}>
        {Array.from({ length: TOTAL_SLIDES }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.indicator,
              index === currentSlide && styles.activeIndicator
            ]}
          />
        ))}
      </View>
    </View>
  );
}

/**
 * Styles for the OnboardingCarousel component.
 * Ensures full-screen slides and proper indicator positioning.
 * (rule: Styling Standards)
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  pagerView: {
    flex: 1,
    width: '100%',
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#374151', // Border color for inactive indicators
  },
  activeIndicator: {
    backgroundColor: '#FFC300', // Primary accent color for active indicator
    width: 24, // Elongated active indicator
  },
}); 