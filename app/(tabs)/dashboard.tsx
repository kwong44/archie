import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, TrendingUp, Clock, Award } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  // Mock data - in real app, this would come from your analytics
  const weeklyData = [
    { day: 'Mon', sessions: 2, duration: 15 },
    { day: 'Tue', sessions: 1, duration: 8 },
    { day: 'Wed', sessions: 3, duration: 22 },
    { day: 'Thu', sessions: 0, duration: 0 },
    { day: 'Fri', sessions: 2, duration: 18 },
    { day: 'Sat', sessions: 1, duration: 12 },
    { day: 'Sun', sessions: 2, duration: 16 },
  ];

  const totalSessions = weeklyData.reduce((sum, day) => sum + day.sessions, 0);
  const totalDuration = weeklyData.reduce((sum, day) => sum + day.duration, 0);
  const streak = 5; // Current streak in days
  const reframingRate = 78; // Percentage of negative words reframed

  const maxSessions = Math.max(...weeklyData.map(d => d.sessions));

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
            <Text style={styles.metricNumber}>{streak}</Text>
            <Text style={styles.metricLabel}>Day Streak</Text>
          </View>
          
          <View style={styles.metricCard}>
            <View style={styles.metricIconContainer}>
              <Clock color="#4A90E2" size={24} strokeWidth={2} />
            </View>
            <Text style={styles.metricNumber}>{totalDuration}m</Text>
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
          <Text style={styles.insightsTitle}>Recent Insights</Text>
          
          <View style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <Calendar color="#4A90E2" size={20} strokeWidth={2} />
              <Text style={styles.insightDate}>Today</Text>
            </View>
            <Text style={styles.insightText}>
              You've been consistently reframing "overwhelmed" to "full of opportunities" - 
              this shift is becoming natural for you.
            </Text>
          </View>

          <View style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <TrendingUp color="#10B981" size={20} strokeWidth={2} />
              <Text style={styles.insightDate}>This Week</Text>
            </View>
            <Text style={styles.insightText}>
              Your evening sessions tend to be longer and more reflective. 
              Consider this your prime time for deeper exploration.
            </Text>
          </View>
        </View>

        {/* Achievements */}
        <View style={styles.achievementsContainer}>
          <Text style={styles.achievementsTitle}>Recent Achievements</Text>
          
          <View style={styles.achievementsList}>
            <View style={styles.achievementItem}>
              <View style={styles.achievementBadge}>
                <Award color="#FFC300" size={16} strokeWidth={2} />
              </View>
              <View style={styles.achievementContent}>
                <Text style={styles.achievementName}>Mindful Week</Text>
                <Text style={styles.achievementDescription}>Completed 7 days of journaling</Text>
              </View>
            </View>

            <View style={styles.achievementItem}>
              <View style={styles.achievementBadge}>
                <TrendingUp color="#10B981" size={16} strokeWidth={2} />
              </View>
              <View style={styles.achievementContent}>
                <Text style={styles.achievementName}>Transformation Master</Text>
                <Text style={styles.achievementDescription}>Reframed 50+ negative thoughts</Text>
              </View>
            </View>
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