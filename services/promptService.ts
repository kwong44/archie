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
        .from('journal_sessions')
        .select('original_transcript, reframed_text, created_at')
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
    const allText = entries.map(e => `${e.original_transcript} ${e.reframed_text}`).join(' ').toLowerCase();

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
        },
        {
          title: "Love Language Discovery",
          prompt: "How do you express care for others? What if 'I should do more' became 'I choose to show love differently'?",
          level: 'deep'
        }
      ],
      [PromptCategory.WORK_CAREER]: [
        {
          title: "Work Energy Audit",
          prompt: "What tasks at work drain you vs. energize you? How might you reframe the draining ones?",
          level: 'surface'
        },
        {
          title: "Career Visioning",
          prompt: "Where do you see your career in 3 years? What if 'I don't know' became 'I'm exploring possibilities'?",
          level: 'medium'
        },
        {
          title: "Purpose Alignment",
          prompt: "How does your current work connect to your deeper purpose? Reframe any 'meaningless' work as 'stepping stones'.",
          level: 'deep'
        }
      ],
      [PromptCategory.FEARS_ANXIETIES]: [
        {
          title: "Fear Transformation",
          prompt: "What's one fear you carry? What if instead of 'I'm afraid of...' you said 'I'm curious about...'?",
          level: 'deep'
        },
        {
          title: "Anxiety Reframing",
          prompt: "When you feel anxious, what words run through your mind? How could you shift them to be more gentle?",
          level: 'medium'
        },
        {
          title: "Courage Discovery",
          prompt: "Think of a time you were brave. What if 'I can't handle this' became 'I've handled challenges before'?",
          level: 'surface'
        }
      ],
      [PromptCategory.PERSONAL_GROWTH]: [
        {
          title: "Growth Edge Exploration",
          prompt: "What's one area where you want to grow? What if 'I'm not good at...' became 'I'm learning to...'?",
          level: 'surface'
        },
        {
          title: "Habit Formation",
          prompt: "What habit would transform your daily life? How could you reframe past 'failures' as 'practice rounds'?",
          level: 'medium'
        },
        {
          title: "Identity Evolution",
          prompt: "Who are you becoming? What if 'I'm not that type of person' became 'I'm growing into that person'?",
          level: 'deep'
        }
      ],
      [PromptCategory.HEALTH_WELLNESS]: [
        {
          title: "Energy Check-in",
          prompt: "How is your body feeling today? What if 'I'm exhausted' became 'I'm ready to restore my energy'?",
          level: 'surface'
        },
        {
          title: "Wellness Priorities",
          prompt: "What does taking care of yourself look like? How could you reframe self-care as self-respect?",
          level: 'medium'
        },
        {
          title: "Body Wisdom",
          prompt: "What is your body trying to tell you? What if physical discomfort became a 'message to decode'?",
          level: 'deep'
        }
      ],
      [PromptCategory.DREAMS_ASPIRATIONS]: [
        {
          title: "Dream Exploration",
          prompt: "What's one dream you've been carrying? What if 'it's impossible' became 'it's possible in ways I haven't imagined yet'?",
          level: 'surface'
        },
        {
          title: "Vision Clarification",
          prompt: "If anything were possible, what would you create? How could you shift from 'someday' to 'today I begin'?",
          level: 'medium'
        },
        {
          title: "Legacy Reflection",
          prompt: "What impact do you want to have? What if 'I'm not important enough' became 'my unique contribution matters'?",
          level: 'deep'
        }
      ],
      [PromptCategory.PAST_EXPERIENCES]: [
        {
          title: "Memory Reframing",
          prompt: "Think of a challenging past experience. What if it was exactly what you needed to become who you are?",
          level: 'surface'
        },
        {
          title: "Wisdom Extraction",
          prompt: "What did a difficult time teach you? How could past 'mistakes' become 'learning investments'?",
          level: 'medium'
        },
        {
          title: "Healing Integration",
          prompt: "How has your past shaped your strength? What if old wounds became 'sources of compassion and wisdom'?",
          level: 'deep'
        }
      ],
      [PromptCategory.DAILY_MOMENTS]: [
        {
          title: "Present Moment Awareness",
          prompt: "What's happening around you right now? What if this ordinary moment contains something extraordinary?",
          level: 'surface'
        },
        {
          title: "Gratitude Transformation",
          prompt: "What's one small thing you appreciate today? How could you shift from 'taking for granted' to 'receiving gifts'?",
          level: 'medium'
        },
        {
          title: "Mindful Reflection",
          prompt: "How are you showing up in this moment? What if every interaction is a chance to practice your values?",
          level: 'deep'
        }
      ]
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
    prompt: JournalPrompt, 
    action: 'viewed' | 'used' | 'skipped'
  ): Promise<void> {
    logger.info('Tracking prompt engagement', { userId, promptId: prompt.id, action });
    
    try {
      const { error } = await supabase
        .from('prompt_engagement')
        .insert({
          user_id: userId,
          prompt_id: prompt.id,
          prompt_category: prompt.category,
          prompt_title: prompt.title,
          prompt_text: prompt.prompt,
          action,
          created_at: new Date().toISOString()
        });

      if (error) {
        logger.error('Failed to track prompt engagement', { 
          userId, 
          promptId: prompt.id, 
          error 
        });
        
        // Track the error for monitoring
        throw error;
      } else {
        logger.info('Prompt engagement tracked successfully', { 
          userId, 
          promptId: prompt.id, 
          category: prompt.category, 
          title: prompt.title,
          action 
        });
      }
    } catch (error) {
      logger.error('Error tracking prompt engagement', { 
        userId, 
        promptId: prompt.id, 
        error 
      });
      
      // Re-throw to let calling code handle the error appropriately
      throw error;
    }
  }
} 