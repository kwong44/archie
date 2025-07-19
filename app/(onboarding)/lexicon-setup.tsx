import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowRight, Heart, X, ArrowLeft } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { OnboardingService } from '@/services/onboardingService';
import { supabase } from '@/lib/supabase';

const { width } = Dimensions.get('window');

interface WordPair {
  id: string;
  oldWord: string;
  newWord: string;
  description: string;
}

// Sample word pairs for initial setup
const SAMPLE_WORD_PAIRS: WordPair[] = [
  {
    id: '1',
    oldWord: 'anxious',
    newWord: 'excited',
    description: 'Transform nervous energy into anticipation'
  },
  {
    id: '2',
    oldWord: 'stressed',
    newWord: 'energized',
    description: 'Reframe pressure as motivation'
  },
  {
    id: '3',
    oldWord: 'overwhelmed',
    newWord: 'full of opportunities',
    description: 'See abundance instead of burden'
  },
  {
    id: '4',
    oldWord: 'tired',
    newWord: 'recharging',
    description: 'Honor your need for restoration'
  },
  {
    id: '5',
    oldWord: 'confused',
    newWord: 'exploring',
    description: 'Embrace uncertainty as discovery'
  },
  {
    id: '6',
    oldWord: 'failed',
    newWord: 'learned',
    description: 'Turn setbacks into growth'
  },
  {
    id: '7',
    oldWord: 'stuck',
    newWord: 'preparing',
    description: 'Trust the process of change'
  },
  {
    id: '8',
    oldWord: 'difficult',
    newWord: 'challenging',
    description: 'Embrace growth opportunities'
  },
  {
    id: '9',
    oldWord: 'worried',
    newWord: 'preparing',
    description: 'Channel concern into proactive planning'
  },
  {
    id: '10',
    oldWord: 'impossible',
    newWord: 'unprecedented',
    description: 'Transform barriers into breakthrough opportunities'
  },
  {
    id: '11',
    oldWord: 'lost',
    newWord: 'discovering',
    description: 'Trust the journey of self-exploration'
  },
  {
    id: '12',
    oldWord: 'broken',
    newWord: 'rebuilding',
    description: 'Honor the strength found in reconstruction'
  }
  
];

/**
 * LexiconSetupScreen Component
 * Interactive card interface for initial lexicon setup
 * Users can accept or reject word transformations
 * Saves accepted pairs to Supabase on completion
 */
export default function LexiconSetupScreen() {
  const router = useRouter();
  const { session, checkOnboardingStatus } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [acceptedPairs, setAcceptedPairs] = useState<WordPair[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Handles word pair selection (accept or reject)
   * Updates state and progresses through the word pairs
   */
  const handleChoice = (action: 'accept' | 'reject') => {
    const currentPair = SAMPLE_WORD_PAIRS[currentIndex];
    
    if (action === 'accept') {
      console.log('✅ Word pair accepted:', currentPair);
      setAcceptedPairs(prev => [...prev, currentPair]);
    } else {
      console.log('❌ Word pair rejected:', currentPair);
    }

    // Move to next card or complete setup
    if (currentIndex >= SAMPLE_WORD_PAIRS.length - 1) {
      setIsComplete(true);
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  /**
   * Handles completion of lexicon setup
   * Saves accepted pairs to Supabase, marks onboarding as complete, and navigates to reminder-setup
   */
  const handleComplete = async () => {
    if (!session?.user) {
      console.error('❌ No authenticated user found');
      Alert.alert('Error', 'Please log in to save your lexicon.');
      return;
    }

    setIsSaving(true);
    
    try {
      console.log('🎉 Saving lexicon to database');
      
      // Save word pairs
      await OnboardingService.saveWordPairs(
        session.user.id,
        acceptedPairs.map(pair => ({
          id: pair.id,
          oldWord: pair.oldWord,
          newWord: pair.newWord,
          description: pair.description,
        }))
      );

      console.log('✅ Lexicon saved successfully');
      
      // Navigate user to the reminder setup screen inside onboarding group
      router.replace('/(onboarding)/reminder-setup' as any);
      
    } catch (error) {
      console.error('❌ Failed to save lexicon:', error);
      Alert.alert(
        'Save Error',
        'Failed to save your lexicon. Please try again.',
        [
          { text: 'Skip for now', onPress: () => router.replace('/(onboarding)/reminder-setup' as any) },
          { text: 'Retry', onPress: handleComplete },
        ]
      );
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handles skipping the entire lexicon setup process
   */
  const handleSkipAll = () => {
    Alert.alert(
      'Skip Lexicon Setup?',
      'You can always add word transformations later in your Lexicon tab.',
      [
        { text: 'Continue Setup', style: 'cancel' },
        { 
          text: 'Skip', 
          onPress: () => {
            console.log('⏭️ User skipped lexicon setup');
            // Navigate the user to the reminder setup screen inside onboarding group
            router.replace('/(onboarding)/reminder-setup' as any);
          }
        },
      ]
    );
  };

  /**
   * Handles the back navigation – mirrors behaviour from the Principles screen header.
   */
  const handleGoBack = () => {
    console.log('🔙 User navigating back from lexicon setup screen');
    router.back();
  };

  if (isComplete) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.completionContainer}>
          <Text style={styles.completionTitle}>Your Lexicon is Ready!</Text>
          <Text style={styles.completionSubtitle}>
            You've added {acceptedPairs.length} word transformation{acceptedPairs.length !== 1 ? 's' : ''} to start your journey.
          </Text>
          
          {acceptedPairs.length > 0 && (
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Your Transformations:</Text>
              {acceptedPairs.slice(0, 3).map((pair, index) => (
                <View key={pair.id} style={styles.summaryItem}>
                  <Text style={styles.summaryText}>
                    {pair.oldWord} → {pair.newWord}
                  </Text>
                </View>
              ))}
              {acceptedPairs.length > 3 && (
                <Text style={styles.summaryMore}>
                  And {acceptedPairs.length - 3} more...
                </Text>
              )}
            </View>
          )}
          
          <TouchableOpacity 
            style={[styles.completeButton, isSaving && styles.buttonDisabled]} 
            onPress={handleComplete}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#121820" size="small" />
            ) : (
              <Text style={styles.completeButtonText}>
                {acceptedPairs.length > 0 ? 'Save & Begin Journey' : 'Begin Journey'}
              </Text>
            )}
          </TouchableOpacity>
          
          {acceptedPairs.length > 0 && !isSaving && (
            <TouchableOpacity style={styles.skipButton} onPress={() => router.replace('/(tabs)' as any)}>
              <Text style={styles.skipButtonText}>Continue without saving</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const currentPair = SAMPLE_WORD_PAIRS[currentIndex];
  const progress = ((currentIndex + 1) / SAMPLE_WORD_PAIRS.length) * 100;

  return (
    <SafeAreaView style={styles.container}>
      {/* ------------------------------------------------------------------- */}
      {/* Navigation Header (Back | Step Progress Bar | Skip)                 */}
      {/* ------------------------------------------------------------------- */}
      <View style={styles.headerNavigation}>
        {/* Back Button */}
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <ArrowLeft color="#F5F5F0" size={24} />
        </TouchableOpacity>

        {/* Centered Progress Bar for Onboarding Steps */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
          </View>
          <Text style={styles.progressText}>5/5</Text>
          <TouchableOpacity onPress={handleSkipAll} disabled={isSaving}>
            <Text style={styles.skipText}>skip</Text>
        </TouchableOpacity>
        </View>

       
       
      </View>
      {/* Content Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Build Your Lexicon</Text>
        <Text style={styles.subtitle}>Choose word transformations that resonate with you. You can always add more later.</Text>
      </View>

      {/* Word-level progress text placed above the card */}
      <View style={styles.wordProgressContainer}>
        <Text style={styles.wordProgressText}>
          {currentIndex + 1} of {SAMPLE_WORD_PAIRS.length} • {acceptedPairs.length} selected
        </Text>
      </View>

      {/* Current Card */}
      <View style={styles.cardContainer}>
        <View style={styles.card}>
          <Text style={styles.cardDescription}>{currentPair.description}</Text>
          
          <View style={styles.wordTransformation}>
            <View style={styles.oldWordContainer}>
              <Text style={styles.oldWordLabel}>FROM</Text>
              <Text style={styles.oldWord}>{currentPair.oldWord}</Text>
            </View>
            
            <View style={styles.arrowContainer}>
              <ArrowRight color="#FFC300" size={24} strokeWidth={2} />
            </View>
            
            <View style={styles.newWordContainer}>
              <Text style={styles.newWordLabel}>TO</Text>
              <Text style={styles.newWord}>{currentPair.newWord}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => handleChoice('reject')}
        >
          <X color="#E53E3E" size={24} strokeWidth={2} />
          <Text style={styles.rejectButtonText}>Skip</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.acceptButton]}
          onPress={() => handleChoice('accept')}
        >
          <Heart color="#10B981" size={24} strokeWidth={2} />
          <Text style={styles.acceptButtonText}>Add</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121820', // Primary background color
    paddingHorizontal: 10,
  },
  headerNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  skipText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#9CA3AF',
  },
  wordProgressContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  wordProgressText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  headerTop: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#F5F5F0', // Primary text color
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF', // Secondary text color
    textAlign: 'center',
    marginBottom: 20,
  },
  progressContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#374151',
    borderRadius: 2,
    overflow: 'hidden',
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    width: '100%', // 5/5 => full fill
    backgroundColor: '#A7F3D0',
  },
  progressText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF', // Secondary text color
    marginRight: 16,
  },
  cardContainer: {
    flexGrow: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 4,
  },
  card: {
    width: width * 0.85,
    backgroundColor: '#1F2937', // Component background color
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#374151', // Border color
    padding: 24,
    minHeight: 280,
    justifyContent: 'space-between',
  },
  cardDescription: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    color: '#F5F5F0', // Primary text color
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  wordTransformation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  oldWordContainer: {
    flex: 1,
    alignItems: 'center',
  },
  oldWordLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280', // Tertiary text color
    marginBottom: 4,
    letterSpacing: 1,
  },
  oldWord: {
    fontSize: 17,
    fontFamily: 'Inter-Regular',
    color: '#4A90E2', // Secondary accent color
    textAlign: 'center',
  },
  arrowContainer: {
    marginHorizontal: 16,
  },
  newWordContainer: {
    flex: 1,
    alignItems: 'center',
  },
  newWordLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280', // Tertiary text color
    marginBottom: 4,
    letterSpacing: 1,
  },
  newWord: {
    fontSize: 17,
    fontFamily: 'Inter-SemiBold',
    color: '#FFC300', // Primary accent color
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
    paddingBottom: 40,
    marginTop: 'auto',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginHorizontal: 8,
    borderRadius: 12,
    borderWidth: 2,
  },
  rejectButton: {
    backgroundColor: 'rgba(229, 62, 62, 0.1)',
    borderColor: '#E53E3E',
  },
  acceptButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10B981',
  },
  rejectButtonText: {
    color: '#E53E3E',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    marginLeft: 8,
  },
  acceptButtonText: {
    color: '#10B981',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    marginLeft: 8,
  },
  completionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  completionTitle: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#F5F5F0', // Primary text color
    textAlign: 'center',
    marginBottom: 16,
  },
  completionSubtitle: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF', // Secondary text color
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  summaryContainer: {
    backgroundColor: '#1F2937', // Component background color
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
    width: '100%',
    borderWidth: 1,
    borderColor: '#374151', // Border color
  },
  summaryTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#F5F5F0', // Primary text color
    marginBottom: 12,
  },
  summaryItem: {
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF', // Secondary text color
  },
  summaryMore: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280', // Tertiary text color
    fontStyle: 'italic',
  },
  completeButton: {
    backgroundColor: '#FFC300', // Primary accent color
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    backgroundColor: '#374151', // Border color for disabled state
  },
  completeButtonText: {
    color: '#121820', // Dark text on light background
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  skipButtonText: {
    color: '#6B7280', // Tertiary text color
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
 
}); 