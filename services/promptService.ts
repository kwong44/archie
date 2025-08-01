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
  DAILY_MOMENTS = 'daily_moments',
  DAILY_CHECKIN = 'daily_checkin', // Fallback for when all topics are explored
  GRATITUDE_PRACTICE = 'gratitude_practice',
  NEGATIVE_PATTERN_AWARENESS = 'negative_pattern_awareness',
  SELF_DISCOVERY = 'self_discovery',
  EMOTIONAL_INTELLIGENCE = 'emotional_intelligence',
  MINDFULNESS_PRESENCE = 'mindfulness_presence'
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
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        logger.error('Failed to fetch recent entries for prompts', { userId, error });
        return this.getFallbackPrompts(limit);
      }

      // Analyze which categories the user has explored
      const exploredCategories = this.analyzeTopicCoverage(recentEntries || []);
      let categoriesForPrompts = this.getUnexploredCategories(exploredCategories);
      let isPersonalized = true;

      // If all categories have been explored, use DAILY_CHECKIN as a resilient fallback
      if (categoriesForPrompts.length === 0 && recentEntries.length > 0) {
        logger.info('All topic categories explored, falling back to daily check-in prompts.', { userId });
        categoriesForPrompts = [PromptCategory.DAILY_CHECKIN];
        isPersonalized = false; // Indicate these are general, not based on gaps
      }
      
      // Generate prompts prioritizing unexplored areas or the fallback
      const generatedPrompts = this.generatePromptsForCategories(
        categoriesForPrompts.slice(0, limit),
        isPersonalized
      );

      logger.info('Generated personalized prompts', { 
        userId, 
        exploredCategories: exploredCategories.length,
        unexploredCategories: this.getUnexploredCategories(exploredCategories).length,
        promptsGenerated: generatedPrompts.length,
        usedFallback: categoriesForPrompts[0] === PromptCategory.DAILY_CHECKIN
      });

      return generatedPrompts;

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
      [PromptCategory.DAILY_MOMENTS]: ['today', 'morning', 'evening', 'moment', 'right now', 'currently'],
      [PromptCategory.GRATITUDE_PRACTICE]: ['grateful', 'thankful', 'appreciate', 'blessed', 'fortunate', 'gratitude'],
      [PromptCategory.NEGATIVE_PATTERN_AWARENESS]: ['negative', 'pattern', 'thought', 'thinking', 'mindset', 'belief'],
      [PromptCategory.SELF_DISCOVERY]: ['discover', 'explore', 'understand', 'know myself', 'identity', 'who i am'],
      [PromptCategory.EMOTIONAL_INTELLIGENCE]: ['emotion', 'feeling', 'empathy', 'emotional', 'intelligence', 'awareness'],
      [PromptCategory.MINDFULNESS_PRESENCE]: ['mindful', 'present', 'awareness', 'breath', 'meditation', 'conscious']
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
      ],
      [PromptCategory.DAILY_CHECKIN]: [
        {
          title: "Mindful Check-in",
          prompt: "Take a deep breath. What's the most present feeling in your body right now? No need to change it, just notice.",
          level: 'surface'
        },
        {
          title: "Energy Scan",
          prompt: "What is one thing that gave you energy today, and one thing that took it away? Let's explore that.",
          level: 'medium'
        },
        {
          title: "A Single Word",
          prompt: "If you had to describe your day so far in a single word, what would it be? Let's start there.",
          level: 'surface'
        },
        {
          title: "Gratitude Moment",
          prompt: "What's one small thing that went well today that you might have overlooked? How did it make you feel?",
          level: 'surface'
        },
        {
          title: "Challenge Reframe",
          prompt: "What was the most challenging moment today? How might you reframe it as an opportunity for growth?",
          level: 'medium'
        },
        {
          title: "Self-Compassion Check",
          prompt: "How did you treat yourself today? What would it look like to be as kind to yourself as you are to others?",
          level: 'deep'
        },
        {
          title: "Connection Reflection",
          prompt: "Who did you connect with today? How did those interactions leave you feeling?",
          level: 'surface'
        },
        {
          title: "Learning Moment",
          prompt: "What did you learn about yourself today, even if it was something small?",
          level: 'medium'
        },
        {
          title: "Tomorrow's Intention",
          prompt: "What's one thing you'd like to approach differently tomorrow? How could you reframe any resistance?",
          level: 'deep'
        },
        {
          title: "Body Wisdom",
          prompt: "What is your body asking for right now? How can you honor that need?",
          level: 'surface'
        }
      ],
      [PromptCategory.GRATITUDE_PRACTICE]: [
        {
          title: "Hidden Blessings",
          prompt: "What's something that initially seemed negative but actually led to something positive?",
          level: 'medium'
        },
        {
          title: "People Appreciation",
          prompt: "Who has made a positive impact on your life recently? How did they show up for you?",
          level: 'surface'
        },
        {
          title: "Skill Gratitude",
          prompt: "What's one skill or ability you have that you often take for granted? How does it serve you?",
          level: 'medium'
        },
        {
          title: "Comfort Gratitude",
          prompt: "What's one thing that brings you comfort that you're grateful for today?",
          level: 'surface'
        },
        {
          title: "Challenge Gratitude",
          prompt: "What's a difficult situation you're grateful for because it made you stronger?",
          level: 'deep'
        },
        {
          title: "Nature's Gifts",
          prompt: "What's one thing in nature you're grateful for today? How does it connect you to something larger?",
          level: 'surface'
        },
        {
          title: "Past Self Gratitude",
          prompt: "What's something your past self did that you're grateful for today?",
          level: 'medium'
        },
        {
          title: "Abundance Recognition",
          prompt: "What's one thing you have in abundance that others might not? How does this shape your perspective?",
          level: 'deep'
        }
      ],
      [PromptCategory.NEGATIVE_PATTERN_AWARENESS]: [
        {
          title: "Thought Pattern Detective",
          prompt: "What's a recurring negative thought you've noticed? What triggers it?",
          level: 'surface'
        },
        {
          title: "Self-Criticism Awareness",
          prompt: "What's something you often criticize yourself for? How would you talk to a friend about the same thing?",
          level: 'medium'
        },
        {
          title: "Comparison Trap",
          prompt: "When do you find yourself comparing yourself to others? What's really driving that comparison?",
          level: 'medium'
        },
        {
          title: "Perfectionism Reflection",
          prompt: "Where does perfectionism show up in your life? What would 'good enough' look like instead?",
          level: 'deep'
        },
        {
          title: "Catastrophizing Check",
          prompt: "What's a situation where you're imagining the worst-case scenario? What's a more balanced perspective?",
          level: 'medium'
        },
        {
          title: "All-or-Nothing Thinking",
          prompt: "Where do you see black-and-white thinking in your life? What shades of gray exist?",
          level: 'deep'
        },
        {
          title: "Should Statements",
          prompt: "What 'should' statements do you tell yourself? How could you reframe them with more compassion?",
          level: 'medium'
        },
        {
          title: "Emotional Reasoning",
          prompt: "When do you let your feelings determine what you believe to be true? What's the difference?",
          level: 'deep'
        }
      ],
      [PromptCategory.SELF_DISCOVERY]: [
        {
          title: "Core Values Check",
          prompt: "What's one of your core values? How did you live it out today?",
          level: 'surface'
        },
        {
          title: "Strengths Recognition",
          prompt: "What's a strength you have that you don't often acknowledge? How does it show up in your life?",
          level: 'medium'
        },
        {
          title: "Boundary Reflection",
          prompt: "Where do you need to set or strengthen boundaries? What would that look like?",
          level: 'deep'
        },
        {
          title: "Authenticity Moment",
          prompt: "When did you feel most like yourself today? What made that moment special?",
          level: 'surface'
        },
        {
          title: "Growth Edge",
          prompt: "What's one area where you're stretching beyond your comfort zone? How does that feel?",
          level: 'medium'
        },
        {
          title: "Inner Wisdom",
          prompt: "What's something your intuition has been trying to tell you? How can you listen more closely?",
          level: 'deep'
        },
        {
          title: "Passion Exploration",
          prompt: "What activities make you lose track of time? What does that tell you about what you love?",
          level: 'medium'
        },
        {
          title: "Identity Evolution",
          prompt: "How have you changed in the past year? What parts of yourself are you discovering?",
          level: 'deep'
        }
      ],
      [PromptCategory.EMOTIONAL_INTELLIGENCE]: [
        {
          title: "Emotion Naming",
          prompt: "What emotions are you feeling right now? Can you name them specifically?",
          level: 'surface'
        },
        {
          title: "Emotion Origins",
          prompt: "What triggered a strong emotion today? What was really behind that feeling?",
          level: 'medium'
        },
        {
          title: "Emotional Patterns",
          prompt: "What emotions do you tend to avoid? What happens when you allow yourself to feel them?",
          level: 'deep'
        },
        {
          title: "Empathy Practice",
          prompt: "How did you show empathy to someone today? How did it feel to connect with their experience?",
          level: 'medium'
        },
        {
          title: "Emotional Regulation",
          prompt: "What helps you calm down when you're overwhelmed? How can you make that more accessible?",
          level: 'surface'
        },
        {
          title: "Emotional Boundaries",
          prompt: "How do you handle other people's emotions? Where do you need to set boundaries?",
          level: 'deep'
        },
        {
          title: "Joy Cultivation",
          prompt: "What brings you genuine joy? How can you create more space for that in your life?",
          level: 'medium'
        },
        {
          title: "Emotional Courage",
          prompt: "What emotion are you afraid to feel? What would it be like to welcome it with curiosity?",
          level: 'deep'
        }
      ],
      [PromptCategory.MINDFULNESS_PRESENCE]: [
        {
          title: "Present Moment",
          prompt: "What do you notice about your surroundings right now? What details are you usually too busy to see?",
          level: 'surface'
        },
        {
          title: "Breath Awareness",
          prompt: "Take three deep breaths. What do you notice about your breathing? How does it change your state?",
          level: 'surface'
        },
        {
          title: "Sensory Experience",
          prompt: "What do you hear, see, smell, taste, and feel right now? How does paying attention change the experience?",
          level: 'medium'
        },
        {
          title: "Thought Observation",
          prompt: "What thoughts are passing through your mind? Can you observe them without getting caught up in them?",
          level: 'deep'
        },
        {
          title: "Body Scan",
          prompt: "Starting from your toes, scan your body. What sensations do you notice? What are they telling you?",
          level: 'medium'
        },
        {
          title: "Mindful Eating",
          prompt: "Think about your last meal. What would it be like to eat with full attention to taste, texture, and gratitude?",
          level: 'surface'
        },
        {
          title: "Walking Meditation",
          prompt: "What do you notice when you walk mindfully? How does slowing down change your experience?",
          level: 'medium'
        },
        {
          title: "Digital Mindfulness",
          prompt: "How do you feel when you're on your phone? What would it be like to use technology more mindfully?",
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