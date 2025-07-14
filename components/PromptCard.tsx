/**
 * PromptCard Component for The Architect
 * Displays intelligent journal prompts with reframing suggestions
 * Follows UI guidelines for consistent styling and user experience
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Platform, Dimensions } from 'react-native';
import { JournalPrompt, PromptCategory } from '@/services/promptService';
import { useAnalytics } from '@/lib/analytics';
import { logger } from '@/lib/logger';
import { BlurView } from 'expo-blur';
import { Mic, X } from 'lucide-react-native';

interface PromptCardProps {
  prompt: JournalPrompt;
  onPromptPress: (prompt: JournalPrompt) => void;
  onSkip?: (promptId: string) => void;
}

// Card height ~50% of viewport to mirror InteractionCard proportions
const { height: screenHeight } = Dimensions.get('window');
const CARD_HEIGHT = screenHeight * 0.48;

/**
 * PromptCard displays a single journal prompt with category, title, and engaging question
 * Includes visual depth levels and analytics tracking for user interactions
 */
export const PromptCard: React.FC<PromptCardProps> = ({ 
  prompt, 
  onPromptPress, 
  onSkip 
}) => {
  const analytics = useAnalytics();

  /**
   * Gets category display name for UI
   */
  const getCategoryDisplayName = (category: PromptCategory): string => {
    const categoryNames = {
      [PromptCategory.RELATIONSHIPS]: 'Relationships',
      [PromptCategory.WORK_CAREER]: 'Work & Career',
      [PromptCategory.PERSONAL_GROWTH]: 'Personal Growth',
      [PromptCategory.HEALTH_WELLNESS]: 'Health & Wellness',
      [PromptCategory.FEARS_ANXIETIES]: 'Fears & Anxieties',
      [PromptCategory.DREAMS_ASPIRATIONS]: 'Dreams & Aspirations',
      [PromptCategory.PAST_EXPERIENCES]: 'Past Experiences',
      [PromptCategory.DAILY_MOMENTS]: 'Daily Moments',
      [PromptCategory.DAILY_CHECKIN]: 'Daily Check-in'
    };
    return categoryNames[category] || category;
  };

  /**
   * Gets category color for visual distinction
   */
  const getCategoryColor = (category: PromptCategory): string => {
    const categoryColors = {
      [PromptCategory.RELATIONSHIPS]: '#FFC300', // Primary accent
      [PromptCategory.WORK_CAREER]: '#4A90E2', // Secondary accent
      [PromptCategory.PERSONAL_GROWTH]: '#10B981', // Success accent
      [PromptCategory.HEALTH_WELLNESS]: '#06B6D4', // Cyan
      [PromptCategory.FEARS_ANXIETIES]: '#8B5CF6', // Purple
      [PromptCategory.DREAMS_ASPIRATIONS]: '#F59E0B', // Amber
      [PromptCategory.PAST_EXPERIENCES]: '#EF4444', // Red
      [PromptCategory.DAILY_MOMENTS]: '#6B7280', // Gray
      [PromptCategory.DAILY_CHECKIN]: '#FF8C00' // Orange
    };
    return categoryColors[category] || '#9CA3AF';
  };

  /**
   * Returns a curated Pexels image URL per category for consistent quality
   * Pexels images are free-to-use and don't require an API key for static links
   */
  const getBackgroundImage = (category: PromptCategory): string => {
    const images: Record<PromptCategory, string> = {
      [PromptCategory.RELATIONSHIPS]: 'https://images.pexels.com/photos/4101182/pexels-photo-4101182.jpeg?auto=compress&cs=tinysrgb&h=600&w=800',
      [PromptCategory.WORK_CAREER]: 'https://images.pexels.com/photos/3184297/pexels-photo-3184297.jpeg?auto=compress&cs=tinysrgb&h=600&w=800',
      [PromptCategory.PERSONAL_GROWTH]: 'https://images.pexels.com/photos/1557238/pexels-photo-1557238.jpeg?auto=compress&cs=tinysrgb&h=600&w=800',
      [PromptCategory.HEALTH_WELLNESS]: 'https://images.pexels.com/photos/1552102/pexels-photo-1552102.jpeg?auto=compress&cs=tinysrgb&h=600&w=800',
      [PromptCategory.FEARS_ANXIETIES]: 'https://images.pexels.com/photos/3225517/pexels-photo-3225517.jpeg?auto=compress&cs=tinysrgb&h=600&w=800',
      [PromptCategory.DREAMS_ASPIRATIONS]: 'https://images.pexels.com/photos/2662116/pexels-photo-2662116.jpeg?auto=compress&cs=tinysrgb&h=600&w=800',
      [PromptCategory.PAST_EXPERIENCES]: 'https://images.pexels.com/photos/3930128/pexels-photo-3930128.jpeg?auto=compress&cs=tinysrgb&h=600&w=800',
      [PromptCategory.DAILY_MOMENTS]: 'https://images.pexels.com/photos/2127929/pexels-photo-2127929.jpeg?auto=compress&cs=tinysrgb&h=600&w=800',
      [PromptCategory.DAILY_CHECKIN]: 'https://images.pexels.com/photos/2127929/pexels-photo-2127929.jpeg?auto=compress&cs=tinysrgb&h=600&w=800'
    };
    return images[category] || 'https://images.pexels.com/photos/3573351/pexels-photo-3573351.jpeg?auto=compress&cs=tinysrgb&h=600&w=800';
  };

  /**
   * Handles prompt card press - tracks analytics and triggers callback
   */
  const handlePromptPress = () => {
    logger.info('Prompt card pressed', { 
      promptId: prompt.id, 
      category: prompt.category,
      level: prompt.level 
    });

    // Track prompt engagement analytics
    analytics.trackEngagement('prompt_used', {
      feature: 'intelligent_prompts',
      metadata: {
        promptId: prompt.id,
        category: prompt.category,
        level: prompt.level,
        isPersonalized: prompt.isPersonalized
      }
    });

    onPromptPress(prompt);
  };

  /**
   * Handles skip button press
   */
  const handleSkip = () => {
    if (onSkip) {
      logger.info('Prompt skipped', { promptId: prompt.id });
      
      analytics.trackEngagement('prompt_viewed', {
        feature: 'intelligent_prompts',
        metadata: {
          promptId: prompt.id,
          action: 'skipped',
          category: prompt.category
        }
      });

      onSkip(prompt.id);
    }
  };

  const categoryColor = getCategoryColor(prompt.category);

  const backgroundImageUri = getBackgroundImage(prompt.category);

  return (
    <View style={styles.cardContainer}>
      {/* Background layer */}
      <Image source={{ uri: backgroundImageUri }} style={styles.backgroundImage} />

      {/* Glass-style overlay with blur */}
      <BlurView intensity={Platform.OS === 'web' ? 50 : 80} style={styles.blurOverlay}>
        {/* Skip control (top-right) */}
        {onSkip && (
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip} activeOpacity={0.7}>
            <X size={18} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {/* Category chip (top-left) */}
        <View style={[styles.categoryChip, { backgroundColor: categoryColor + '33' }]}>
          <Text style={[styles.chipText, { color: categoryColor }]}> {getCategoryDisplayName(prompt.category)} </Text>
        </View>

        {/* Main prompt */}
        <View style={styles.mainPrompt}>
          <Text style={styles.greetingText}>{prompt.title}</Text>
          <Text style={styles.promptText}>{prompt.prompt}</Text>
        </View>

        {/* Single voice-record action styled like the main yellow orb */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.speakButton}
            onPress={handlePromptPress}
            activeOpacity={0.8}
          >
            <Mic color="#121820" size={32} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    height: CARD_HEIGHT,
    marginBottom: 24,
    borderRadius: 24,
    overflow: 'hidden',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  blurOverlay: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  skipButton: {
    position: 'absolute',
    top: 24,
    right: 24,
    padding: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  categoryChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  chipText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    textTransform: 'capitalize',
  },
  mainPrompt: {
    flex: 1,
    justifyContent: 'center',
  },
  greetingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 12,
  },
  promptText: {
    fontSize: 20,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    lineHeight: 34,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  /**
   * speakButton visually mirrors the yellow orb in Workshop screen
   * Provides consistent primary-action affordance across UI
   */
  speakButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFC300',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFC300',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
}); 