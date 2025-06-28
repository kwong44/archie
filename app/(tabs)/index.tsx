import React, { useState, useRef, useEffect } from 'react';
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

const { width, height } = Dimensions.get('window');

export default function WorkshopScreen() {
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [userName] = useState('Creator'); // In real app, get from user profile
  const [journalPrompts, setJournalPrompts] = useState<JournalPrompt[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [promptsExpanded, setPromptsExpanded] = useState(false); // New state for collapsible prompts
  const recording = useRef<Audio.Recording | null>(null);
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
   * Navigates to recording with the selected prompt
   */
  const handlePromptPress = async (selectedPrompt: JournalPrompt) => {
    logger.info('User selected prompt', {
      promptId: selectedPrompt.id,
      category: selectedPrompt.category,
      title: selectedPrompt.title
    });

    // Track prompt engagement in Supabase for future personalization
    if (currentUserId) {
      try {
        await PromptService.trackPromptEngagement(currentUserId, selectedPrompt, 'used');
        logger.debug('Prompt usage tracked successfully', { promptId: selectedPrompt.id });
      } catch (error) {
        logger.error('Failed to track prompt usage', { 
          promptId: selectedPrompt.id, 
          userId: currentUserId, 
          error 
        });
        
        // Track this error for monitoring but don't stop the UX flow
        analytics.trackError('Failed to track prompt engagement', 'workshop', {
          metadata: { promptId: selectedPrompt.id, action: 'used' }
        });
      }
    }

    // Store selected prompt in router params and navigate to recording
    router.push({
      pathname: '/reframe',
      params: {
        selectedPrompt: selectedPrompt.prompt,
        promptCategory: selectedPrompt.category,
        promptTitle: selectedPrompt.title
      }
    });
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
   * Toggles the expansion state of the prompts section
   * Tracks analytics when user explores prompts
   */
  const togglePromptsExpansion = () => {
    const newExpanded = !promptsExpanded;
    setPromptsExpanded(newExpanded);
    
    logger.info('Prompts section toggled', { 
      expanded: newExpanded,
      promptCount: journalPrompts.length 
    });

    // Track engagement when user expands to explore prompts
    if (newExpanded) {
      analytics.trackEngagement('feature_discovered', {
        feature: 'suggested_reflections',
        metadata: { promptCount: journalPrompts.length }
      });
    }
  };

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

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recording.current = newRecording;
      setIsRecording(true);

      // Track recording start
      analytics.trackJournaling('recording_started', {
        metadata: { 
          prompt: currentPrompt,
          platform: Platform.OS
        }
      });
      
      logger.info('Audio recording started', { prompt: currentPrompt });

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
      await recording.current.stopAndUnloadAsync();
      const uri = recording.current.getURI();
      recording.current = null;
      setIsRecording(false);

      // Track recording completion
      analytics.trackJournaling('recording_completed', {
        metadata: { 
          hasAudioUri: !!uri,
          fileName: uri?.split('/').pop(),
          fileExtension: uri?.split('.').pop()
        }
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
          audioUri: uri
        });
        
        try {
          router.push({
            pathname: '/reframe',
            params: { audioUri: uri }
          });
          
          // Track successful navigation
          analytics.trackNavigation('reframe', {
            metadata: { 
              fromScreen: 'workshop',
              hasAudioUri: true,
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.backgroundElements, backgroundAnimatedStyle]}>
          <Text style={styles.greeting}>Hello, {userName}.</Text>
          <Text style={styles.prompt}>{currentPrompt}</Text>
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
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>Listening...</Text>
          </View>
        )}

        {/* Suggested Reflections Section - Collapsible */}
        {!isRecording && journalPrompts.length > 0 && (
          <View style={styles.promptsSection}>
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
                  <Text style={styles.promptsSectionTitle}>✨ Suggested Reflections</Text>
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
  recordingIndicator: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 195, 0, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 195, 0, 0.3)',
    marginTop: 20,
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
    marginBottom: 10,
  },
  promptsSectionTitle: {
    fontSize: 20,
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