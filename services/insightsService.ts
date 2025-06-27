import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { DashboardService } from './dashboardService';
import type { DashboardMetrics } from './dashboardService';

/**
 * Interface for individual insight with metadata
 */
export interface UserInsight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  category: InsightCategory;
  priority: InsightPriority;
  iconName: string;
  generatedAt: string;
  dataSource: string[];
}

/**
 * Enum for different types of insights
 */
export enum InsightType {
  CONSISTENCY_PATTERN = 'consistency_pattern',
  REFRAMING_EFFECTIVENESS = 'reframing_effectiveness',
  SESSION_TIMING = 'session_timing',
  WORD_PATTERN = 'word_pattern',
  STREAK_MOMENTUM = 'streak_momentum',
  ENGAGEMENT_DEPTH = 'engagement_depth',
  TRANSFORMATION_MASTERY = 'transformation_mastery',
  PROGRESS_MILESTONE = 'progress_milestone'
}

/**
 * Enum for insight categories
 */
export enum InsightCategory {
  MOTIVATION = 'motivation',
  PATTERN_RECOGNITION = 'pattern_recognition',
  ACHIEVEMENT = 'achievement',
  RECOMMENDATION = 'recommendation',
  CELEBRATION = 'celebration'
}

/**
 * Enum for insight priority levels
 */
export enum InsightPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

/**
 * Interface for insight generation context
 */
interface InsightContext {
  metrics: DashboardMetrics;
  sessionPatterns: SessionPattern[];
  recentActivity: RecentActivity;
  userTrends: UserTrends;
}

/**
 * Interface for session patterns analysis
 */
interface SessionPattern {
  dayOfWeek: number;
  averageTimeOfDay: number;
  averageDuration: number;
  sessionCount: number;
  mostActiveHour: number;
}

/**
 * Interface for recent activity summary
 */
interface RecentActivity {
  lastSessionDate: string | null;
  daysSinceLastSession: number;
  recentSessionDurations: number[];
  recentTransformationCounts: number[];
  topTransformedWords: { word: string; count: number }[];
}

/**
 * Interface for user trends over time
 */
interface UserTrends {
  sessionFrequencyTrend: 'increasing' | 'decreasing' | 'stable';
  reframingRateTrend: 'improving' | 'declining' | 'stable';
  engagementTrend: 'deepening' | 'shortening' | 'stable';
  overallMomentum: 'building' | 'maintaining' | 'declining';
}

/**
 * Insights service for generating rule-based personalized insights
 * Analyzes user patterns and provides actionable feedback
 */
export class InsightsService {
  /**
   * Generates comprehensive insights for a user based on their activity patterns
   * Combines multiple data sources to create personalized feedback
   * 
   * @param userId - The authenticated user's ID
   * @param limit - Maximum number of insights to generate (default: 5)
   * @returns Promise resolving to array of personalized insights
   */
  static async generateUserInsights(userId: string, limit: number = 5): Promise<UserInsight[]> {
    logger.info('Generating user insights', { userId, limit });

    try {
      // Gather comprehensive user data for analysis
      const context = await this.buildInsightContext(userId);
      
      // Generate insights using rule-based analysis
      const allInsights = await this.analyzeAndGenerateInsights(userId, context);
      
      // Sort by priority and return top insights
      const sortedInsights = allInsights
        .sort((a, b) => this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority))
        .slice(0, limit);

      logger.info('User insights generated successfully', {
        userId,
        totalGenerated: allInsights.length,
        returned: sortedInsights.length,
        categories: sortedInsights.map(i => i.category)
      });

      return sortedInsights;

    } catch (error) {
      logger.error('Error generating user insights', { userId, error });
      // Return fallback insights instead of throwing
      return this.getFallbackInsights();
    }
  }

  /**
   * Builds comprehensive context for insight generation
   * Aggregates data from multiple sources for analysis
   * 
   * @param userId - The authenticated user's ID
   * @returns Promise resolving to insight context
   */
  private static async buildInsightContext(userId: string): Promise<InsightContext> {
    logger.debug('Building insight context for user', { userId });

    try {
      // Get dashboard metrics
      const metrics = await DashboardService.getDashboardMetrics(userId);

      // Analyze session patterns
      const sessionPatterns = await this.analyzeSessionPatterns(userId);

      // Get recent activity summary
      const recentActivity = await this.analyzeRecentActivity(userId);

      // Calculate user trends
      const userTrends = await this.calculateUserTrends(userId);

      return {
        metrics,
        sessionPatterns,
        recentActivity,
        userTrends
      };

    } catch (error) {
      logger.error('Error building insight context', { userId, error });
      throw error;
    }
  }

  /**
   * Analyzes user session patterns to identify habits and preferences
   * 
   * @param userId - The authenticated user's ID
   * @returns Promise resolving to session pattern analysis
   */
  private static async analyzeSessionPatterns(userId: string): Promise<SessionPattern[]> {
    try {
      const { data: sessions, error } = await supabase
        .from('journal_sessions')
        .select('created_at, session_duration_seconds')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30); // Analyze last 30 sessions

      if (error || !sessions) {
        logger.warn('Failed to fetch sessions for pattern analysis', { userId, error });
        return [];
      }

      // Group sessions by day of week
      const dayPatterns = new Map<number, { durations: number[]; hours: number[] }>();
      
      sessions.forEach(session => {
        const date = new Date(session.created_at);
        const dayOfWeek = date.getDay();
        const hour = date.getHours();
        const duration = session.session_duration_seconds || 0;

        if (!dayPatterns.has(dayOfWeek)) {
          dayPatterns.set(dayOfWeek, { durations: [], hours: [] });
        }

        dayPatterns.get(dayOfWeek)!.durations.push(duration);
        dayPatterns.get(dayOfWeek)!.hours.push(hour);
      });

      // Convert to pattern analysis
      const patterns: SessionPattern[] = [];
      dayPatterns.forEach((data, dayOfWeek) => {
        const averageDuration = data.durations.reduce((sum, d) => sum + d, 0) / data.durations.length;
        const averageTimeOfDay = data.hours.reduce((sum, h) => sum + h, 0) / data.hours.length;
        const mostActiveHour = this.getMostFrequent(data.hours);

        patterns.push({
          dayOfWeek,
          averageTimeOfDay,
          averageDuration,
          sessionCount: data.durations.length,
          mostActiveHour
        });
      });

      return patterns;

    } catch (error) {
      logger.error('Error analyzing session patterns', { userId, error });
      return [];
    }
  }

  /**
   * Analyzes recent user activity for immediate insights
   * 
   * @param userId - The authenticated user's ID
   * @returns Promise resolving to recent activity analysis
   */
  private static async analyzeRecentActivity(userId: string): Promise<RecentActivity> {
    try {
      // Get recent sessions
      const { data: recentSessions } = await supabase
        .from('journal_sessions')
        .select('created_at, session_duration_seconds')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      // Get recent transformations
      const { data: recentTransformations } = await supabase
        .from('transformation_usage')
        .select('old_word_instance, used_at')
        .eq('user_id', userId)
        .order('used_at', { ascending: false })
        .limit(20);

      const lastSessionDate = recentSessions?.[0]?.created_at || null;
      const daysSinceLastSession = lastSessionDate 
        ? Math.floor((Date.now() - new Date(lastSessionDate).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      const recentSessionDurations = recentSessions?.map(s => s.session_duration_seconds || 0) || [];
      
      // Count transformation frequency
      const transformationCounts = new Map<string, number>();
      recentTransformations?.forEach(t => {
        const word = t.old_word_instance.toLowerCase();
        transformationCounts.set(word, (transformationCounts.get(word) || 0) + 1);
      });

      const topTransformedWords = Array.from(transformationCounts.entries())
        .map(([word, count]) => ({ word, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        lastSessionDate,
        daysSinceLastSession,
        recentSessionDurations,
        recentTransformationCounts: Array.from(transformationCounts.values()),
        topTransformedWords
      };

    } catch (error) {
      logger.error('Error analyzing recent activity', { userId, error });
      return {
        lastSessionDate: null,
        daysSinceLastSession: 999,
        recentSessionDurations: [],
        recentTransformationCounts: [],
        topTransformedWords: []
      };
    }
  }

  /**
   * Calculates user trends over time for progression insights
   * 
   * @param userId - The authenticated user's ID
   * @returns Promise resolving to user trends analysis
   */
  private static async calculateUserTrends(userId: string): Promise<UserTrends> {
    try {
      // For simplicity, we'll use basic trend calculation
      // In a more advanced system, this would include sophisticated trend analysis
      
      const { data: sessions } = await supabase
        .from('journal_sessions')
        .select('created_at, session_duration_seconds')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (!sessions || sessions.length < 3) {
        return {
          sessionFrequencyTrend: 'stable',
          reframingRateTrend: 'stable',
          engagementTrend: 'stable',
          overallMomentum: 'building'
        };
      }

      // Simple trend calculation based on recent vs. earlier activity
      const midPoint = Math.floor(sessions.length / 2);
      const earlierSessions = sessions.slice(0, midPoint);
      const recentSessions = sessions.slice(midPoint);

      const earlierAvgDuration = earlierSessions.reduce((sum, s) => sum + (s.session_duration_seconds || 0), 0) / earlierSessions.length;
      const recentAvgDuration = recentSessions.reduce((sum, s) => sum + (s.session_duration_seconds || 0), 0) / recentSessions.length;

      const engagementTrend = recentAvgDuration > earlierAvgDuration * 1.1 ? 'deepening' :
                             recentAvgDuration < earlierAvgDuration * 0.9 ? 'shortening' : 'stable';

      // Frequency trend based on session spacing
      const recentFrequency = recentSessions.length / Math.max(1, this.daysBetween(recentSessions[0]?.created_at, recentSessions[recentSessions.length - 1]?.created_at));
      const earlierFrequency = earlierSessions.length / Math.max(1, this.daysBetween(earlierSessions[0]?.created_at, earlierSessions[earlierSessions.length - 1]?.created_at));

      const sessionFrequencyTrend = recentFrequency > earlierFrequency * 1.2 ? 'increasing' :
                                   recentFrequency < earlierFrequency * 0.8 ? 'decreasing' : 'stable';

      // Overall momentum assessment
      const overallMomentum = (sessionFrequencyTrend === 'increasing' || engagementTrend === 'deepening') ? 'building' :
                             (sessionFrequencyTrend === 'decreasing' && engagementTrend === 'shortening') ? 'declining' : 'maintaining';

      return {
        sessionFrequencyTrend,
        reframingRateTrend: 'stable', // Simplified for now
        engagementTrend,
        overallMomentum
      };

    } catch (error) {
      logger.error('Error calculating user trends', { userId, error });
      return {
        sessionFrequencyTrend: 'stable',
        reframingRateTrend: 'stable',
        engagementTrend: 'stable',
        overallMomentum: 'maintaining'
      };
    }
  }

  /**
   * Generates insights based on analyzed user context
   * Uses rule-based logic to create personalized feedback
   * 
   * @param userId - The authenticated user's ID
   * @param context - The insight generation context
   * @returns Promise resolving to array of generated insights
   */
  private static async analyzeAndGenerateInsights(userId: string, context: InsightContext): Promise<UserInsight[]> {
    const insights: UserInsight[] = [];
    const now = new Date().toISOString();

    // Consistency Pattern Insights
    if (context.metrics.dayStreak >= 7) {
      insights.push({
        id: `consistency_${now}`,
        type: InsightType.CONSISTENCY_PATTERN,
        title: 'Consistency Champion',
        description: `Your ${context.metrics.dayStreak}-day streak shows incredible dedication. This consistency is reshaping your inner dialogue at a fundamental level.`,
        category: InsightCategory.CELEBRATION,
        priority: InsightPriority.HIGH,
        iconName: 'trending-up',
        generatedAt: now,
        dataSource: ['journal_sessions', 'streaks']
      });
    } else if (context.metrics.dayStreak >= 3) {
      insights.push({
        id: `momentum_${now}`,
        type: InsightType.STREAK_MOMENTUM,
        title: 'Building Momentum',
        description: `Your ${context.metrics.dayStreak}-day streak is building real momentum. Keep this rhythm going to establish a lasting transformation habit.`,
        category: InsightCategory.MOTIVATION,
        priority: InsightPriority.MEDIUM,
        iconName: 'zap',
        generatedAt: now,
        dataSource: ['journal_sessions']
      });
    }

    // Reframing Effectiveness Insights
    if (context.metrics.reframingRate >= 70) {
      insights.push({
        id: `reframing_high_${now}`,
        type: InsightType.REFRAMING_EFFECTIVENESS,
        title: 'Transformation Master',
        description: `With a ${context.metrics.reframingRate}% reframing rate, you're actively sculpting a more empowering mindset. Your word choices are becoming your reality.`,
        category: InsightCategory.ACHIEVEMENT,
        priority: InsightPriority.HIGH,
        iconName: 'crown',
        generatedAt: now,
        dataSource: ['transformation_usage', 'journal_sessions']
      });
    } else if (context.metrics.reframingRate >= 40) {
      insights.push({
        id: `reframing_progress_${now}`,
        type: InsightType.REFRAMING_EFFECTIVENESS,
        title: 'Growing Awareness',
        description: `Your ${context.metrics.reframingRate}% reframing rate shows developing awareness. Each transformation strengthens your ability to choose empowering language.`,
        category: InsightCategory.PATTERN_RECOGNITION,
        priority: InsightPriority.MEDIUM,
        iconName: 'eye',
        generatedAt: now,
        dataSource: ['transformation_usage']
      });
    }

    // Engagement Depth Insights
    const avgDuration = context.recentActivity.recentSessionDurations.length > 0 
      ? context.recentActivity.recentSessionDurations.reduce((sum, d) => sum + d, 0) / context.recentActivity.recentSessionDurations.length 
      : 0;

    if (avgDuration >= 300) { // 5 minutes or more
      insights.push({
        id: `depth_${now}`,
        type: InsightType.ENGAGEMENT_DEPTH,
        title: 'Deep Reflection',
        description: `Your sessions average ${Math.round(avgDuration / 60)} minutes, showing deep engagement with your inner transformation process.`,
        category: InsightCategory.PATTERN_RECOGNITION,
        priority: InsightPriority.MEDIUM,
        iconName: 'brain',
        generatedAt: now,
        dataSource: ['journal_sessions']
      });
    }

    // Session Timing Insights
    if (context.sessionPatterns.length > 0) {
      const mostActivePattern = context.sessionPatterns.reduce((max, pattern) => 
        pattern.sessionCount > max.sessionCount ? pattern : max
      );

      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][mostActivePattern.dayOfWeek];
      const timeOfDay = mostActivePattern.averageTimeOfDay < 12 ? 'morning' : 
                       mostActivePattern.averageTimeOfDay < 17 ? 'afternoon' : 'evening';

      insights.push({
        id: `timing_${now}`,
        type: InsightType.SESSION_TIMING,
        title: 'Personal Rhythm',
        description: `You're most active on ${dayName} ${timeOfDay}s. This pattern suggests you've found your optimal time for inner work.`,
        category: InsightCategory.PATTERN_RECOGNITION,
        priority: InsightPriority.LOW,
        iconName: 'clock',
        generatedAt: now,
        dataSource: ['journal_sessions']
      });
    }

    // Word Pattern Insights
    if (context.recentActivity.topTransformedWords.length > 0) {
      const topWord = context.recentActivity.topTransformedWords[0];
      insights.push({
        id: `word_pattern_${now}`,
        type: InsightType.WORD_PATTERN,
        title: 'Pattern Recognition',
        description: `You've been frequently reframing "${topWord.word}" - this suggests you're actively working on a specific mindset shift.`,
        category: InsightCategory.PATTERN_RECOGNITION,
        priority: InsightPriority.MEDIUM,
        iconName: 'target',
        generatedAt: now,
        dataSource: ['transformation_usage']
      });
    }

    // Momentum and Trend Insights
    if (context.userTrends.overallMomentum === 'building') {
      insights.push({
        id: `momentum_building_${now}`,
        type: InsightType.PROGRESS_MILESTONE,
        title: 'Accelerating Growth',
        description: 'Your engagement is deepening and your frequency is increasing. You\'re in a powerful growth phase of your transformation journey.',
        category: InsightCategory.MOTIVATION,
        priority: InsightPriority.HIGH,
        iconName: 'rocket',
        generatedAt: now,
        dataSource: ['journal_sessions', 'trends']
      });
    }

    // Recent Activity Insights
    if (context.recentActivity.daysSinceLastSession === 0) {
      insights.push({
        id: `recent_activity_${now}`,
        type: InsightType.CONSISTENCY_PATTERN,
        title: 'Present Moment',
        description: 'You\'re maintaining daily practice. This consistency is the foundation of lasting transformation.',
        category: InsightCategory.MOTIVATION,
        priority: InsightPriority.MEDIUM,
        iconName: 'check-circle',
        generatedAt: now,
        dataSource: ['journal_sessions']
      });
    } else if (context.recentActivity.daysSinceLastSession >= 3) {
      insights.push({
        id: `comeback_${now}`,
        type: InsightType.CONSISTENCY_PATTERN,
        title: 'Welcome Back',
        description: 'Every return to practice strengthens your commitment. Your awareness is growing even during breaks.',
        category: InsightCategory.MOTIVATION,
        priority: InsightPriority.HIGH,
        iconName: 'arrow-up',
        generatedAt: now,
        dataSource: ['journal_sessions']
      });
    }

    return insights;
  }

  /**
   * Helper function to get priority weight for sorting
   */
  private static getPriorityWeight(priority: InsightPriority): number {
    switch (priority) {
      case InsightPriority.URGENT: return 4;
      case InsightPriority.HIGH: return 3;
      case InsightPriority.MEDIUM: return 2;
      case InsightPriority.LOW: return 1;
      default: return 0;
    }
  }

  /**
   * Helper function to get most frequent value in array
   */
  private static getMostFrequent(arr: number[]): number {
    const frequency = new Map<number, number>();
    arr.forEach(item => frequency.set(item, (frequency.get(item) || 0) + 1));
    return Array.from(frequency.entries()).reduce((max, [value, count]) => 
      count > (frequency.get(max) || 0) ? value : max, arr[0] || 0
    );
  }

  /**
   * Helper function to calculate days between dates
   */
  private static daysBetween(date1: string, date2: string): number {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return Math.abs(Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
  }

  /**
   * Provides fallback insights when analysis fails
   */
  private static getFallbackInsights(): UserInsight[] {
    const now = new Date().toISOString();
    return [
      {
        id: `fallback_${now}`,
        type: InsightType.PROGRESS_MILESTONE,
        title: 'Your Journey Continues',
        description: 'Every moment of awareness is a step toward transformation. Your commitment to growth is already making a difference.',
        category: InsightCategory.MOTIVATION,
        priority: InsightPriority.MEDIUM,
        iconName: 'heart',
        generatedAt: now,
        dataSource: ['fallback']
      }
    ];
  }
}

/**
 * Export types for use in other modules
 */
export type { InsightContext, SessionPattern, RecentActivity, UserTrends }; 