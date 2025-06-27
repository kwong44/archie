import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

/**
 * Interface for achievement definitions with criteria and metadata
 */
interface AchievementDefinition {
  type: string;
  name: string;
  description: string;
  iconName: string;
  criteria: (metrics: UserActivityMetrics) => boolean;
}

/**
 * Interface for user activity metrics used in achievement calculations
 */
interface UserActivityMetrics {
  totalSessions: number;
  totalTransformations: number;
  currentStreak: number;
  longestStreak: number;
  weeklySessionCount: number;
  averageSessionDuration: number;
  firstSessionDate: string | null;
  daysSinceFirstSession: number;
}

/**
 * Interface for achievement award result
 */
interface AchievementAwardResult {
  awarded: boolean;
  achievementType: string;
  achievementName: string;
  isNew: boolean;
}

/**
 * Achievements service handling all gamification logic
 * Calculates user progress and awards achievements based on activity patterns
 */
export class AchievementsService {
  /**
   * Comprehensive list of achievement definitions with unlock criteria
   * Each achievement has specific requirements based on user activity metrics
   */
  private static readonly ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
    // Beginner achievements (early engagement)
    {
      type: 'first_session',
      name: 'First Steps',
      description: 'Completed your first journal session',
      iconName: 'play',
      criteria: (metrics) => metrics.totalSessions >= 1
    },
    {
      type: 'first_week',
      name: 'Getting Started',
      description: 'Journaled for a full week',
      iconName: 'calendar',
      criteria: (metrics) => metrics.daysSinceFirstSession >= 7 && metrics.totalSessions >= 3
    },
    {
      type: 'first_transformation',
      name: 'Word Alchemist',
      description: 'Applied your first word transformation',
      iconName: 'zap',
      criteria: (metrics) => metrics.totalTransformations >= 1
    },

    // Consistency achievements (habit building)
    {
      type: 'streak_3',
      name: 'Momentum Builder',
      description: 'Maintained a 3-day streak',
      iconName: 'trending-up',
      criteria: (metrics) => metrics.currentStreak >= 3
    },
    {
      type: 'streak_7',
      name: 'Week Warrior',
      description: 'Maintained a 7-day streak',
      iconName: 'shield',
      criteria: (metrics) => metrics.currentStreak >= 7
    },
    {
      type: 'streak_30',
      name: 'Mindful Master',
      description: 'Maintained a 30-day streak',
      iconName: 'crown',
      criteria: (metrics) => metrics.currentStreak >= 30
    },

    // Volume achievements (engagement depth)
    {
      type: 'sessions_10',
      name: 'Dedicated Journaler',
      description: 'Completed 10 journal sessions',
      iconName: 'book',
      criteria: (metrics) => metrics.totalSessions >= 10
    },
    {
      type: 'sessions_25',
      name: 'Transformation Seeker',
      description: 'Completed 25 journal sessions',
      iconName: 'compass',
      criteria: (metrics) => metrics.totalSessions >= 25
    },
    {
      type: 'sessions_50',
      name: 'Inner Architect',
      description: 'Completed 50 journal sessions',
      iconName: 'award',
      criteria: (metrics) => metrics.totalSessions >= 50
    },

    // Transformation achievements (usage mastery)
    {
      type: 'transformations_10',
      name: 'Language Shifter',
      description: 'Applied 10 word transformations',
      iconName: 'shuffle',
      criteria: (metrics) => metrics.totalTransformations >= 10
    },
    {
      type: 'transformations_50',
      name: 'Mindset Sculptor',
      description: 'Applied 50 word transformations',
      iconName: 'hammer',
      criteria: (metrics) => metrics.totalTransformations >= 50
    },
    {
      type: 'transformations_100',
      name: 'Reality Architect',
      description: 'Applied 100 word transformations',
      iconName: 'building',
      criteria: (metrics) => metrics.totalTransformations >= 100
    },

    // Engagement achievements (quality over quantity)
    {
      type: 'weekly_active',
      name: 'Weekly Practitioner',
      description: 'Completed 5+ sessions this week',
      iconName: 'star',
      criteria: (metrics) => metrics.weeklySessionCount >= 5
    },
    {
      type: 'deep_thinker',
      name: 'Deep Thinker',
      description: 'Average session duration over 3 minutes',
      iconName: 'brain',
      criteria: (metrics) => metrics.averageSessionDuration >= 180 // 3 minutes in seconds
    },

    // Milestone achievements (long-term commitment)
    {
      type: 'month_one',
      name: 'One Month Strong',
      description: 'Journaling for 30+ days',
      iconName: 'calendar-check',
      criteria: (metrics) => metrics.daysSinceFirstSession >= 30 && metrics.totalSessions >= 15
    }
  ];

  /**
   * Calculates comprehensive user activity metrics from database
   * Aggregates data from journal sessions, transformations, and usage patterns
   * 
   * @param userId - The authenticated user's ID
   * @returns Promise resolving to complete activity metrics
   */
  static async calculateUserMetrics(userId: string): Promise<UserActivityMetrics> {
    logger.info('Calculating user activity metrics for achievements', { userId });

    try {
      // Fetch all journal sessions for the user
      const { data: sessions, error: sessionsError } = await supabase
        .from('journal_sessions')
        .select('created_at, session_duration_seconds')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (sessionsError) {
        logger.error('Failed to fetch sessions for metrics calculation', { userId, error: sessionsError });
        throw new Error('Failed to calculate user metrics', { cause: sessionsError });
      }

      // Fetch transformation usage count
      const { data: transformations, error: transformationsError } = await supabase
        .from('transformation_usage')
        .select('id')
        .eq('user_id', userId);

      if (transformationsError) {
        logger.error('Failed to fetch transformations for metrics calculation', { userId, error: transformationsError });
        throw new Error('Failed to calculate user metrics', { cause: transformationsError });
      }

      // Calculate basic metrics
      const totalSessions = sessions?.length || 0;
      const totalTransformations = transformations?.length || 0;
      const firstSessionDate = sessions && sessions.length > 0 ? sessions[0].created_at : null;

      // Calculate day-based metrics
      const daysSinceFirstSession = firstSessionDate 
        ? Math.floor((Date.now() - new Date(firstSessionDate).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      // Calculate session duration average
      const totalDuration = sessions?.reduce((sum, session) => 
        sum + (session.session_duration_seconds || 0), 0
      ) || 0;
      const averageSessionDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;

      // Calculate current streak
      const currentStreak = await this.calculateCurrentStreak(userId);

      // Calculate longest streak (simplified - just use current for now)
      const longestStreak = currentStreak;

      // Calculate weekly session count
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      const weeklySessionCount = sessions?.filter(session => 
        new Date(session.created_at) >= weekStart
      ).length || 0;

      const metrics: UserActivityMetrics = {
        totalSessions,
        totalTransformations,
        currentStreak,
        longestStreak,
        weeklySessionCount,
        averageSessionDuration,
        firstSessionDate,
        daysSinceFirstSession
      };

      logger.info('User activity metrics calculated successfully', { 
        userId, 
        metrics: {
          totalSessions,
          totalTransformations,
          currentStreak,
          weeklySessionCount,
          daysSinceFirstSession
        }
      });

      return metrics;

    } catch (error) {
      logger.error('Error calculating user activity metrics', { userId, error });
      throw error;
    }
  }

  /**
   * Calculates the user's current consecutive day streak
   * Reuses logic from DashboardService for consistency
   * 
   * @param userId - The authenticated user's ID
   * @returns Promise resolving to current streak count
   */
  private static async calculateCurrentStreak(userId: string): Promise<number> {
    try {
      const { data: sessions, error } = await supabase
        .from('journal_sessions')
        .select('created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error || !sessions || sessions.length === 0) {
        return 0;
      }

      // Group sessions by date
      const sessionDates = new Set(
        sessions.map(session => 
          new Date(session.created_at).toISOString().split('T')[0]
        )
      );

      // Calculate consecutive days
      let streak = 0;
      const today = new Date();
      
      for (let i = 0; i < 365; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const dateString = checkDate.toISOString().split('T')[0];
        
        if (sessionDates.has(dateString)) {
          streak++;
        } else if (i === 0) {
          continue; // Allow for today not having sessions yet
        } else {
          break; // Streak is broken
        }
      }

      return streak;

    } catch (error) {
      logger.error('Error calculating current streak for achievements', { userId, error });
      return 0;
    }
  }

  /**
   * Checks and awards achievements for a user based on their current activity
   * Returns list of newly awarded achievements
   * 
   * @param userId - The authenticated user's ID
   * @returns Promise resolving to array of achievement award results
   */
  static async checkAndAwardAchievements(userId: string): Promise<AchievementAwardResult[]> {
    logger.info('Checking achievements for user', { userId });

    try {
      // Get current user metrics
      const metrics = await this.calculateUserMetrics(userId);

      // Get existing achievements to prevent duplicates
      const { data: existingAchievements, error: achievementsError } = await supabase
        .from('user_achievements')
        .select('achievement_type')
        .eq('user_id', userId);

      if (achievementsError) {
        logger.error('Failed to fetch existing achievements', { userId, error: achievementsError });
        throw new Error('Failed to check achievements', { cause: achievementsError });
      }

      const existingTypes = new Set(existingAchievements?.map(a => a.achievement_type) || []);
      const awardResults: AchievementAwardResult[] = [];

      // Check each achievement definition against user metrics
      for (const achievement of this.ACHIEVEMENT_DEFINITIONS) {
        const isAlreadyAwarded = existingTypes.has(achievement.type);
        const meetsyCriteria = achievement.criteria(metrics);

        if (meetsyCriteria && !isAlreadyAwarded) {
          // Award the achievement
          const { error: insertError } = await supabase
            .from('user_achievements')
            .insert({
              user_id: userId,
              achievement_type: achievement.type,
              achievement_name: achievement.name,
              achievement_description: achievement.description,
              icon_name: achievement.iconName,
              earned_at: new Date().toISOString()
            });

          if (insertError) {
            logger.error('Failed to award achievement', { 
              userId, 
              achievementType: achievement.type,
              error: insertError 
            });
            continue; // Skip this achievement but continue with others
          }

          awardResults.push({
            awarded: true,
            achievementType: achievement.type,
            achievementName: achievement.name,
            isNew: true
          });

          logger.info('Achievement awarded', { 
            userId, 
            achievementType: achievement.type,
            achievementName: achievement.name
          });
        } else {
          // Track achievement status for debugging
          awardResults.push({
            awarded: meetsyCriteria,
            achievementType: achievement.type,
            achievementName: achievement.name,
            isNew: false
          });
        }
      }

      const newAchievements = awardResults.filter(result => result.isNew);
      logger.info('Achievement check completed', { 
        userId, 
        totalChecked: this.ACHIEVEMENT_DEFINITIONS.length,
        newAchievements: newAchievements.length
      });

      return awardResults;

    } catch (error) {
      logger.error('Error checking and awarding achievements', { userId, error });
      throw error;
    }
  }

  /**
   * Awards achievements after a journal session is completed
   * This is the main entry point called from session completion
   * 
   * @param userId - The authenticated user's ID
   * @returns Promise resolving to newly awarded achievements
   */
  static async processSessionAchievements(userId: string): Promise<AchievementAwardResult[]> {
    logger.info('Processing post-session achievements', { userId });

    try {
      const results = await this.checkAndAwardAchievements(userId);
      const newAchievements = results.filter(result => result.isNew);

      if (newAchievements.length > 0) {
        logger.info('New achievements awarded after session', { 
          userId,
          newAchievements: newAchievements.map(a => a.achievementName)
        });
      }

      return newAchievements;

    } catch (error) {
      logger.error('Error processing session achievements', { userId, error });
      // Don't throw error - achievements are nice-to-have, not critical
      return [];
    }
  }

  /**
   * Gets all achievements available in the system
   * Used for displaying achievement requirements in UI
   * 
   * @returns Array of all achievement definitions
   */
  static getAllAchievementDefinitions(): AchievementDefinition[] {
    return [...this.ACHIEVEMENT_DEFINITIONS];
  }

  /**
   * Gets user's progress toward specific achievement
   * Useful for showing progress bars in UI
   * 
   * @param userId - The authenticated user's ID
   * @param achievementType - The specific achievement to check progress for
   * @returns Promise resolving to progress information
   */
  static async getAchievementProgress(
    userId: string, 
    achievementType: string
  ): Promise<{ current: number; required: number; percentage: number } | null> {
    logger.info('Getting achievement progress', { userId, achievementType });

    try {
      const metrics = await this.calculateUserMetrics(userId);
      const achievement = this.ACHIEVEMENT_DEFINITIONS.find(a => a.type === achievementType);

      if (!achievement) {
        logger.warn('Achievement type not found', { achievementType });
        return null;
      }

      // Extract progress information based on achievement type
      let current = 0;
      let required = 0;

      // Map achievement types to their progress tracking
      switch (true) {
        case achievementType.includes('session'):
          const sessionTarget = parseInt(achievementType.split('_')[1]) || 1;
          current = metrics.totalSessions;
          required = sessionTarget;
          break;
        case achievementType.includes('transformation'):
          const transformationTarget = parseInt(achievementType.split('_')[1]) || 1;
          current = metrics.totalTransformations;
          required = transformationTarget;
          break;
        case achievementType.includes('streak'):
          const streakTarget = parseInt(achievementType.split('_')[1]) || 1;
          current = metrics.currentStreak;
          required = streakTarget;
          break;
        default:
          current = achievement.criteria(metrics) ? 1 : 0;
          required = 1;
      }

      const percentage = Math.min(Math.round((current / required) * 100), 100);

      logger.info('Achievement progress calculated', { 
        userId, 
        achievementType, 
        current, 
        required, 
        percentage 
      });

      return { current, required, percentage };

    } catch (error) {
      logger.error('Error getting achievement progress', { userId, achievementType, error });
      return null;
    }
  }
}

/**
 * Export types for use in other modules
 */
export type { AchievementDefinition, UserActivityMetrics, AchievementAwardResult }; 