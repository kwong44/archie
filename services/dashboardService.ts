import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { toLocalDateKey } from '@/lib/dateUtils';

/**
 * Interface for daily session data used in weekly charts
 */
interface DailySessionData {
  day: string;
  sessions: number;
  duration: number;
  date: string;
}

/**
 * Interface for dashboard metrics aggregated from user data
 */
interface DashboardMetrics {
  dayStreak: number;
  weeklyDuration: number;
  reframingRate: number;
  totalSessions: number;
  totalTransformations: number;
  weeklyData: DailySessionData[];
}

/**
 * Interface for user achievements from database
 */
interface UserAchievement {
  id: string;
  achievement_type: string;
  achievement_name: string;
  achievement_description: string;
  icon_name: string;
  earned_at: string;
}

/**
 * Dashboard service handling all dashboard-related data operations
 * Calculates metrics, streaks, and aggregated data from Supabase
 */
export class DashboardService {
  /**
   * Calculates the current day streak for a user based on consecutive days with journal sessions
   * A streak breaks if there's a day without any sessions
   * 
   * @param userId - The authenticated user's ID
   * @returns Promise resolving to the current day streak count
   */
  static async calculateDayStreak(userId: string): Promise<number> {
    logger.info('Calculating day streak for user', { userId });
    
    try {
      // Get all session dates for the user, ordered by date descending
      const { data: sessions, error } = await supabase
        .from('journal_sessions')
        .select('created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Failed to fetch sessions for streak calculation', { userId, error });
        throw new Error('Failed to calculate day streak', { cause: error });
      }

      if (!sessions || sessions.length === 0) {
        logger.info('No sessions found for user', { userId });
        return 0;
      }

      // Group sessions by date (YYYY-MM-DD format)
      const sessionDates = new Set(
        sessions.map(session => toLocalDateKey(session.created_at))
      );

      // Calculate consecutive days starting from today
      let streak = 0;
      const today = new Date();
      
      for (let i = 0; i < 365; i++) { // Max 365 days to prevent infinite loops
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const dateString = toLocalDateKey(checkDate);
        
        if (sessionDates.has(dateString)) {
          streak++;
        } else if (i === 0) {
          // If today has no sessions, check yesterday to see if streak is ongoing
          continue;
        } else {
          // Streak is broken
          break;
        }
      }

      logger.info('Day streak calculated successfully', { userId, streak });
      return streak;
      
    } catch (error) {
      logger.error('Error calculating day streak', { userId, error });
      throw error;
    }
  }

  /**
   * Calculates the total session duration for the current week (Monday to Sunday)
   * 
   * @param userId - The authenticated user's ID
   * @returns Promise resolving to total minutes this week
   */
  static async calculateWeeklyDuration(userId: string): Promise<number> {
    logger.info('Calculating weekly duration for user', { userId });
    
    try {
      // Get start of current week (Monday)
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Handle Sunday as end of week
      
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - daysToMonday);
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      // Fetch sessions from current week
      const { data: sessions, error } = await supabase
        .from('journal_sessions')
        .select('session_duration_seconds')
        .eq('user_id', userId)
        .gte('created_at', weekStart.toISOString())
        .lte('created_at', weekEnd.toISOString());

      if (error) {
        logger.error('Failed to fetch weekly sessions', { userId, error });
        throw new Error('Failed to calculate weekly duration', { cause: error });
      }

      // Calculate total duration in minutes
      const totalSeconds = sessions?.reduce((sum, session) => 
        sum + (session.session_duration_seconds || 0), 0
      ) || 0;
      
      const totalMinutes = Math.round(totalSeconds / 60);

      logger.info('Weekly duration calculated successfully', { 
        userId, 
        totalMinutes, 
        sessionCount: sessions?.length || 0 
      });
      
      return totalMinutes;
      
    } catch (error) {
      logger.error('Error calculating weekly duration', { userId, error });
      throw error;
    }
  }

  /**
   * Calculates the user's reframing rate (percentage of words successfully transformed)
   * Based on transformation_usage table data
   * 
   * @param userId - The authenticated user's ID
   * @returns Promise resolving to percentage (0-100) of successful reframes
   */
  static async calculateReframingRate(userId: string): Promise<number> {
    logger.info('Calculating reframing rate for user', { userId });
    
    try {
      // Get total word transformations applied
      const { data: transformations, error: transformError } = await supabase
        .from('transformation_usage')
        .select('id')
        .eq('user_id', userId);

      if (transformError) {
        logger.error('Failed to fetch transformations for reframing rate', { userId, error: transformError });
        throw new Error('Failed to calculate reframing rate', { cause: transformError });
      }

      // Get total sessions to calculate potential reframes
      const { data: sessions, error: sessionError } = await supabase
        .from('journal_sessions')
        .select('id, original_transcript')
        .eq('user_id', userId);

      if (sessionError) {
        logger.error('Failed to fetch sessions for reframing rate', { userId, error: sessionError });
        throw new Error('Failed to calculate reframing rate', { cause: sessionError });
      }

      const totalTransformations = transformations?.length || 0;
      const totalSessions = sessions?.length || 0;

      // Calculate rate based on transformations per session
      // If no sessions, rate is 0. Otherwise, use transformations as a percentage
      let reframingRate = 0;
      if (totalSessions > 0) {
        // Calculate average transformations per session, cap at 100%
        const avgTransformationsPerSession = totalTransformations / totalSessions;
        reframingRate = Math.min(Math.round(avgTransformationsPerSession * 20), 100); // Scale factor for realistic percentages
      }

      logger.info('Reframing rate calculated successfully', { 
        userId, 
        reframingRate, 
        totalTransformations, 
        totalSessions 
      });
      
      return reframingRate;
      
    } catch (error) {
      logger.error('Error calculating reframing rate', { userId, error });
      throw error;
    }
  }

  /**
   * Generates weekly session data for chart visualization
   * Returns array of daily data for the current week (Monday to Sunday)
   * 
   * @param userId - The authenticated user's ID
   * @returns Promise resolving to array of daily session data
   */
  static async generateWeeklyData(userId: string): Promise<DailySessionData[]> {
    logger.info('Generating weekly data for user', { userId });
    
    try {
      // Get current week boundaries (Monday to Sunday)
      const today = new Date();
      const dayOfWeek = today.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - daysToMonday);
      weekStart.setHours(0, 0, 0, 0);

      // Fetch sessions for current week
      const { data: sessions, error } = await supabase
        .from('journal_sessions')
        .select('created_at, session_duration_seconds')
        .eq('user_id', userId)
        .gte('created_at', weekStart.toISOString());

      if (error) {
        logger.error('Failed to fetch sessions for weekly data', { userId, error });
        throw new Error('Failed to generate weekly data', { cause: error });
      }

      // Initialize week data structure
      const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const weeklyData: DailySessionData[] = weekdays.map((day, index) => {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + index);
        
        return {
          day,
          sessions: 0,
          duration: 0,
          date: toLocalDateKey(date)
        };
      });

      // Aggregate session data by day
      sessions?.forEach(session => {
        const sessionDate = toLocalDateKey(session.created_at);
        const dayData = weeklyData.find(d => d.date === sessionDate);
        
        if (dayData) {
          dayData.sessions++;
          dayData.duration += Math.round((session.session_duration_seconds || 0) / 60);
        }
      });

      logger.info('Weekly data generated successfully', { 
        userId, 
        totalSessionsThisWeek: sessions?.length || 0 
      });
      
      return weeklyData;
      
    } catch (error) {
      logger.error('Error generating weekly data', { userId, error });
      throw error;
    }
  }

  /**
   * Aggregates all dashboard metrics for a user
   * Combines streak, duration, reframing rate, and weekly data
   * 
   * @param userId - The authenticated user's ID
   * @returns Promise resolving to complete dashboard metrics
   */
  static async getDashboardMetrics(userId: string): Promise<DashboardMetrics> {
    logger.info('Fetching complete dashboard metrics for user', { userId });
    
    try {
      // Fetch all metrics in parallel for better performance
      const [
        dayStreak,
        weeklyDuration,
        reframingRate,
        weeklyData
      ] = await Promise.all([
        this.calculateDayStreak(userId),
        this.calculateWeeklyDuration(userId),
        this.calculateReframingRate(userId),
        this.generateWeeklyData(userId)
      ]);

      // Calculate additional metrics
      const totalSessions = weeklyData.reduce((sum, day) => sum + day.sessions, 0);
      
      // Get total transformations count
      const { data: transformations } = await supabase
        .from('transformation_usage')
        .select('id')
        .eq('user_id', userId);

      const totalTransformations = transformations?.length || 0;

      const metrics: DashboardMetrics = {
        dayStreak,
        weeklyDuration,
        reframingRate,
        totalSessions,
        totalTransformations,
        weeklyData
      };

      logger.info('Dashboard metrics fetched successfully', { 
        userId, 
        metrics: {
          dayStreak,
          weeklyDuration,
          reframingRate,
          totalSessions,
          totalTransformations
        }
      });
      
      return metrics;
      
    } catch (error) {
      logger.error('Error fetching dashboard metrics', { userId, error });
      throw error;
    }
  }

  /**
   * Fetches user achievements from the database
   * Returns recent achievements for display on dashboard
   * 
   * @param userId - The authenticated user's ID
   * @param limit - Maximum number of achievements to return (default: 10)
   * @returns Promise resolving to array of user achievements
   */
  static async getUserAchievements(userId: string, limit: number = 10): Promise<UserAchievement[]> {
    logger.info('Fetching user achievements', { userId, limit });
    
    try {
      const { data: achievements, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', userId)
        .order('earned_at', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('Failed to fetch user achievements', { userId, error });
        throw new Error('Failed to fetch achievements', { cause: error });
      }

      logger.info('User achievements fetched successfully', { 
        userId, 
        achievementCount: achievements?.length || 0 
      });
      
      return achievements || [];
      
    } catch (error) {
      logger.error('Error fetching user achievements', { userId, error });
      throw error;
    }
  }
}

/**
 * Export interface types for use in components
 */
export type { DashboardMetrics, DailySessionData, UserAchievement }; 