import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mic, MicOff } from 'lucide-react-native';
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
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
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

  // Y-position of the prompts section within the ScrollView
  const [promptsSectionY, setPromptsSectionY] = useState(0);
  // Indicates that the view has reached prompts area; used to detect upward scroll away
  const [hasReachedPrompts, setHasReachedPrompts] = useState(false);
  const collapseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [collapseScheduled, setCollapseScheduled] = useState(false);

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
          
          // Fetch personalized prompts for the user
          const personalizedPrompts = await PromptService.getPersonalizedPrompts(session.user.id, 3);
          setJournalPrompts(personalizedPrompts);
          
          logger.info('Personalized prompts loaded', { 
            userId: session.user.id,
            promptCount: personalizedPrompts.length,
            categories: personalizedPrompts.map(p => p.category)
          });
          
          // Track prompt loading analytics - moved outside of dependency array
          analytics.trackEngagement('prompt_viewed', {
            feature: 'intelligent_prompts',
            metadata: {
              promptCount: personalizedPrompts.length,
              categories: personalizedPrompts.map(p => p.category),
              hasPersonalized: personalizedPrompts.some(p => p.isPersonalized)
            }
          });
        }
      } catch (error) {
        logger.error('Failed to load prompts', { error });
        
        // Show fallback prompts if personalization fails
        const fallbackPrompts = await PromptService.getPersonalizedPrompts('fallback_user', 2);
        setJournalPrompts(fallbackPrompts);
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
    if (!isRecording) {
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
      // Collapse ‑ scroll back to top and reset flag
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      setHasReachedPrompts(false);
    }
  };

  /**
   * Handles ScrollView scroll events.
   * If user scrolls upward past the prompts section while it is expanded,
   * automatically collapse the section and return to the top.
   */
  const handleScroll = useCallback(
    (event: any) => {
      if (!promptsExpanded) return;

      const offsetY = event.nativeEvent.contentOffset.y;

      // Mark that prompts area has been reached when scrolling down
      if (!hasReachedPrompts && offsetY >= promptsSectionY - 40) {
        setHasReachedPrompts(true);
      }

      const collapseThreshold = promptsSectionY - 150;

      if (hasReachedPrompts && offsetY < collapseThreshold && !collapseScheduled) {
        logger.info('User scrolled above prompts threshold – scheduling collapse');
        setCollapseScheduled(true);

        // Delay collapse slightly to create smoother UX
        collapseTimeoutRef.current = setTimeout(() => {
          logger.info('Executing prompt section collapse');
          setPromptsExpanded(false);
          scrollViewRef.current?.scrollTo({ y: 0, animated: true });
          setHasReachedPrompts(false);
          setCollapseScheduled(false);
        }, 300); // 300ms delay for natural feel
      }

      // If user scrolls back down before timeout, cancel collapse
      if (collapseScheduled && offsetY >= collapseThreshold) {
        if (collapseTimeoutRef.current) {
          clearTimeout(collapseTimeoutRef.current);
        }
        setCollapseScheduled(false);
        logger.debug('Collapse cancelled – user scrolled back into prompts');
      }
    },
    [promptsExpanded, promptsSectionY, hasReachedPrompts]
  );

  const startRecording = async () => {
    if (!hasPermission) {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') return;
      setHasPermission(true);
    }

    try {
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
      setIsRecording(true);

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
      
      logger.info('Audio recording started', { 
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
      console.error('Failed to start recording', err);
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
      setIsRecording(false);

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

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (collapseTimeoutRef.current) {
        clearTimeout(collapseTimeoutRef.current);
      }
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>

      
      <ScrollView 
        ref={scrollViewRef}
        onScroll={handleScroll}
        scrollEventThrottle={16}
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
              style={styles.orbButton}
              onPress={toggleRecording}
              activeOpacity={0.8}
            >
              {isRecording ? (
                <MicOff color="#121820" size={48} strokeWidth={2} />
              ) : (
                <Mic color="#121820" size={48} strokeWidth={2} />
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>

        {isRecording && (
          <View style={styles.recordingControls}>
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={styles.recordingText}>Listening...</Text>
            </View>
            {selectedPrompt && (
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  stopRecording();
                  setSelectedPrompt(null);
                  logger.info('User cancelled recording with selected prompt', {
                    promptId: selectedPrompt.id
                  });
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Suggested Reflections Section - Collapsible */}
        {!isRecording && !selectedPrompt && journalPrompts.length > 0 && (
          <View
            style={styles.promptsSection}
            onLayout={(e) => {
              const { y } = e.nativeEvent.layout;
              setPromptsSectionY(y);
              logger.debug('Prompts section Y set', { y });
            }}
          >
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
                
                {loadingPrompts && (
                  <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading personalized prompts...</Text>
                  </View>
                )}
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