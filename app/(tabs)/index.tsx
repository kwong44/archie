import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mic, MicOff, Pause, Play } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  interpolate,
  withSequence,
  runOnJS
} from 'react-native-reanimated';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import { useAnalytics } from '@/lib/analytics';
import { PromptService, JournalPrompt } from '@/services/promptService';
import { PromptCard } from '@/components/PromptCard';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import { UserService } from '@/services/userService';

const { width, height } = Dimensions.get('window');

export default function WorkshopScreen() {
  // Recording state management
  type RecordingState = 'stopped' | 'recording' | 'paused';
  const [recordingState, setRecordingState] = useState<RecordingState>('stopped');
  
  const [hasPermission, setHasPermission] = useState(false);
  const [isProcessingRecording, setIsProcessingRecording] = useState(false); // NEW: Loading state for recording
  const [userName, setUserName] = useState('Creator'); // Real user name from database
  const [loadingUserName, setLoadingUserName] = useState(true); // Loading state for user name
  const [journalPrompts, setJournalPrompts] = useState<JournalPrompt[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [promptsExpanded, setPromptsExpanded] = useState(false); // New state for collapsible prompts
  const [selectedPrompt, setSelectedPrompt] = useState<JournalPrompt | null>(null); // Store selected prompt
  const recording = useRef<Audio.Recording | null>(null);
  const recordingStartTime = useRef<number | null>(null); // Track when recording starts
  const router = useRouter();
  
  // PostHog analytics integration (our wrapper)
  const analytics = useAnalytics();
  
  // Animation values
  const pulseScale = useSharedValue(1);
  const orbOpacity = useSharedValue(1);
  const backgroundOpacity = useSharedValue(1);
  
  // Prompts that change throughout the day
  const prompts = [
    "Ready to build?",
    "What's on your mind?",
    "Let's check in.",
    "Time to create.",
    "How are you feeling?",
    "What needs expression?"
  ];
  const currentPrompt = prompts[Math.floor(Date.now() / (1000 * 60 * 60 * 6)) % prompts.length];

  // ScrollView reference to control programmatic scrolling
  const scrollViewRef = useRef<ScrollView | null>(null);

  // Y-position of the prompts section for manual scroll (simplified)
  const [promptsSectionY, setPromptsSectionY] = useState(0);

  useEffect(() => {
    // Track screen view for analytics
    analytics.trackNavigation('workshop', {
      metadata: { currentPrompt }
    });
    
    logger.info('Workshop screen loaded', { 
      userName, 
      currentPrompt,
      hasPostHogAnalytics: !!analytics.posthog
    });

    // Request audio permissions
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();

    // Start gentle pulsing animation
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 2000 }),
        withTiming(1, { duration: 2000 })
      ),
      -1,
      false
    );
  }, [currentPrompt, userName]);

  /**
   * Loads the user's display name from their profile
   * Uses UserService to fetch from user_profiles table with fallback
   */
  useEffect(() => {
    const loadUserDisplayName = async () => {
      logger.info('Loading user display name');
      setLoadingUserName(true);
      
      try {
        const displayName = await UserService.getUserDisplayName();
        setUserName(displayName);
        
        logger.info('User display name loaded successfully', { 
          displayName,
          isDefault: displayName === 'Creator'
        });
      } catch (error) {
        logger.error('Failed to load user display name, using fallback', { error });
        // Keep the default 'Creator' name if loading fails
      } finally {
        setLoadingUserName(false);
      }
    };

    loadUserDisplayName();
  }, []); // Run once on component mount

  /**
   * Fetches current user ID and loads personalized prompts
   * Uses Supabase auth session to get authenticated user
   */
  useEffect(() => {
    const loadUserAndPrompts = async () => {
      try {
        // Get current user from Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user?.id) {
          setCurrentUserId(session.user.id);
          logger.info('Current user loaded', { userId: session.user.id });
          
          // Fetch personalized prompts for the user with error handling
          try {
            const personalizedPrompts = await PromptService.getPersonalizedPrompts(session.user.id, 3);
            setJournalPrompts(personalizedPrompts);
            
            logger.info('Personalized prompts loaded', { 
              userId: session.user.id,
              promptCount: personalizedPrompts.length,
              categories: personalizedPrompts.map(p => p.category)
            });
            
            // Track prompt loading analytics
            analytics.trackEngagement('prompt_viewed', {
              feature: 'intelligent_prompts',
              metadata: {
                promptCount: personalizedPrompts.length,
                categories: personalizedPrompts.map(p => p.category),
                hasPersonalized: personalizedPrompts.some(p => p.isPersonalized)
              }
            });
          } catch (promptError) {
            logger.error('Failed to load personalized prompts, using fallback', { 
              userId: session.user.id, 
              error: promptError 
            });
            
            // Use fallback prompts if personalization fails
            const fallbackPrompts = await PromptService.getPersonalizedPrompts('fallback_user', 2);
            setJournalPrompts(fallbackPrompts);
            
            analytics.trackError('personalized_prompts_failed', 'workshop', {
              metadata: { userId: session.user.id }
            });
          }
        }
      } catch (error) {
        logger.error('Failed to load user and prompts', { error });
        
        // Show fallback prompts if everything fails
        try {
          const fallbackPrompts = await PromptService.getPersonalizedPrompts('fallback_user', 2);
          setJournalPrompts(fallbackPrompts);
        } catch (fallbackError) {
          logger.error('Even fallback prompts failed', { error: fallbackError });
          // Set empty array to prevent infinite loading
          setJournalPrompts([]);
        }
      } finally {
        setLoadingPrompts(false);
      }
    };

    loadUserAndPrompts();
  }, []);

  /**
   * Handles when user selects a prompt to use for journaling
   * Stores the prompt and automatically starts recording
   */
  const handlePromptPress = async (selectedPromptData: JournalPrompt) => {
    logger.info('User selected prompt', {
      promptId: selectedPromptData.id,
      category: selectedPromptData.category,
      title: selectedPromptData.title
    });

    // Track prompt engagement in Supabase for future personalization
    if (currentUserId) {
      try {
        await PromptService.trackPromptEngagement(currentUserId, selectedPromptData, 'used');
        logger.debug('Prompt usage tracked successfully', { promptId: selectedPromptData.id });
      } catch (error) {
        logger.error('Failed to track prompt usage', { 
          promptId: selectedPromptData.id, 
          userId: currentUserId, 
          error 
        });
        
        // Track this error for monitoring but don't stop the UX flow
        analytics.trackError('Failed to track prompt engagement', 'workshop', {
          metadata: { promptId: selectedPromptData.id, action: 'used' }
        });
      }
    }

    // Store the selected prompt and automatically start recording
    setSelectedPrompt(selectedPromptData);
    setPromptsExpanded(false); // Collapse prompts to focus on recording
    
    logger.info('Auto-starting recording with selected prompt', {
      promptId: selectedPromptData.id,
      promptText: selectedPromptData.prompt
    });

    // Auto-start recording with the selected prompt context
    if (recordingState === 'stopped') {
      await startRecording();
    }
  };

  /**
   * Handles when user skips a prompt
   * Removes it from the current list and tracks analytics
   */
  const handlePromptSkip = async (promptId: string) => {
    logger.info('User skipped prompt', { promptId });

    // Find the full prompt object from current list for tracking
    const skippedPrompt = journalPrompts.find(prompt => prompt.id === promptId);

    // Track skip engagement in Supabase with error handling
    if (currentUserId && skippedPrompt) {
      try {
        await PromptService.trackPromptEngagement(currentUserId, skippedPrompt, 'skipped');
        logger.debug('Skip engagement tracked successfully', { promptId });
      } catch (error) {
        logger.error('Failed to track skip engagement', { 
          promptId, 
          userId: currentUserId, 
          error 
        });
        
        // Track this error for monitoring but don't stop the UX flow
        analytics.trackError('Failed to track prompt engagement', 'workshop', {
          metadata: { promptId, action: 'skipped' }
        });
      }
    } else if (currentUserId && !skippedPrompt) {
      logger.warn('Could not find prompt object for tracking skip', { promptId });
    }

    // Remove the skipped prompt from current list (always do this regardless of tracking success)
    setJournalPrompts(prevPrompts => 
      prevPrompts.filter(prompt => prompt.id !== promptId)
    );

    // If no prompts left, load more
    if (journalPrompts.length <= 1 && currentUserId) {
      loadMorePrompts();
    }
  };

  /**
   * Loads additional prompts when current ones are exhausted
   */
  const loadMorePrompts = async () => {
    if (!currentUserId) return;

    try {
      const additionalPrompts = await PromptService.getPersonalizedPrompts(currentUserId, 2);
      setJournalPrompts(additionalPrompts);
      
      logger.info('Additional prompts loaded', { 
        count: additionalPrompts.length 
      });
    } catch (error) {
      logger.error('Failed to load additional prompts', { error });
    }
  };

  /**
   * Toggles the prompts section and handles smooth scrolling
   * When expanding, scrolls down to the prompt cards
   * When collapsing, scrolls back to top of screen
   */
  const togglePromptsExpansion = () => {
    const newExpanded = !promptsExpanded;
    setPromptsExpanded(newExpanded);

    logger.info('Prompts section toggled', {
      expanded: newExpanded,
      promptCount: journalPrompts.length,
    });

    if (newExpanded) {
      // Track discovery analytics
      analytics.trackEngagement('feature_discovered', {
        feature: 'suggested_reflections',
        metadata: { promptCount: journalPrompts.length },
      });

      // Scroll to the prompts section after small delay to ensure layout calculation
      setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({ y: promptsSectionY, animated: true });
        }
      }, 50);
    } else {
      // Collapse ‑ scroll back to top
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  };



  /**
   * Enhanced startRecording with comprehensive error handling
   * Prevents button from becoming unresponsive on errors
   */
  const startRecording = async () => {
    logger.info('Starting recording process', { hasPermission, isProcessingRecording });
    
    // Prevent multiple simultaneous recording attempts
    if (isProcessingRecording) {
      logger.warn('Recording already in progress, ignoring duplicate request');
      return;
    }

    setIsProcessingRecording(true);

    try {
      // Check and request permission if needed
      if (!hasPermission) {
        logger.info('No permission, requesting audio permission');
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          logger.warn('Permission denied, cannot start recording');
          Alert.alert('Permission Required', 'Microphone access is needed to record your thoughts.');
          return;
        }
        setHasPermission(true);
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      
      // Store the current timestamp when recording starts
      recordingStartTime.current = Date.now();

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recording.current = newRecording;
      setRecordingState('recording');

      // Track recording start with prompt context
      const recordingPrompt = selectedPrompt ? selectedPrompt.prompt : currentPrompt;
      analytics.trackJournaling('recording_started', {
        metadata: { 
          prompt: recordingPrompt,
          promptTitle: selectedPrompt?.title,
          promptCategory: selectedPrompt?.category,
          isSelectedPrompt: !!selectedPrompt,
          platform: Platform.OS
        }
      });
      
      logger.info('Audio recording started successfully', { 
        prompt: recordingPrompt,
        selectedPromptId: selectedPrompt?.id,
        selectedPromptTitle: selectedPrompt?.title
      });

      // Animate to recording state
      backgroundOpacity.value = withTiming(0.3, { duration: 500 });
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 800 }),
          withTiming(0.95, { duration: 800 })
        ),
        -1,
        false
      );

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error('Failed to start recording', { error: errorMessage });
      
      // Track the error for monitoring
      analytics.trackError('recording_start_failed', 'workshop', {
        metadata: { error: errorMessage, platform: Platform.OS }
      });

      // Show user-friendly error message
      Alert.alert(
        'Recording Error',
        'Unable to start recording. Please check your microphone permissions and try again.',
        [{ text: 'OK', style: 'default' }]
      );

      // Reset state on error to prevent button lockup
      setRecordingState('stopped');
      recording.current = null;
      recordingStartTime.current = null;
    } finally {
      setIsProcessingRecording(false);
    }
  };

  /**
   * Pauses the current recording
   * Keeps the same recording file but stops the timer
   */
  const pauseRecording = async () => {
    if (!recording.current || recordingState !== 'recording') return;

    try {
      await recording.current.pauseAsync();
      setRecordingState('paused');

      logger.info('Recording paused', {
        hadSelectedPrompt: !!selectedPrompt,
        promptId: selectedPrompt?.id
      });

      // Track pause event
      analytics.trackEngagement('session_extended', {
        metadata: {
          hadSelectedPrompt: !!selectedPrompt,
          promptId: selectedPrompt?.id,
          action: 'paused'
        }
      });

    } catch (err) {
      logger.error('Failed to pause recording', { error: err });
      console.error('Failed to pause recording', err);
    }
  };

  /**
   * Resumes the current recording
   * Continues the same recording file
   */
  const resumeRecording = async () => {
    if (!recording.current || recordingState !== 'paused') return;

    try {
      await recording.current.startAsync();
      setRecordingState('recording');

      logger.info('Recording resumed', {
        hadSelectedPrompt: !!selectedPrompt,
        promptId: selectedPrompt?.id
      });

      // Track resume event
      analytics.trackEngagement('session_extended', {
        metadata: {
          hadSelectedPrompt: !!selectedPrompt,
          promptId: selectedPrompt?.id,
          action: 'resumed'
        }
      });

    } catch (err) {
      logger.error('Failed to resume recording', { error: err });
      console.error('Failed to resume recording', err);
    }
  };

  /**
   * Cancels the current recording without processing or navigation
   * Used when user explicitly cancels the recording
   */
  const cancelRecording = async () => {
    if (!recording.current) return;

    try {
      // Calculate duration for logging purposes only
      const durationSeconds = recordingStartTime.current
        ? parseFloat(((Date.now() - recordingStartTime.current) / 1000).toFixed(2))
        : 0;

      await recording.current.stopAndUnloadAsync();
      recording.current = null;
      setRecordingState('stopped');

      // Reset the start time
      recordingStartTime.current = null;

      // Track recording cancellation
      analytics.trackEngagement('session_extended', {
        metadata: {
          durationSeconds: String(durationSeconds),
          hadSelectedPrompt: !!selectedPrompt,
          promptId: selectedPrompt?.id,
          action: 'cancelled'
        }
      });

      logger.info('Recording cancelled', {
        durationSeconds: durationSeconds,
        hadSelectedPrompt: !!selectedPrompt,
        promptId: selectedPrompt?.id
      });

      // Animate back to normal state
      backgroundOpacity.value = withTiming(1, { duration: 500 });
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 2000 }),
          withTiming(1, { duration: 2000 })
        ),
        -1,
        false
      );

      // Reset selected prompt state
      setSelectedPrompt(null);

    } catch (err) {
      logger.error('Failed to cancel recording', { error: err });
      console.error('Failed to cancel recording', err);
    }
  };

  const stopRecording = async () => {
    if (!recording.current) return;

    try {
      // Calculate duration in seconds, ensuring it's a valid number
      const durationSeconds = recordingStartTime.current
        ? parseFloat(((Date.now() - recordingStartTime.current) / 1000).toFixed(2))
        : 0;

      await recording.current.stopAndUnloadAsync();
      const uri = recording.current.getURI();
      recording.current = null;
      setRecordingState('stopped');

      // Reset the start time
      recordingStartTime.current = null;

      // Track recording completion with duration
      analytics.trackJournaling('recording_completed', {
        metadata: {
          hasAudioUri: !!uri,
          fileName: uri?.split('/').pop(),
          fileExtension: uri?.split('.').pop(),
          durationSeconds: String(durationSeconds) // Pass as string for analytics
        }
      });

      logger.info('Recording stopped', {
        durationSeconds: durationSeconds,
        audioUri: uri
      });

      // Animate back to normal state
      backgroundOpacity.value = withTiming(1, { duration: 500 });
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 2000 }),
          withTiming(1, { duration: 2000 })
        ),
        -1,
        false
      );

      // Enhanced logging for debugging audio recording
      logger.info('Audio recorded successfully', {
        uri: uri,
        fileName: uri?.split('/').pop(),
        fileExtension: uri?.split('.').pop()
      });

      // Check if URI is valid before navigation
      if (!uri) {
        logger.error('No URI received from recording - cannot navigate');
        analytics.trackError('recording_no_uri_error', 'workshop');
        return;
      }

      // Small delay to ensure file is fully written before navigation
      logger.info('Attempting navigation to reframe screen in 500ms');
      setTimeout(() => {
        logger.info('Navigation executing NOW', {
          pathname: '/reframe',
          audioUri: uri,
          hasSelectedPrompt: !!selectedPrompt
        });

        try {
          // Include selected prompt information and duration
          const navigationParams: any = {
            audioUri: uri,
            durationSeconds: String(durationSeconds) // Pass as string for navigation
          };

          if (selectedPrompt) {
            navigationParams.selectedPrompt = selectedPrompt.prompt;
            navigationParams.promptCategory = selectedPrompt.category;
            navigationParams.promptTitle = selectedPrompt.title;
            navigationParams.promptId = selectedPrompt.id;

            logger.info('Including selected prompt in navigation', {
              promptId: selectedPrompt.id,
              promptTitle: selectedPrompt.title
            });
          }

          router.push({
            pathname: '/reframe',
            params: navigationParams
          });

          // Reset selected prompt after navigation
          setSelectedPrompt(null);

          // Track successful navigation
          analytics.trackNavigation('reframe', {
            metadata: {
              fromScreen: 'workshop',
              hasAudioUri: true,
              hasSelectedPrompt: !!selectedPrompt,
              navigationMethod: 'recording_completion'
            }
          });
          
          logger.info('Router.push() called successfully');
        } catch (navError) {
          const errorMessage = navError instanceof Error ? navError.message : String(navError);
          logger.error('Navigation error', { error: navError });
          analytics.trackError(errorMessage, 'workshop_navigation');
        }
      }, 500);
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  };

  /**
   * Enhanced toggleRecording with error handling
   * Prevents button from becoming unresponsive if startRecording fails
   */
  const toggleRecording = async () => {
    try {
      if (recordingState === 'recording' || recordingState === 'paused') {
        await stopRecording();
      } else {
        await startRecording();
      }
    } catch (error) {
      logger.error('Toggle recording failed', { error });
      // Reset state to prevent button from becoming unresponsive
      setRecordingState('stopped');
      setIsProcessingRecording(false);
    }
  };

  const orbAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseScale.value }],
      opacity: orbOpacity.value,
    };
  });

  const backgroundAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: backgroundOpacity.value,
    };
  });

  // No cleanup needed with manual control only

  return (
    <SafeAreaView style={styles.container}>

      
      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.backgroundElements, backgroundAnimatedStyle]}>
          <Text style={styles.greeting}>Hello, {userName}.</Text>
          <Text style={styles.prompt}>
            {selectedPrompt ? selectedPrompt.prompt : currentPrompt}
          </Text>
          {selectedPrompt && (
            <Text style={styles.selectedPromptLabel}>
              ✨ {selectedPrompt.title}
            </Text>
          )}
        </Animated.View>

        <View style={styles.orbContainer}>
          <Animated.View style={[styles.orb, orbAnimatedStyle]}>
            <TouchableOpacity
              style={[styles.orbButton, isProcessingRecording && styles.orbButtonDisabled]}
              onPress={toggleRecording}
              activeOpacity={0.8}
              disabled={isProcessingRecording}
            >
              {isProcessingRecording ? (
                <ActivityIndicator color="#121820" size="small" />
              ) : recordingState === 'recording' || recordingState === 'paused' ? (
                <MicOff color="#121820" size={36} strokeWidth={2} />
              ) : (
                <Mic color="#121820" size={36} strokeWidth={2} />
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>

        {(recordingState === 'recording' || recordingState === 'paused') && (
          <View style={styles.recordingControls}>
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>
                {recordingState === 'recording' ? 'Listening...' : 'Paused'}
              </Text>
            </View>
            <View style={styles.recordingButtons}>
              <TouchableOpacity 
                style={styles.pausePlayButton}
                onPress={recordingState === 'recording' ? pauseRecording : resumeRecording}
              >
                {recordingState === 'recording' ? (
                  <Pause color="#FFFFFF" size={24} strokeWidth={2} />
                ) : (
                  <Play color="#FFFFFF" size={24} strokeWidth={2} />
                )}
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={cancelRecording}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Enhanced Suggested Reflections Section with better loading states */}
        {recordingState === 'stopped' && !selectedPrompt && (
          <View
            style={styles.promptsSection}
            onLayout={(e) => {
              const { y } = e.nativeEvent.layout;
              setPromptsSectionY(y);
              logger.debug('Prompts section Y set', { y });
            }}
          >
            {loadingPrompts ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#FFC300" />
                <Text style={styles.loadingText}>Loading personalized prompts...</Text>
              </View>
            ) : journalPrompts.length > 0 ? (
              <>
                {!promptsExpanded ? (
                  // Collapsed State - Subtle hint
                  <TouchableOpacity 
                    style={styles.promptsCollapsed}
                    onPress={togglePromptsExpansion}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.promptsCollapsedText}>
                      💡 Explore new topics
                    </Text>
                    <Text style={styles.promptsCollapsedIcon}>↓</Text>
                  </TouchableOpacity>
                ) : (
                  // Expanded State - Full prompts display
                  <View>
                    <TouchableOpacity 
                      style={styles.promptsHeader}
                      onPress={togglePromptsExpansion}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.promptsSectionTitle}>Go Deeper</Text>
                      <Text style={styles.promptsCollapseIcon}>↑</Text>
                    </TouchableOpacity>
                    
                    <Text style={styles.promptsSectionSubtitle}>
                      Explore new areas of your life journey
                    </Text>
                    
                    {journalPrompts.map((prompt, index) => (
                      <PromptCard
                        key={prompt.id}
                        prompt={prompt}
                        onPromptPress={handlePromptPress}
                        onSkip={handlePromptSkip}
                      />
                    ))}
                  </View>
                )}
              </>
            ) : (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>No prompts available</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121820',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  backgroundElements: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  greeting: {
    fontSize: 28,
    fontFamily: 'Inter-Regular',
    color: '#F5F5F0',
    marginBottom: 20,
  },
  prompt: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  selectedPromptLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFC300',
    textAlign: 'center',
    marginTop: 8,
  },
  orbContainer: {
    alignItems: 'center',
    marginVertical: 40,
    paddingHorizontal: 10,
  },
  orb: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#FFC300',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFC300',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  orbButton: {
    width: '100%',
    height: '100%',
    borderRadius: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orbButtonDisabled: {
    opacity: 0.6,
  },
  recordingControls: {
    alignItems: 'center',
    marginTop: 20,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 195, 0, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 195, 0, 0.3)',
    marginBottom: 12,
  },
  recordingButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pausePlayButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(156, 163, 175, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(156, 163, 175, 0.3)',
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFC300',
    marginRight: 8,
  },
  recordingText: {
    color: '#F5F5F0',
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  cancelButton: {
    backgroundColor: 'rgba(156, 163, 175, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(156, 163, 175, 0.3)',
  },
  cancelButtonText: {
    color: '#9CA3AF',
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  promptsSection: {
    marginTop: 20,
  },
  // Collapsed State Styles
  promptsCollapsed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 195, 0, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 195, 0, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  promptsCollapsedText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginRight: 8,
  },
  promptsCollapsedIcon: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  // Expanded State Styles  
  promptsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 10,
  },
  promptsSectionTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Regular',
    color: '#F5F5F0',
  },
  promptsCollapseIcon: {
    fontSize: 18,
    color: '#9CA3AF',
    fontFamily: 'Inter-Regular',
  },
  promptsSectionSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginBottom: 20,
  },
  loadingContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#9CA3AF',
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },

});