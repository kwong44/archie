import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Sparkles, RefreshCw } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useAuth } from '@/context/AuthContext';
import { LexiconService, WordPair } from '@/services/lexiconService';
import { SessionService, TransformationApplied } from '@/services/sessionService';
import { createContextLogger } from '@/lib/logger';

// Create context-specific logger for reframe screen
const reframeLogger = createContextLogger('ReframeScreen');

export default function ReframeScreen() {
  const router = useRouter();
  const { session } = useAuth();
  
  const [transcript, setTranscript] = useState(
    "I'm feeling really anxious about this presentation tomorrow. I'm worried I'm going to mess up and everyone will think I'm incompetent. I always get so stressed about these things, and I feel like I'm just not good enough for this job. It's overwhelming having so many expectations on me."
  );
  
  const [isReframing, setIsReframing] = useState(false);
  const [reframedWords, setReframedWords] = useState<{[key: string]: string}>({});
  const [userLexicon, setUserLexicon] = useState<WordPair[]>([]);
  const [loadingLexicon, setLoadingLexicon] = useState(true);
  const [appliedTransformations, setAppliedTransformations] = useState<TransformationApplied[]>([]);
  const [saving, setSaving] = useState(false);

  /**
   * Create a lookup object from user's lexicon for fast word matching
   */
  const lexiconLookup = userLexicon.reduce((acc, wordPair) => {
    acc[wordPair.old_word.toLowerCase()] = {
      newWord: wordPair.new_word,
      lexiconId: wordPair.id
    };
    return acc;
  }, {} as Record<string, { newWord: string; lexiconId: string }>);

  /**
   * Load user's lexicon data on component mount
   */
  useEffect(() => {
    const loadUserLexicon = async () => {
      if (!session?.user) {
        reframeLogger.warn('No authenticated user, cannot load lexicon');
        setLoadingLexicon(false);
        return;
      }

      try {
        reframeLogger.info('Loading user lexicon for reframing', {
          userId: session.user.id
        });

        const wordPairs = await LexiconService.getUserWordPairs(session.user.id);
        setUserLexicon(wordPairs);

        reframeLogger.info('User lexicon loaded successfully', {
          userId: session.user.id,
          wordPairsCount: wordPairs.length
        });

      } catch (error) {
        reframeLogger.error('Failed to load user lexicon', {
          userId: session.user.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        Alert.alert(
          'Error Loading Lexicon',
          'Unable to load your word transformations. Please try again.',
          [{ text: 'OK' }]
        );
      } finally {
        setLoadingLexicon(false);
      }
    };

    loadUserLexicon();
  }, [session?.user]);

  const reframeWord = (oldWord: string, newWord: string, lexiconId: string, position: number) => {
    setIsReframing(true);
    setTimeout(() => {
      setReframedWords(prev => ({ ...prev, [oldWord]: newWord }));
      
      // Track this transformation
      setAppliedTransformations(prev => [
        ...prev,
        {
          lexicon_id: lexiconId,
          old_word: oldWord,
          new_word: newWord,
          position_in_text: position
        }
      ]);
      
      setIsReframing(false);
    }, 500);
  };

  const getDisplayText = () => {
    let displayText = transcript;
    Object.entries(reframedWords).forEach(([oldWord, newWord]) => {
      displayText = displayText.replace(new RegExp(oldWord, 'gi'), newWord);
    });
    return displayText;
  };

  const renderTranscriptWithHighlights = () => {
    const words = transcript.split(' ');
    return words.map((word, index) => {
      const cleanWord = word.toLowerCase().replace(/[.,!?]/g, '');
      const lexiconMatch = lexiconLookup[cleanWord];
      const isOldWord = !!lexiconMatch;
      const isReframed = reframedWords.hasOwnProperty(cleanWord);
      
      return (
        <TouchableOpacity
          key={index}
          onPress={() => {
            if (isOldWord && !isReframed && lexiconMatch) {
              reframeWord(
                cleanWord, 
                lexiconMatch.newWord, 
                lexiconMatch.lexiconId, 
                index
              );
            }
          }}
          style={[
            styles.word,
            isOldWord && !isReframed && styles.oldWord,
            isReframed && styles.reframedWord
          ]}
        >
          <Text style={[
            styles.transcriptText,
            isOldWord && !isReframed && styles.oldWordText,
            isReframed && styles.reframedWordText
          ]}>
            {isReframed ? reframedWords[cleanWord] : word}
          </Text>
        </TouchableOpacity>
      );
    });
  };

  const generateSummary = () => {
    const reframedText = getDisplayText();
    return `You're preparing for an important presentation, feeling excited about the opportunity to share your work. This energy you're experiencing shows how much you care about doing well. Remember that growth happens when we step into new challenges, and you're exactly where you need to be in your journey. The expectations you feel are a sign that others believe in your capabilities.`;
  };

  /**
   * Saves the current session including transformations and reframed text
   */
  const handleSaveSession = async () => {
    if (!session?.user) {
      Alert.alert('Error', 'You must be logged in to save sessions.');
      return;
    }

    reframeLogger.info('Saving journal session', {
      userId: session.user.id,
      transformationsCount: appliedTransformations.length,
      transcriptLength: transcript.length
    });

    setSaving(true);

    try {
      const reframedText = getDisplayText();
      const aiSummary = generateSummary();

      await SessionService.createSession(session.user.id, {
        original_transcript: transcript,
        reframed_text: reframedText,
        ai_summary: aiSummary,
        transformations_applied: appliedTransformations,
        session_duration_seconds: 0, // TODO: Track actual duration
      });

      reframeLogger.info('Journal session saved successfully', {
        userId: session.user.id,
        sessionCompleted: true
      });

      Alert.alert(
        'Session Saved!',
        'Your reframing session has been saved successfully.',
        [
          {
            text: 'Continue',
            onPress: () => router.push('/(tabs)')
          }
        ]
      );

    } catch (error) {
      reframeLogger.error('Failed to save journal session', {
        userId: session.user.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      Alert.alert(
        'Save Failed',
        'Unable to save your session. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft color="#F5F5F0" size={24} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>The Blueprint</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loadingLexicon ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFC300" />
            <Text style={styles.loadingText}>Loading your lexicon...</Text>
          </View>
        ) : (
          <>
            <View style={styles.transcriptContainer}>
              <Text style={styles.sectionTitle}>Your Thoughts</Text>
              <View style={styles.transcriptBox}>
                <View style={styles.transcriptContent}>
                  {renderTranscriptWithHighlights()}
                </View>
              </View>
              
              <Text style={styles.helpText}>
                Tap the <Text style={styles.blueText}>blue highlighted words</Text> to reframe them with more empowering language
              </Text>
            </View>

        {/* Word Transformations */}
        {Object.keys(reframedWords).length > 0 && (
          <View style={styles.transformationsContainer}>
            <Text style={styles.sectionTitle}>Transformations Made</Text>
            {Object.entries(reframedWords).map(([oldWord, newWord]) => (
              <View key={oldWord} style={styles.transformationItem}>
                <Text style={styles.transformationOld}>{oldWord}</Text>
                <Text style={styles.transformationArrow}>→</Text>
                <Text style={styles.transformationNew}>{newWord}</Text>
              </View>
            ))}
          </View>
        )}

        {/* The Guide's Summary */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryHeader}>
            <Sparkles color="#FFC300" size={20} strokeWidth={2} />
            <Text style={styles.summaryTitle}>The Guide's Reflection</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryText}>{generateSummary()}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => {
              setReframedWords({});
            }}
          >
            <RefreshCw color="#9CA3AF" size={20} strokeWidth={2} />
            <Text style={styles.secondaryButtonText}>Reset</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.primaryButton, saving && styles.primaryButtonDisabled]}
            onPress={handleSaveSession}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#121820" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Save & Continue</Text>
            )}
          </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121820',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#F5F5F0',
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    padding: 20,
  },
  transcriptContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#F5F5F0',
    marginBottom: 16,
  },
  transcriptBox: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#374151',
    marginBottom: 12,
  },
  transcriptContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  word: {
    marginRight: 4,
    marginBottom: 4,
    borderRadius: 4,
    paddingHorizontal: 2,
    paddingVertical: 1,
  },
  oldWord: {
    backgroundColor: 'rgba(74, 144, 226, 0.2)',
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  reframedWord: {
    backgroundColor: 'rgba(255, 195, 0, 0.2)',
    borderWidth: 1,
    borderColor: '#FFC300',
  },
  transcriptText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#F5F5F0',
    lineHeight: 24,
  },
  oldWordText: {
    color: '#4A90E2',
  },
  reframedWordText: {
    color: '#FFC300',
    fontFamily: 'Inter-SemiBold',
  },
  helpText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
  },
  blueText: {
    color: '#4A90E2',
  },
  transformationsContainer: {
    marginBottom: 30,
  },
  transformationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  transformationOld: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#4A90E2',
    flex: 1,
  },
  transformationArrow: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginHorizontal: 12,
  },
  transformationNew: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFC300',
    flex: 1,
    textAlign: 'right',
  },
  summaryContainer: {
    marginBottom: 30,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#F5F5F0',
    marginLeft: 8,
  },
  summaryBox: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#374151',
    borderLeftWidth: 4,
    borderLeftColor: '#FFC300',
  },
  summaryText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#F5F5F0',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#374151',
    paddingVertical: 16,
    borderRadius: 12,
  },
  secondaryButtonText: {
    color: '#9CA3AF',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    marginLeft: 8,
  },
  primaryButton: {
    flex: 2,
    backgroundColor: '#FFC300',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: '#374151',
  },
  primaryButtonText: {
    color: '#121820',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginTop: 16,
  },
});