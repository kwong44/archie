import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, RefreshCw, Mic } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useAuth } from '@/context/AuthContext';
import { LexiconService, WordPair } from '@/services/lexiconService';
import { SessionService, TransformationApplied } from '@/services/sessionService';
import { OnboardingService, UserPrinciple } from '@/services/onboardingService';
import { aiApiClient } from '@/lib/aiApiClient';
import { createContextLogger } from '@/lib/logger';

// Create context-specific logger for reframe screen
const reframeLogger = createContextLogger('ReframeScreen');

export default function ReframeScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { 
    audioUri, 
    selectedPrompt: selectedPromptText, 
    promptCategory, 
    promptTitle,
    promptId,
    durationSeconds: durationSecondsParam 
  } = useLocalSearchParams<{ 
    audioUri?: string; 
    selectedPrompt?: string;
    promptCategory?: string;
    promptTitle?: string;
    promptId?: string;
    durationSeconds?: string;
  }>();
  
  // Parse duration from string to number, default to 0 if not provided
  const durationSeconds = durationSecondsParam ? parseFloat(durationSecondsParam) : 0;
  
  const [transcript, setTranscript] = useState<string>('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [isReframing, setIsReframing] = useState(false);
  const [reframedWords, setReframedWords] = useState<{[key: string]: string}>({});
  const [userLexicon, setUserLexicon] = useState<WordPair[]>([]);
  const [userPrinciples, setUserPrinciples] = useState<UserPrinciple[]>([]);
  const [loadingLexicon, setLoadingLexicon] = useState(true);
  const [appliedTransformations, setAppliedTransformations] = useState<TransformationApplied[]>([]);
  const [saving, setSaving] = useState(false);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [aiDescription, setAiDescription] = useState<string>('');
  const [generatingSummary, setGeneratingSummary] = useState(false);

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
   * Transcribe audio using our STT service
   */
  const transcribeAudio = async (audioUri: string) => {
    if (!session?.user) {
      reframeLogger.error('No authenticated user for transcription');
      setTranscriptionError('You must be logged in to transcribe audio.');
      return;
    }

    setIsTranscribing(true);
    setTranscriptionError(null);

    try {
      reframeLogger.info('Starting audio transcription', {
        userId: session.user.id,
        audioUri: audioUri.substring(0, 50) + '...',
        audioUriLength: audioUri.length,
        fileExtension: audioUri.split('.').pop(),
        isTestFlight: __DEV__ ? false : true // Production build indicator
      });

      // Call our STT service with the audio URI
      const result = await aiApiClient.transcribeAudio({
        audioUri: audioUri,
        languageCode: 'en-US'
      });
      
      setTranscript(result.transcript);
      
      reframeLogger.info('Audio transcription completed', {
        userId: session.user.id,
        transcriptLength: result.transcript.length,
        confidence: result.confidence,
        processingTime: result.processing_time_ms
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown transcription error';
      
      // Enhanced error logging for production debugging
      reframeLogger.error('Audio transcription failed', {
        userId: session.user.id,
        error: errorMessage,
        errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
        audioUri: audioUri.substring(0, 50) + '...',
        audioUriLength: audioUri.length,
        fileExtension: audioUri.split('.').pop(),
        isTestFlight: __DEV__ ? false : true,
        // Include stack trace if available
        stackTrace: error instanceof Error ? error.stack?.substring(0, 500) : 'No stack trace'
      });
      
      setTranscriptionError(`Transcription failed: ${errorMessage}`);
      
      Alert.alert(
        'Transcription Error',
        `Unable to process your audio recording.\n\nError: ${errorMessage}\n\nThis information has been logged for debugging.`,
        [
          { text: 'Retry', onPress: () => router.back() },
          { text: 'Use Demo Text', onPress: () => {
            setTranscript("I'm feeling really anxious about this presentation tomorrow. I'm worried I'm going to mess up and everyone will think I'm incompetent. I always get so stressed about these things, and I feel like I'm just not good enough for this job. It's overwhelming having so many expectations on me.");
          }}
        ]
      );
    } finally {
      setIsTranscribing(false);
    }
  };

  /**
   * Load user's lexicon data and principles on component mount
   */
  useEffect(() => {
    const loadUserLexicon = async () => {
      if (!session?.user) {
        reframeLogger.warn('No authenticated user, cannot load lexicon');
        setLoadingLexicon(false);
        return;
      }

      try {
        reframeLogger.info('Loading user lexicon and principles for reframing', {
          userId: session.user.id
        });

        // Load both lexicon and principles in parallel
        const [wordPairs, principles] = await Promise.all([
          LexiconService.getUserWordPairs(session.user.id),
          OnboardingService.getUserPrinciples(session.user.id)
        ]);
        
        setUserLexicon(wordPairs);
        setUserPrinciples(principles);

        reframeLogger.info('User lexicon and principles loaded successfully', {
          userId: session.user.id,
          wordPairsCount: wordPairs.length,
          principlesCount: principles.length
        });

      } catch (error) {
        reframeLogger.error('Failed to load user lexicon or principles', {
          userId: session.user.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        Alert.alert(
          'Error Loading Data',
          'Unable to load your word transformations and principles. Please try again.',
          [{ text: 'OK' }]
        );
      } finally {
        setLoadingLexicon(false);
      }
    };

    const initializeScreen = async () => {
      // Load lexicon first
      await loadUserLexicon();
      
      // Then process audio if provided
      if (audioUri) {
        reframeLogger.info('Audio URI received, starting transcription', {
          audioUri: audioUri.substring(0, 50) + '...'
        });
        await transcribeAudio(audioUri);
      } else {
        reframeLogger.warn('No audio URI provided, using demo transcript');
        setTranscript("I'm feeling really anxious about this presentation tomorrow. I'm worried I'm going to mess up and everyone will think I'm incompetent. I always get so stressed about these things, and I feel like I'm just not good enough for this job. It's overwhelming having so many expectations on me.");
      }
    };

    initializeScreen();
  }, [session?.user, audioUri]);

  /**
   * Generate AI summary when transcript is available
   */
  useEffect(() => {
    const generateAndSetSummary = async () => {
      if (transcript && !generatingSummary) {
        setGeneratingSummary(true);
        try {
          const aiResponse = await generateSummaryResponse();
          
          // Debug logging to check what we received
          reframeLogger.info('AI response received in useEffect', {
            userId: session?.user?.id,
            responseType: typeof aiResponse,
            hasSummary: !!aiResponse.summary,
            hasDescription: !!aiResponse.description,
            summaryType: typeof aiResponse.summary,
            descriptionType: typeof aiResponse.description,
            summaryPreview: aiResponse.summary?.substring(0, 50),
            descriptionPreview: aiResponse.description?.substring(0, 30)
          });
          
          setAiSummary(aiResponse.summary);
          setAiDescription(aiResponse.description);
          
          reframeLogger.info('AI summary and description set successfully', {
            userId: session?.user?.id,
            summaryLength: aiResponse.summary.length,
            descriptionLength: aiResponse.description.length
          });
        } catch (error) {
          reframeLogger.error('Failed to generate summary in useEffect', {
            userId: session?.user?.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          // Set fallback summary and description on error
          setAiSummary('Your practice of reframing language is a powerful step toward conscious self-authorship. Each transformation you make strengthens your ability to choose empowering perspectives.');
          setAiDescription('Mindful language transformation session');
        } finally {
          setGeneratingSummary(false);
        }
      }
    };

    generateAndSetSummary();
  }, [transcript]); // Generate once when transcript is ready

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

  /**
   * Generates AI summary and description response from the backend
   * Returns the full response object with both summary and description
   * 
   * @returns Promise<{summary: string, description: string}> AI-generated response
   */
  const generateSummaryResponse = async (): Promise<{summary: string, description: string}> => {
    if (!session?.user) {
      return {
        summary: 'Complete your session to receive personalized guidance.',
        description: 'Incomplete session'
      };
    }

    try {
      const reframedText = getDisplayText();
      
      reframeLogger.info('Generating AI summary and description', {
        userId: session.user.id,
        originalTextLength: transcript.length,
        reframedTextLength: reframedText.length,
        transformationsCount: appliedTransformations.length
      });

      // Call the AI backend to generate personalized summary and description
      const summaryRequest: any = {
        original_text: transcript,
        reframed_text: reframedText,
        transformation_count: appliedTransformations.length,
        // Include user principles from onboarding for more personalized guidance
        user_principles: userPrinciples.map(p => p.principle)
      };

      // Include selected prompt context if available for more personalized guidance
      if (selectedPromptText) {
        summaryRequest.selected_prompt = selectedPromptText;
        summaryRequest.prompt_category = promptCategory;
        summaryRequest.prompt_title = promptTitle;
        
        reframeLogger.info('Including selected prompt context in AI summary generation', {
          promptTitle,
          promptCategory,
          promptId
        });
      }

      const summaryResponse = await aiApiClient.generateSummary(summaryRequest);

      // Debug the raw API response
      reframeLogger.info('Raw API response received', {
        userId: session.user.id,
        responseType: typeof summaryResponse,
        responseKeys: Object.keys(summaryResponse),
        hasSummary: !!summaryResponse.summary,
        hasDescription: !!summaryResponse.description,
        summaryType: typeof summaryResponse.summary,
        descriptionType: typeof summaryResponse.description,
        fullResponse: JSON.stringify(summaryResponse).substring(0, 200)
      });

      reframeLogger.info('AI summary and description generated successfully', {
        userId: session.user.id,
        summaryLength: summaryResponse.summary.length,
        descriptionLength: summaryResponse.description.length,
        tone: summaryResponse.tone,
        processingTime: summaryResponse.processing_time_ms
      });

      return {
        summary: summaryResponse.summary,
        description: summaryResponse.description
      };

    } catch (error) {
      reframeLogger.error('Failed to generate AI summary and description', {
        userId: session.user.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Fallback to encouraging generic message if AI fails
      return {
        summary: 'Your practice of reframing language is a powerful step toward conscious self-authorship. Each transformation you make strengthens your ability to choose empowering perspectives. Keep building this muscle of mindful language.',
        description: 'Mindful language transformation session'
      };
    }
  };

  /**
   * Generates an AI-powered encouraging summary using Gemini API
   * Compares original transcript with reframed text to provide personalized guidance
   * 
   * @returns Promise<string> AI-generated encouraging summary
   */
  const generateSummary = async (): Promise<string> => {
    const response = await generateSummaryResponse();
    return response.summary;
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
      
      // Use the pre-generated AI summary and description, or generate new ones if not available
      let finalAiSummary = aiSummary;
      let finalAiDescription = aiDescription;
      
      if (!finalAiSummary || !finalAiDescription) {
        reframeLogger.info('No pre-generated summary/description available, generating new ones');
        const aiResponse = await generateSummaryResponse();
        
        // Debug logging for save session
        reframeLogger.info('AI response received in handleSaveSession', {
          userId: session.user.id,
          responseType: typeof aiResponse,
          hasSummary: !!aiResponse.summary,
          hasDescription: !!aiResponse.description,
          summaryPreview: aiResponse.summary?.substring(0, 50),
          descriptionPreview: aiResponse.description?.substring(0, 30)
        });
        
        finalAiSummary = aiResponse.summary;
        finalAiDescription = aiResponse.description;
      }

      reframeLogger.info('Saving session with summary and description', {
        userId: session.user.id,
        summaryLength: finalAiSummary.length,
        descriptionLength: finalAiDescription.length
      });

      await SessionService.createSession(session.user.id, {
        original_transcript: transcript,
        reframed_text: reframedText,
        ai_summary: finalAiSummary,
        description: finalAiDescription, // Include the description field
        transformations_applied: appliedTransformations,
        session_duration_seconds: durationSeconds, // Duration in seconds
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
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>The Blueprint</Text>
          {promptTitle && (
            <Text style={styles.headerSubtitle}>✨ {promptTitle}</Text>
          )}
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loadingLexicon ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFC300" />
            <Text style={styles.loadingText}>Loading your lexicon...</Text>
          </View>
        ) : isTranscribing ? (
          <View style={styles.loadingContainer}>
            <Mic color="#FFC300" size={48} strokeWidth={2} />
            <ActivityIndicator size="large" color="#FFC300" style={{ marginTop: 16 }} />
            <Text style={styles.loadingText}>Transcribing your thoughts...</Text>
            <Text style={styles.loadingSubtext}>This may take a few moments</Text>
          </View>
        ) : transcriptionError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{transcriptionError}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => router.back()}
            >
              <Text style={styles.retryButtonText}>Try Recording Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.transcriptContainer}>
              <Text style={styles.sectionTitle}>Your Thoughts</Text>
              <View style={styles.transcriptBox}>
                <View style={styles.transcriptContent}>
                  {transcript ? renderTranscriptWithHighlights() : (
                    <Text style={styles.noTranscriptText}>No transcript available</Text>
                  )}
                </View>
              </View>
              
              {transcript && (
                <Text style={styles.helpText}>
                  Tap the <Text style={styles.blueText}>blue highlighted words</Text> to reframe them with more empowering language
                </Text>
              )}
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
            <Text style={styles.summaryTitle}>The Guide's Reflection</Text>
          </View>
          <View style={styles.summaryBox}>
            {generatingSummary ? (
              <View style={styles.summaryLoadingContainer}>
                <ActivityIndicator size="small" color="#FFC300" />
                <Text style={styles.summaryLoadingText}>Generating personalized reflection...</Text>
              </View>
            ) : (
              <Text style={styles.summaryText}>
                {aiSummary || 'Your reflection will appear here once generated...'}
              </Text>
            )}
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
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#F5F5F0',
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#FFC300',
    marginTop: 2,
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
  loadingSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#E53E3E',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#FFC300',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#121820',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  noTranscriptText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  summaryLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLoadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginLeft: 8,
    fontStyle: 'italic',
  },
});