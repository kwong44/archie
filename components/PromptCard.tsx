/**
 * PromptCard Component for The Architect
 * Displays intelligent journal prompts with reframing suggestions
 * Follows UI guidelines for consistent styling and user experience
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { JournalPrompt, PromptCategory } from '@/services/promptService';
import { useAnalytics } from '@/lib/analytics';
import { logger } from '@/lib/logger';

interface PromptCardProps {
  prompt: JournalPrompt;
  onPromptPress: (prompt: JournalPrompt) => void;
  onSkip?: (promptId: string) => void;
}

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
      [PromptCategory.DAILY_MOMENTS]: 'Daily Moments'
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
      [PromptCategory.DAILY_MOMENTS]: '#6B7280' // Gray
    };
    return categoryColors[category] || '#9CA3AF';
  };

  /**
   * Gets depth level indicator
   */
  const getDepthIndicator = (level: 'surface' | 'medium' | 'deep'): string => {
    const indicators: Record<'surface' | 'medium' | 'deep', string> = {
      'surface': '○',
      'medium': '◐', 
      'deep': '●'
    };
    return indicators[level] || '○';
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

  return (
    <View style={styles.container}>
      {/* Category and Level Header */}
      <View style={styles.header}>
        <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '20' }]}>
          <Text style={[styles.categoryText, { color: categoryColor }]}>
            {getCategoryDisplayName(prompt.category)}
          </Text>
        </View>
        <View style={styles.levelContainer}>
          <Text style={styles.levelIndicator}>
            {getDepthIndicator(prompt.level as 'surface' | 'medium' | 'deep')}
          </Text>
          <Text style={styles.levelText}>{prompt.level}</Text>
        </View>
      </View>

      {/* Prompt Title */}
      <Text style={styles.title}>{prompt.title}</Text>

      {/* Prompt Question */}
      <Text style={styles.prompt}>{prompt.prompt}</Text>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.useButton}
          onPress={handlePromptPress}
          activeOpacity={0.8}
        >
          <Text style={styles.useButtonText}>Use This Prompt</Text>
        </TouchableOpacity>
        
        {onSkip && (
          <TouchableOpacity 
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.8}
          >
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Personalization Indicator */}
      {prompt.isPersonalized && (
        <View style={styles.personalizedBadge}>
          <Text style={styles.personalizedText}>✨ Personalized for you</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1F2937', // component-background
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#374151', // border
    padding: 20,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    flex: 1,
    marginRight: 12,
  },
  categoryText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
  },
  levelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelIndicator: {
    fontSize: 16,
    color: '#9CA3AF', // text-secondary
    marginRight: 4,
  },
  levelText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF', // text-secondary
    textTransform: 'capitalize',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#F5F5F0', // text-primary
    marginBottom: 12,
  },
  prompt: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#F5F5F0', // text-primary
    lineHeight: 24,
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  useButton: {
    backgroundColor: '#FFC300', // accent-primary
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    flex: 1,
  },
  useButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#121820', // primary-background (contrast text)
    textAlign: 'center',
  },
  skipButton: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151', // border
  },
  skipButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF', // text-secondary
    textAlign: 'center',
  },
  personalizedBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    backgroundColor: '#10B981', // accent-success
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  personalizedText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#F5F5F0', // text-primary
  },
}); 