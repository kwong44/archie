import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, Plus, Edit3, Calendar, TrendingUp } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { LexiconService, WordPair, LexiconStats } from '@/services/lexiconService';
import { useFocusEffect } from '@react-navigation/native';
import { AddWordPairModal } from '@/components/AddWordPairModal';
import { createContextLogger } from '@/lib/logger';

// Create context-specific logger for lexicon screen
const lexiconLogger = createContextLogger('LexiconScreen');

/**
 * Helper function to format relative time
 */
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return '1 day ago';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }
  
  const months = Math.floor(diffInDays / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
};

/**
 * LexiconScreen Component
 * Displays user's word transformation pairs with real-time data from Supabase
 * Includes statistics, usage frequency, and management capabilities
 */
export default function LexiconScreen() {
  const { session } = useAuth();
  const [wordPairs, setWordPairs] = useState<WordPair[]>([]);
  const [stats, setStats] = useState<LexiconStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  /**
   * Loads word pairs and statistics from Supabase
   */
  const loadLexiconData = async (isRefresh = false) => {
    if (!session?.user) {
      lexiconLogger.warn('No authenticated user found when loading lexicon data');
      setError('Please log in to view your lexicon');
      setLoading(false);
      return;
    }

    try {
      lexiconLogger.info('Loading lexicon data', { 
        userId: session.user.id, 
        isRefresh 
      });
      
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      // Fetch word pairs and stats in parallel
      const [userWordPairs, lexiconStats] = await Promise.all([
        LexiconService.getUserWordPairs(session.user.id),
        LexiconService.getLexiconStats(session.user.id),
      ]);

      setWordPairs(userWordPairs);
      setStats(lexiconStats);

      lexiconLogger.info('Lexicon data loaded successfully', {
        userId: session.user.id,
        wordPairsCount: userWordPairs.length,
        totalTransformations: lexiconStats.totalTransformations
      });

    } catch (error) {
      lexiconLogger.error('Failed to load lexicon data', {
        userId: session.user.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      setError(error instanceof Error ? error.message : 'Failed to load lexicon data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Handles pull-to-refresh functionality
   */
  const onRefresh = useCallback(() => {
    loadLexiconData(true);
  }, [session?.user]);

  /**
   * Load data when screen comes into focus
   */
  useFocusEffect(
    useCallback(() => {
      loadLexiconData();
    }, [session?.user])
  );

  /**
   * Handles adding a new word pair
   * Opens the AddWordPairModal for user input
   */
  const handleAddWordPair = () => {
    lexiconLogger.info('Opening add word pair modal', { userId: session?.user?.id });
    setShowAddModal(true);
  };

  /**
   * Handles successful word pair addition
   * Updates local state and refreshes data
   */
  const handleWordPairAdded = (newWordPair: WordPair) => {
    lexiconLogger.info('Word pair added successfully, updating local state', {
      wordPairId: newWordPair.id,
      transformation: `${newWordPair.old_word} → ${newWordPair.new_word}`
    });
    
    // Add the new word pair to the beginning of the list
    setWordPairs(prev => [newWordPair, ...prev]);
    
    // Refresh stats to get updated counts
    if (session?.user) {
      LexiconService.getLexiconStats(session.user.id)
        .then(updatedStats => {
          setStats(updatedStats);
          lexiconLogger.debug('Stats updated after word pair addition');
        })
        .catch(error => {
          lexiconLogger.error('Failed to update stats after word pair addition', {
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        });
    }
  };

  /**
   * Handles editing an existing word pair
   * TODO: Implement edit word pair functionality
   */
  const handleEditWordPair = (wordPair: WordPair) => {
    Alert.alert(
      'Edit Word Pair',
      `Edit "${wordPair.old_word} → ${wordPair.new_word}"?\n\nEditing feature coming soon!`,
      [{ text: 'OK' }]
    );
  };

  // Loading state
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#FFC300" size="large" />
          <Text style={styles.loadingText}>Loading your lexicon...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Unable to Load Lexicon</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadLexiconData()}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Empty state
  if (!loading && wordPairs.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Your Lexicon</Text>
            <Text style={styles.subtitle}>Words that transform your perspective</Text>
          </View>

          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Your Lexicon is Empty</Text>
            <Text style={styles.emptyDescription}>
              Start building your personal collection of word transformations. 
              Each pair helps you reframe limiting language into empowering thoughts.
            </Text>
            <TouchableOpacity style={styles.addButton} onPress={handleAddWordPair}>
              <Plus color="#121820" size={20} strokeWidth={2} />
              <Text style={styles.addButtonText}>Add Your First Word Pair</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Ensure the modal is rendered even in empty state */}
        {session?.user && (
          <AddWordPairModal
            visible={showAddModal}
            onClose={() => setShowAddModal(false)}
            onWordPairAdded={handleWordPairAdded}
            userId={session.user.id}
          />
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Your Lexicon</Text>
          <Text style={styles.subtitle}>
            {wordPairs.length} word transformation{wordPairs.length !== 1 ? 's' : ''} ready to use
          </Text>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={handleAddWordPair}>
          <Plus color="#121820" size={20} strokeWidth={2} />
          <Text style={styles.addButtonText}>Add New Word Pair</Text>
        </TouchableOpacity>

        {/* Statistics Cards */}
        {stats && (
          <View style={styles.stats}>
            <Text style={styles.statsTitle}>Your Progress</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats.totalWordPairs}</Text>
                <Text style={styles.statLabel}>Word Pairs</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats.totalTransformations}</Text>
                <Text style={styles.statLabel}>Total Uses</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats.averageUsage}</Text>
                <Text style={styles.statLabel}>Avg. Usage</Text>
              </View>
            </View>

            {/* Notable Word Pairs */}
            {stats.mostUsedPair && (
              <View style={styles.notableSection}>
                <View style={styles.notableCard}>
                  <View style={styles.notableHeader}>
                    <TrendingUp color="#10B981" size={16} strokeWidth={2} />
                    <Text style={styles.notableTitle}>Most Used</Text>
                  </View>
                  <View style={styles.notableTransformation}>
                    <Text style={styles.notableOldWord}>{stats.mostUsedPair.old_word}</Text>
                    <ArrowRight color="#FFC300" size={16} strokeWidth={2} />
                    <Text style={styles.notableNewWord}>{stats.mostUsedPair.new_word}</Text>
                  </View>
                  <Text style={styles.notableUsage}>{stats.mostUsedPair.usage_count} times</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Word Pairs List */}
        <View style={styles.wordPairsList}>
          {wordPairs.map((pair) => (
            <View key={pair.id} style={styles.wordPairCard}>
              <View style={styles.wordPairHeader}>
                <View style={styles.frequencyBadge}>
                  <Text style={styles.frequencyText}>{pair.usage_count}x</Text>
                </View>
                <TouchableOpacity 
                  style={styles.editButton}
                  onPress={() => handleEditWordPair(pair)}
                >
                  <Edit3 color="#6B7280" size={16} strokeWidth={2} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.wordTransformation}>
                <View style={styles.oldWordContainer}>
                  <Text style={styles.oldWordLabel}>FROM</Text>
                  <Text style={styles.oldWord}>{pair.old_word}</Text>
                </View>
                
                <View style={styles.arrowContainer}>
                  <ArrowRight color="#FFC300" size={24} strokeWidth={2} />
                </View>
                
                <View style={styles.newWordContainer}>
                  <Text style={styles.newWordLabel}>TO</Text>
                  <Text style={styles.newWord}>{pair.new_word}</Text>
                </View>
              </View>

              {pair.description && (
                <Text style={styles.wordPairDescription}>{pair.description}</Text>
              )}
              
              <View style={styles.wordPairFooter}>
                <View style={styles.dateInfo}>
                  <Calendar color="#6B7280" size={12} strokeWidth={2} />
                  <Text style={styles.lastUsed}>
                    Added {formatRelativeTime(pair.created_at)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      
      {/* Add Word Pair Modal */}
      {session?.user && (
        <AddWordPairModal
          visible={showAddModal}
          onClose={() => setShowAddModal(false)}
          onWordPairAdded={handleWordPairAdded}
          userId={session.user.id}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121820', // Primary background color
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#F5F5F0', // Primary text color
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF', // Secondary text color
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF', // Secondary text color
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#F5F5F0', // Primary text color
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF', // Secondary text color
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: '#FFC300', // Primary accent color
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#121820', // Dark text on light background
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 400,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#F5F5F0', // Primary text color
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF', // Secondary text color
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFC300', // Primary accent color
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 30,
  },
  addButtonText: {
    color: '#121820', // Dark text on light background
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    marginLeft: 8,
  },
  stats: {
    marginBottom: 30,
  },
  statsTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#F5F5F0', // Primary text color
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1F2937', // Component background color
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151', // Border color
  },
  statNumber: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#FFC300', // Primary accent color
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF', // Secondary text color
    textAlign: 'center',
  },
  notableSection: {
    marginTop: 10,
  },
  notableCard: {
    backgroundColor: '#1F2937', // Component background color
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151', // Border color
  },
  notableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  notableTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981', // Success color
    marginLeft: 6,
  },
  notableTransformation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notableOldWord: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#4A90E2', // Secondary accent color
    marginRight: 8,
  },
  notableNewWord: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFC300', // Primary accent color
    marginLeft: 8,
  },
  notableUsage: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280', // Tertiary text color
  },
  wordPairsList: {
    gap: 16,
  },
  wordPairCard: {
    backgroundColor: '#1F2937', // Component background color
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#374151', // Border color
  },
  wordPairHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  frequencyBadge: {
    backgroundColor: '#4A90E2', // Secondary accent color
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  frequencyText: {
    color: '#F5F5F0', // Primary text color
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
  },
  editButton: {
    padding: 4,
  },
  wordTransformation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  oldWordContainer: {
    flex: 1,
  },
  oldWordLabel: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280', // Tertiary text color
    marginBottom: 4,
    letterSpacing: 1,
  },
  oldWord: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    color: '#4A90E2', // Secondary accent color
  },
  arrowContainer: {
    marginHorizontal: 16,
  },
  newWordContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  newWordLabel: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280', // Tertiary text color
    marginBottom: 4,
    letterSpacing: 1,
  },
  newWord: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFC300', // Primary accent color
    textAlign: 'right',
  },
  wordPairDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF', // Secondary text color
    marginBottom: 12,
    fontStyle: 'italic',
  },
  wordPairFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastUsed: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280', // Tertiary text color
    marginLeft: 6,
  },
});