import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * OnboardingSlide1 Component
 * Displays the main app branding and core features overview.
 * This is the first slide in the onboarding carousel, introducing users to Archie.
 * (rule: Modular Architecture)
 * (rule: Comment Everything)
 * (rule: TypeScript Everywhere)
 */
export const OnboardingSlide1: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Header Section: Contains the app title and subtitle */}
      <View style={styles.header}>
        <Text style={styles.title}>Meet Archie</Text>
        <Text style={styles.subtitle}>
          Your personal guide to becoming the architect of your own reality
        </Text>
      </View>

      {/* Features Section: Highlights the core functionalities of the app */}
      <View style={styles.featuresContainer}>
        {/* Feature 1: Voice Journaling */}
        <View style={styles.feature}>
          <Text style={styles.featureIcon}>🎙️</Text>
          <Text style={styles.featureText}>Voice-powered journaling</Text>
        </View>
        
        {/* Feature 2: AI Reframing */}
        <View style={styles.feature}>
          <Text style={styles.featureIcon}>✨</Text>
          <Text style={styles.featureText}>AI-guided reframing</Text>
        </View>
        
        {/* Feature 3: Progress Tracking */}
        <View style={styles.feature}>
          <Text style={styles.featureIcon}>📈</Text>
          <Text style={styles.featureText}>Track your transformation</Text>
        </View>
      </View>
    </View>
  );
};

/**
 * Styles for the OnboardingSlide1 component.
 * Follows the UI guidelines for colors, typography, and spacing.
 * (rule: Styling Standards)
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#374151', // Border color
  },
  header: {
    alignItems: 'flex-start', // Fixed from 'left' to proper FlexAlignType
    marginTop: 60,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Inter-Bold',
    color: '#F5F5F0', // Primary text color
    textAlign: 'left',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 17,
    fontFamily: 'Inter-Regular',
    color: '#F5F5F0', // Primary text color
    textAlign: 'left',
    lineHeight: 26,
  },
  featuresContainer: {
    gap: 10,
    marginVertical: 40,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937', // Component background color
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#374151', // Border color
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  featureText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#F5F5F0', // Primary text color
    flex: 1,
  },
}); 