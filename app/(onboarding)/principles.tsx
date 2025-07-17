import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { OnboardingService } from '@/services/onboardingService';

/**
 * Comprehensive collection of principles for The Architect
 * Based on "The Lexicon of Reality" philosophy of linguistic transformation
 * Covers courage, curiosity, love, growth, and conscious language use
 */
const DUMMY_PRINCIPLES = [
  // Core Language & Reality Creation
  "I create my reality with my words.",
  "Every challenge is an opportunity for growth.",
  "I am the author of my own story.",
  "I choose courage over comfort.",
  "My focus determines my reality.",
  "I speak with intention and purpose.",
  "I am resilient and can overcome any setback.",
  "I attract abundance by being grateful.",
  "I transform limitations into possibilities.",
  "My words shape my experience of life.",
  
  // Courage & Bold Action (Universe rewards courage)
  "I venture boldly into the unknown with confidence.",
  "Each fear I face expands my courage capacity.",
  "I embrace uncertainty as my pathway to growth.",
  "Bold action flows naturally from my authentic self.",
  "I pioneer new possibilities through brave choices.",
  
  // Curiosity & Experimentation (Universe loves curiosity)
  "I experiment with life rather than just 'doing' tasks.",
  "Curiosity is my compass for meaningful discovery.",
  "I explore with wonder instead of approaching with worry.",
  "Every moment offers fascinating insights to uncover.",
  "I follow my passion as my truest guide.",
  
  // Love as Fundamental Force
  "I operate from love, knowing it's the universe's foundation.",
  "Connection and compassion guide all my interactions.",
  "I see challenges as invitations to express deeper love.",
  "Unity underlies all apparent separation and conflict.",
  "I nurture what I wish to see flourish.",
  
  // Renewal & Healing (Pain as growth opportunity)
  "I renew rather than repair, strengthen rather than fix.",
  "Every setback signals an opportunity for profound renewal.",
  "I heal by returning to my natural state of wholeness.",
  "Pain reveals where love seeks fuller expression.",
  "I transform wounds into wisdom through conscious reframing.",
  
  // Neuroplasticity & Mental Rewiring
  "My brain rewires itself with each intentional word choice.",
  "I consciously program new neural pathways through language.",
  "Repetition of empowering words creates lasting change.",
  "I replace limiting thought patterns with expansive ones.",
  "My vocabulary is the code that programs my experience."
];

/**
 * PrinciplesScreen Component
 * Allows users to select core beliefs that will guide their transformation
 * Part of the onboarding flow before lexicon setup
 * Saves selected principles to Supabase
 */
export default function PrinciplesScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [selectedPrinciples, setSelectedPrinciples] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Handles the back navigation
   */
  const handleGoBack = () => {
    console.log('🔙 User navigating back from principles screen');
    router.back();
  };

  /**
   * Toggles selection of a principle
   * @param principle - The principle text to toggle
   */
  const togglePrinciple = (principle: string) => {
    console.log('🎯 Toggling principle selection:', principle);
    setSelectedPrinciples(prev => 
      prev.includes(principle) 
        ? prev.filter(p => p !== principle)
        : [...prev, principle]
    );
  };

  /**
   * Renders a single principle item with selection state
   */
  const renderItem = ({ item }: { item: string }) => {
    const isSelected = selectedPrinciples.includes(item);
    return (
      <TouchableOpacity 
        style={[styles.item, isSelected && styles.itemSelected]} 
        onPress={() => togglePrinciple(item)}
        activeOpacity={0.7}
        disabled={isSaving}
      >
        <Text style={[styles.itemText, isSelected && styles.itemTextSelected]}>
          {item}
        </Text>
      </TouchableOpacity>
    );
  };

  /**
   * Handles navigation to lexicon setup after principle selection
   * Saves principles to Supabase before proceeding
   */
  const handleContinue = async () => {
    if (!session?.user) {
      console.error('❌ No authenticated user found');
      Alert.alert('Error', 'Please log in to save your principles.');
      return;
    }

    setIsSaving(true);

    try {
      console.log('✅ Saving principles to database:', selectedPrinciples);
      
      // Save principles to Supabase using our onboarding service
      await OnboardingService.savePrinciples(session.user.id, selectedPrinciples);
      
      console.log('🎯 Principles saved successfully, navigating to lexicon setup');
      
      // Navigate to lexicon setup
      router.push('/(onboarding)/lexicon-setup' as any);
      
    } catch (error) {
      console.error('❌ Failed to save principles:', error);
      Alert.alert(
        'Save Error',
        'Failed to save your principles. Please try again.',
        [
          { text: 'Skip for now', onPress: () => router.push('/(onboarding)/lexicon-setup' as any) },
          { text: 'Retry', onPress: handleContinue },
        ]
      );
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handles skipping principle selection
   */
  const handleSkip = () => {
    Alert.alert(
      'Skip Principle Selection?',
      'You can always define your principles later in the app settings.',
      [
        { text: 'Continue Setup', style: 'cancel' },
        { 
          text: 'Skip', 
          onPress: () => {
            console.log('⏭️ User skipped principle selection');
            router.push('/(onboarding)/lexicon-setup' as any);
          }
        },
      ]
    );
  };

  const isButtonDisabled = selectedPrinciples.length < 3 || isSaving;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header with back button, progress bar, and skip */}
      <View style={styles.headerNavigation}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <ArrowLeft color="#F5F5F0" size={24} />
        </TouchableOpacity>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar} />
          <Text style={styles.progressText}>4/5</Text>
          <TouchableOpacity onPress={handleSkip} disabled={isSaving}>
            <Text style={styles.skipText}>skip</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Define Your Principles</Text>
        <Text style={styles.subtitle}>
          Select the core beliefs that will guide your transformation. Choose at least three.
        </Text>
        
        {/* Selection Counter */}
        <View style={styles.counterContainer}>
          <Text style={styles.counterText}>
            {selectedPrinciples.length} of {DUMMY_PRINCIPLES.length} selected
          </Text>
        </View>
      </View>

      {/* Principles List */}
      <FlatList
        data={DUMMY_PRINCIPLES}
        renderItem={renderItem}
        keyExtractor={(item) => item}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!isSaving}
      />

      {/* Continue Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, isButtonDisabled && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={isButtonDisabled}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator color="#121820" size="small" />
          ) : (
            <Text style={[styles.buttonText, isButtonDisabled && styles.buttonTextDisabled]}>
              Continue to Lexicon Setup
            </Text>
          )}
        </TouchableOpacity>
        
        {isButtonDisabled && !isSaving && (
          <Text style={styles.helpText}>
            Select at least {3 - selectedPrinciples.length} more principle{3 - selectedPrinciples.length !== 1 ? 's' : ''}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121820', // Primary background color
    paddingHorizontal: 20,
  },
  headerNavigation: {
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
    width: '80%', // 4/5 progress
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
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#F5F5F0', // Primary text color
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF', // Secondary text color
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  counterContainer: {
    backgroundColor: '#1F2937', // Component background color
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151', // Border color
  },
  counterText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFC300', // Primary accent color
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  item: {
    backgroundColor: '#1F2937', // Component background color
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151', // Border color
  },
  itemSelected: {
    backgroundColor: '#FFC300', // Primary accent color
    borderColor: '#FFC300',
  },
  itemText: {
    color: '#F5F5F0', // Primary text color
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    lineHeight: 22,
  },
  itemTextSelected: {
    color: '#121820', // Dark text on light background
    fontFamily: 'Inter-SemiBold',
  },
  buttonContainer: {
    padding: 20,
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#FFC300', // Primary accent color
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
    minHeight: 54,
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#374151', // Border color for disabled state
  },
  buttonText: {
    color: '#121820', // Dark text on light background
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  buttonTextDisabled: {
    color: '#9CA3AF', // Secondary text color for disabled state
  },
  helpText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280', // Tertiary text color
    textAlign: 'center',
  },
}); 