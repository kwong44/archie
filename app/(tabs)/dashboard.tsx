import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, TrendingUp, Clock, Award } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { DashboardService } from '@/services/dashboardService';
import { InsightsService } from '@/services/insightsService';
import { logger } from '@/lib/logger';
import type { DashboardMetrics, UserAchievement } from '@/services/dashboardService';
import type { UserInsight } from '@/services/insightsService';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const { session } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [insights, setInsights] = useState<UserInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetches dashboard data from Supabase when component mounts or user changes
   * Loads both metrics and achievements in parallel for better performance
   */
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!session?.user?.id) {
        logger.warn('No authenticated user found for dashboard');
        setLoading(false);
        return;
      }

      try {
        logger.info('Fetching dashboard data for user', { userId: session.user.id });
        setLoading(true);
        setError(null);

        // Fetch metrics, achievements, and insights in parallel
        const [dashboardMetrics, userAchievements, userInsights] = await Promise.all([
          DashboardService.getDashboardMetrics(session.user.id),
          DashboardService.getUserAchievements(session.user.id, 5),
          InsightsService.generateUserInsights(session.user.id, 3)
        ]);

        setMetrics(dashboardMetrics);
        setAchievements(userAchievements);
        setInsights(userInsights);
        
        logger.info('Dashboard data loaded successfully', { 
          userId: session.user.id,
          hasMetrics: !!dashboardMetrics,
          achievementCount: userAchievements.length,
          insightsCount: userInsights.length
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load dashboard data';
        logger.error('Error loading dashboard data', { 
          userId: session.user.id,
          error: errorMessage
        });
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [session?.user?.id]);

  // Show loading state while fetching data
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFC300" />
          <Text style={styles.loadingText}>Loading your journey...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state if data fetch failed
  if (error || !metrics) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {error || 'Unable to load dashboard data'}
          </Text>
          <Text style={styles.errorSubtext}>
            Please check your connection and try again
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Calculate derived values from real data
  const { dayStreak, weeklyDuration, reframingRate, weeklyData } = metrics;
  const maxSessions = Math.max(...weeklyData.map(d => d.sessions), 1); // Ensure min value of 1 to prevent division by zero

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Your Journey</Text>
          <Text style={styles.subtitle}>Progress in your personal transformation</Text>
        </View>

        {/* Key Metrics */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <View style={styles.metricIconContainer}>
              <TrendingUp color="#FFC300" size={24} strokeWidth={2} />
            </View>
            <Text style={styles.metricNumber}>{dayStreak}</Text>
            <Text style={styles.metricLabel}>Day Streak</Text>
          </View>
          
          <View style={styles.metricCard}>
            <View style={styles.metricIconContainer}>
              <Clock color="#4A90E2" size={24} strokeWidth={2} />
            </View>
            <Text style={styles.metricNumber}>{weeklyDuration}m</Text>
            <Text style={styles.metricLabel}>This Week</Text>
          </View>
          
          <View style={styles.metricCard}>
            <View style={styles.metricIconContainer}>
              <Award color="#10B981" size={24} strokeWidth={2} />
            </View>
            <Text style={styles.metricNumber}>{reframingRate}%</Text>
            <Text style={styles.metricLabel}>Reframed</Text>
          </View>
        </View>

        {/* Weekly Activity Chart */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>This Week's Sessions</Text>
          <View style={styles.chart}>
            {weeklyData.map((day, index) => (
              <View key={index} style={styles.chartColumn}>
                <View style={styles.chartBarContainer}>
                  <View 
                    style={[
                      styles.chartBar,
                      { 
                        height: maxSessions > 0 ? (day.sessions / maxSessions) * 80 : 0,
                        backgroundColor: day.sessions > 0 ? '#FFC300' : '#374151'
                      }
                    ]}
                  />
                </View>
                <Text style={styles.chartLabel}>{day.day}</Text>
                <Text style={styles.chartValue}>{day.sessions}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Insights */}
        <View style={styles.insightsContainer}>
          <Text style={styles.insightsTitle}>Personal Insights</Text>
          
          {insights.length > 0 ? (
            insights.map((insight) => (
              <View key={insight.id} style={styles.insightCard}>
                <View style={styles.insightHeader}>
                  <Calendar color="#4A90E2" size={20} strokeWidth={2} />
                  <Text style={styles.insightDate}>{insight.title}</Text>
                </View>
                <Text style={styles.insightText}>
                  {insight.description}
                </Text>
              </View>
            ))
          ) : (
            // Show fallback insight when none are generated
            <View style={styles.insightCard}>
              <View style={styles.insightHeader}>
                <Calendar color="#4A90E2" size={20} strokeWidth={2} />
                <Text style={styles.insightDate}>Your Journey</Text>
              </View>
              <Text style={styles.insightText}>
                Every moment of awareness is a step toward transformation. Start journaling to unlock personalized insights about your growth patterns.
              </Text>
            </View>
          )}
        </View>

        {/* Achievements */}
        <View style={styles.achievementsContainer}>
          <Text style={styles.achievementsTitle}>Recent Achievements</Text>
          
          <View style={styles.achievementsList}>
            {achievements.length > 0 ? (
              achievements.map((achievement) => (
                <View key={achievement.id} style={styles.achievementItem}>
                  <View style={styles.achievementBadge}>
                    <Award color="#FFC300" size={16} strokeWidth={2} />
                  </View>
                  <View style={styles.achievementContent}>
                    <Text style={styles.achievementName}>{achievement.achievement_name}</Text>
                    <Text style={styles.achievementDescription}>{achievement.achievement_description}</Text>
                  </View>
                </View>
              ))
            ) : (
              // Show placeholder achievements when none exist
              <>
                <View style={styles.achievementItem}>
                  <View style={styles.achievementBadge}>
                    <Award color="#FFC300" size={16} strokeWidth={2} />
                  </View>
                  <View style={styles.achievementContent}>
                    <Text style={styles.achievementName}>First Steps</Text>
                    <Text style={styles.achievementDescription}>Complete your first journal session to unlock achievements</Text>
                  </View>
                </View>

                <View style={styles.achievementItem}>
                  <View style={styles.achievementBadge}>
                    <TrendingUp color="#10B981" size={16} strokeWidth={2} />
                  </View>
                  <View style={styles.achievementContent}>
                    <Text style={styles.achievementName}>Consistency Builder</Text>
                    <Text style={styles.achievementDescription}>Keep journaling to build your streak and earn rewards</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121820',
  },
  scrollContent: {
    padding: 20,
  },
  // Loading state styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginTop: 16,
    textAlign: 'center',
  },
  // Error state styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#E53E3E',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#F5F5F0',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 30,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  metricIconContainer: {
    marginBottom: 8,
  },
  metricNumber: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#F5F5F0',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#374151',
  },
  chartTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#F5F5F0',
    marginBottom: 20,
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
  },
  chartColumn: {
    alignItems: 'center',
    flex: 1,
  },
  chartBarContainer: {
    height: 80,
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  chartBar: {
    width: 20,
    borderRadius: 2,
  },
  chartLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginBottom: 4,
  },
  chartValue: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#F5F5F0',
  },
  insightsContainer: {
    marginBottom: 30,
  },
  insightsTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#F5F5F0',
    marginBottom: 16,
  },
  insightCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightDate: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#4A90E2',
    marginLeft: 8,
  },
  insightText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#F5F5F0',
    lineHeight: 20,
  },
  achievementsContainer: {
    marginBottom: 20,
  },
  achievementsTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#F5F5F0',
    marginBottom: 16,
  },
  achievementsList: {
    gap: 12,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  achievementBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  achievementContent: {
    flex: 1,
  },
  achievementName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#F5F5F0',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
});