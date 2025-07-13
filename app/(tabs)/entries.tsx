import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  RefreshControl, 
  Alert, 
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { SessionService, JournalSession } from '@/services/sessionService';
import { logger } from '@/lib/logger';

/**
 * EntriesScreen
 * ---------------------------------------------------------------------------
 * Displays a list of user's journal entries with AI analysis functionality.
 * Users can tap on entries to see detailed analysis including mood, themes,
 * and actionable insights from the AI Guide.
 * 
 * Following project guidelines:
 * - BaaS First: Uses Supabase for data operations
 * - Comprehensive Logging: Logs all user interactions
 * - Modular Architecture: Uses dedicated services
 * - TypeScript: Fully typed implementation
 * ---------------------------------------------------------------------------
 */
const EntriesScreen: React.FC = () => {
  const router = useRouter();
  const { session } = useAuth();
  const [entries, setEntries] = useState<JournalSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Load user's journal entries on component mount
   */
  useEffect(() => {
    logger.info('EntriesScreen mounted, loading user entries');
    loadEntries();
  }, []);

  /**
   * Load entries from Supabase using SessionService
   */
  const loadEntries = async () => {
    if (!session?.user) {
      logger.warn('No authenticated user, cannot load entries');
      setLoading(false);
      return;
    }

    try {
      logger.info('Loading journal entries for user', {
        userId: session.user.id,
        context: 'EntriesScreen'
      });

      const userEntries = await SessionService.getUserSessions(session.user.id, 20);
      setEntries(userEntries);

      logger.info('Journal entries loaded successfully', {
        userId: session.user.id,
        entriesCount: userEntries.length,
        context: 'EntriesScreen'
      });

    } catch (error) {
      logger.error('Failed to load journal entries', {
        userId: session.user.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        context: 'EntriesScreen'
      });

      Alert.alert(
        'Error Loading Entries',
        'Unable to load your journal entries. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle pull-to-refresh
   */
  const handleRefresh = async () => {
    setRefreshing(true);
    logger.info('Refreshing journal entries list');
    await loadEntries();
    setRefreshing(false);
  };

  /**
   * Handle entry press - navigate to entry detail screen
   */
  const handleEntryPress = (entry: JournalSession) => {
    logger.info('Navigating to entry detail', {
      userId: session?.user?.id,
      sessionId: entry.id,
      context: 'EntriesScreen'
    });

    router.push({
      pathname: '/entry-detail',
      params: { entryId: entry.id }
    });
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined 
      });
    }
  };

  /**
   * Get entry preview text - uses AI-generated description or fallback to transcript preview
   */
  const getEntryPreview = (entry: JournalSession): string => {
    // Use AI-generated description if available
    if (entry.description) {
      return entry.description;
    }
    
    // Fallback to transcript preview (first 100 characters)
    const text = entry.reframed_text || entry.original_transcript || '';
    return text.length > 100 ? `${text.substring(0, 100)}...` : text;
  };

  /**
   * Render individual entry item
   */
  const renderEntryItem = ({ item }: { item: JournalSession }) => (
    <TouchableOpacity
      style={styles.entryCard}
      onPress={() => handleEntryPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.entryHeader}>
        <Text style={styles.entryDate}>{formatDate(item.created_at)}</Text>
        <View style={styles.entryActions}>
          <Ionicons name="chevron-forward" size={20} color="#FFC300" />
        </View>
      </View>
      
      <Text style={styles.entryPreview}>{getEntryPreview(item)}</Text>
      
      <View style={styles.entryFooter}>
        <View style={styles.entryStats}>
          <Text style={styles.statText}>
            {item.transformations_applied?.length || 0} transformations
          </Text>
          {item.mood_after && (
            <Text style={styles.moodText}>Mood: {item.mood_after}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  /**
   * Render empty state
   */
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="journal-outline" size={64} color="#6B7280" />
      <Text style={styles.emptyTitle}>No Entries Yet</Text>
      <Text style={styles.emptySubtitle}>
        Start your transformation journey by recording your first entry in the Workshop.
      </Text>
    </View>
  );



  // Show loading state
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFC300" />
          <Text style={styles.loadingText}>Loading your entries...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Entries</Text>
        <Text style={styles.subtitle}>
          {entries.length} journal {entries.length === 1 ? 'entry' : 'entries'}
        </Text>
      </View>

      <FlatList
        data={entries}
        renderItem={renderEntryItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#FFC300']}
            tintColor="#FFC300"
          />
        }
        contentContainerStyle={entries.length === 0 ? styles.emptyContainer : styles.listContainer}
        showsVerticalScrollIndicator={false}
      />


    </SafeAreaView>
  );
};

export default EntriesScreen;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121820',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#F5F5F0',
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#9CA3AF',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  entryCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  entryDate: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#FFC300',
  },
  entryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  entryPreview: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#F5F5F0',
    lineHeight: 24,
    marginBottom: 12,
  },
  entryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#9CA3AF',
  },
  moodText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#10B981',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: '#F5F5F0',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#9CA3AF',
  },
}); 