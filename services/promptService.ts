import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

/**
 * Prompt categories for diverse life exploration
 * Based on psychological well-being domains
 */
export enum PromptCategory {
  RELATIONSHIPS = 'relationships',
  WORK_CAREER = 'work_career', 
  PERSONAL_GROWTH = 'personal_growth',
  HEALTH_WELLNESS = 'health_wellness',
  FEARS_ANXIETIES = 'fears_anxieties',
  DREAMS_ASPIRATIONS = 'dreams_aspirations',
  PAST_EXPERIENCES = 'past_experiences',
  DAILY_MOMENTS = 'daily_moments'
}

/**
 * Prompt interface for structured suggestions
 */
export interface JournalPrompt {
  id: string;
  category: PromptCategory;
  title: string;
  prompt: string;
  level: 'surface' | 'medium' | 'deep';
  isPersonalized: boolean;
}

/**
 * PromptService - Generates personalized journal prompts to encourage diverse exploration
 * Uses AI analysis of past entries to identify unexplored areas and create curiosity gaps
 */
export class PromptService {
  /**
   * Gets personalized prompts based on user's journal history and gaps
   * Analyzes patterns to suggest unexplored or underexplored topics
   */
  static async getPersonalizedPrompts(userId: string, limit: number = 3): Promise<JournalPrompt[]> {
    logger.info('Generating personalized prompts', { userId, limit });
    
    try {
      // Get user's recent journal entries to analyze patterns
      const { data: recentEntries, error } = await supabase
        .from('sessions')
        .select('transcript, reframed_text, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        logger.error('Failed to fetch recent entries for prompts', { userId, error });
        return this.getFallbackPrompts(limit);
      }

      // Analyze which categories the user has explored
      const exploredCategories = this.analyzeTopicCoverage(recentEntries || []);
      const unexploredCategories = this.getUnexploredCategories(exploredCategories);
      
      // Generate prompts prioritizing unexplored areas
      const personalizedPrompts = this.generatePromptsForCategories(
        unexploredCategories.slice(0, limit),
        true // isPersonalized = true
      );

      logger.info('Generated personalized prompts', { 
        userId, 
        exploredCategories: exploredCategories.length,
        unexploredCategories: unexploredCategories.length,
        promptsGenerated: personalizedPrompts.length 
      });

      return personalizedPrompts;

    } catch (error) {
      logger.error('Error generating personalized prompts', { userId, error });
      return this.getFallbackPrompts(limit);
    }
  }

  /**
   * Analyzes user's past entries to determine which life areas they've explored
   * Uses keyword matching and pattern recognition
   */
  private static analyzeTopicCoverage(entries: any[]): PromptCategory[] {
    const categoryKeywords = {
      [PromptCategory.RELATIONSHIPS]: ['relationship', 'friend', 'family', 'partner', 'love', 'conflict'],
      [PromptCategory.WORK_CAREER]: ['work', 'job', 'career', 'boss', 'colleague', 'meeting', 'deadline'],
      [PromptCategory.FEARS_ANXIETIES]: ['fear', 'anxious', 'worried', 'nervous', 'scared', 'panic'],
      [PromptCategory.HEALTH_WELLNESS]: ['health', 'exercise', 'sleep', 'energy', 'tired', 'wellness'],
      [PromptCategory.PERSONAL_GROWTH]: ['growth', 'learn', 'improve', 'change', 'goal', 'habit'],
      [PromptCategory.DREAMS_ASPIRATIONS]: ['dream', 'hope', 'future', 'aspire', 'vision', 'imagine'],
      [PromptCategory.PAST_EXPERIENCES]: ['remember', 'past', 'childhood', 'memory', 'used to', 'before'],
      [PromptCategory.DAILY_MOMENTS]: ['today', 'morning', 'evening', 'moment', 'right now', 'currently']
    };

    const exploredCategories: PromptCategory[] = [];
    const allText = entries.map(e => `${e.transcript} ${e.reframed_text}`).join(' ').toLowerCase();

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      const hasKeywords = keywords.some(keyword => allText.includes(keyword));
      if (hasKeywords) {
        exploredCategories.push(category as PromptCategory);
      }
    }

    return exploredCategories;
  }

  /**
   * Identifies categories the user hasn't explored recently
   * Prioritizes for prompt generation
   */
  private static getUnexploredCategories(exploredCategories: PromptCategory[]): PromptCategory[] {
    const allCategories = Object.values(PromptCategory);
    return allCategories.filter(category => !exploredCategories.includes(category));
  }

  /**
   * Generates specific prompts for given categories
   * Creates curiosity gaps and gentle challenges
   */
  private static generatePromptsForCategories(
    categories: PromptCategory[], 
    isPersonalized: boolean
  ): JournalPrompt[] {
    interface PromptTemplate {
      title: string;
      prompt: string;
      level: 'surface' | 'medium' | 'deep';
    }

    const promptTemplates: Partial<Record<PromptCategory, PromptTemplate[]>> = {
      [PromptCategory.RELATIONSHIPS]: [
        {
          title: "Connection Reflection",
          prompt: "Think about a relationship that brings you joy. What words do you use to describe how they make you feel?",
          level: 'surface'
        },
        {
          title: "Conflict Reframing", 
          prompt: "Recall a recent disagreement. What if you replaced 'they're wrong' with 'we see differently'?",
          level: 'medium'
        }
      ],
      [PromptCategory.WORK_CAREER]: [
        {
          title: "Work Energy Audit",
          prompt: "What tasks at work drain you vs. energize you? How might you reframe the draining ones?",
          level: 'surface'
        }
      ],
      [PromptCategory.FEARS_ANXIETIES]: [
        {
          title: "Fear Transformation",
          prompt: "What's one fear you carry? What if instead of 'I'm afraid of...' you said 'I'm curious about...'?",
          level: 'deep'
        }
      ]
      // Add more categories as needed
    };

    const prompts: JournalPrompt[] = [];
    
    categories.forEach(category => {
      const templates = promptTemplates[category] || [];
      templates.forEach((template: PromptTemplate, index: number) => {
        prompts.push({
          id: `${category}_${index}_${Date.now()}`,
          category,
          title: template.title,
          prompt: template.prompt,
          level: template.level,
          isPersonalized
        });
      });
    });

    return prompts;
  }

  /**
   * Fallback prompts when personalization fails
   * General prompts that work for any user
   */
  private static getFallbackPrompts(limit: number): JournalPrompt[] {
    const fallbackPrompts = [
      {
        id: 'fallback_1',
        category: PromptCategory.DAILY_MOMENTS,
        title: "Right Now Reflection",
        prompt: "What's happening in your mind right now? What words are you using to describe this moment?",
        level: 'surface' as const,
        isPersonalized: false
      },
      {
        id: 'fallback_2', 
        category: PromptCategory.PERSONAL_GROWTH,
        title: "Growth Opportunity",
        prompt: "Think of something challenging you're facing. How might you reframe it as a growth opportunity?",
        level: 'medium' as const,
        isPersonalized: false
      }
    ];

    return fallbackPrompts.slice(0, limit);
  }

  /**
   * Gets prompts by specific category
   * Useful for themed weeks or focused exploration
   */
  static async getPromptsByCategory(
    category: PromptCategory, 
    limit: number = 5
  ): Promise<JournalPrompt[]> {
    logger.info('Getting prompts by category', { category, limit });
    return this.generatePromptsForCategories([category], false).slice(0, limit);
  }

  /**
   * Tracks when a user engages with a prompt
   * Helps measure prompt effectiveness and user preferences
   */
  static async trackPromptEngagement(
    userId: string, 
    promptId: string, 
    action: 'viewed' | 'used' | 'skipped'
  ): Promise<void> {
    logger.info('Tracking prompt engagement', { userId, promptId, action });
    
    try {
      const { error } = await supabase
        .from('prompt_engagement')
        .insert({
          user_id: userId,
          prompt_id: promptId,
          action,
          created_at: new Date().toISOString()
        });

      if (error) {
        logger.error('Failed to track prompt engagement', { userId, promptId, error });
      }
    } catch (error) {
      logger.error('Error tracking prompt engagement', { userId, promptId, error });
    }
  }
} 