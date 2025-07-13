import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  RefreshControl, 
  Alert, 
  Modal, 
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { SessionService, JournalSession } from '@/services/sessionService';
import { aiApiClient, AnalyzeEntryResponse } from '@/lib/aiApiClient';
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
  const { session } = useAuth();
  const [entries, setEntries] = useState<JournalSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalSession | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzeEntryResponse | null>(null);
  const [analysisModalVisible, setAnalysisModalVisible] = useState(false);
  const [analyzingEntry, setAnalyzingEntry] = useState(false);

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
   * Handle entry analysis request
   */
  const handleAnalyzeEntry = async (entry: JournalSession) => {
    logger.info('Analyzing journal entry', {
      userId: session?.user?.id,
      sessionId: entry.id,
      context: 'EntriesScreen'
    });

    setSelectedEntry(entry);
    setAnalyzingEntry(true);
    setAnalysisModalVisible(true);
    setAnalysis(null);

    try {
      const analysisResult = await aiApiClient.analyzeEntry({
        journal_session_id: entry.id
      });

      logger.info('Entry analysis completed successfully', {
        userId: session?.user?.id,
        sessionId: entry.id,
        processingTimeMs: analysisResult.processing_time_ms,
        context: 'EntriesScreen'
      });

      setAnalysis(analysisResult);

    } catch (error) {
      logger.error('Failed to analyze journal entry', {
        userId: session?.user?.id,
        sessionId: entry.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        context: 'EntriesScreen'
      });

      Alert.alert(
        'Analysis Error',
        'Unable to analyze this entry. Please try again.',
        [{ text: 'OK' }]
      );
      setAnalysisModalVisible(false);
    } finally {
      setAnalyzingEntry(false);
    }
  };

  /**
   * Close analysis modal
   */
  const closeAnalysisModal = () => {
    setAnalysisModalVisible(false);
    setSelectedEntry(null);
    setAnalysis(null);
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
   * Get entry preview text (first 100 characters)
   */
  const getEntryPreview = (entry: JournalSession): string => {
    const text = entry.reframed_text || entry.original_transcript || '';
    return text.length > 100 ? `${text.substring(0, 100)}...` : text;
  };

  /**
   * Render individual entry item
   */
  const renderEntryItem = ({ item }: { item: JournalSession }) => (
    <TouchableOpacity
      style={styles.entryCard}
      onPress={() => handleAnalyzeEntry(item)}
      activeOpacity={0.7}
    >
      <View style={styles.entryHeader}>
        <Text style={styles.entryDate}>{formatDate(item.created_at)}</Text>
        <View style={styles.entryActions}>
          <Ionicons name="analytics-outline" size={20} color="#FFC300" />
          <Text style={styles.analyzeText}>Analyze</Text>
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

  /**
   * Render analysis modal content
   */
  const renderAnalysisContent = () => {
    if (!selectedEntry) return null;

    return (
      <ScrollView style={styles.analysisContent} showsVerticalScrollIndicator={false}>
        <View style={styles.analysisHeader}>
          <Text style={styles.analysisTitle}>Entry Analysis</Text>
          <TouchableOpacity onPress={closeAnalysisModal}>
            <Ionicons name="close-outline" size={24} color="#F5F5F0" />
          </TouchableOpacity>
        </View>

        <Text style={styles.analysisDate}>
          {formatDate(selectedEntry.created_at)}
        </Text>

        {analyzingEntry ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFC300" />
            <Text style={styles.loadingText}>Analyzing your entry...</Text>
          </View>
        ) : analysis ? (
          <>
            {/* Entry Breakdown */}
            <View style={styles.analysisSection}>
              <Text style={styles.sectionTitle}>💭 Entry Breakdown</Text>
              <Text style={styles.sectionContent}>{analysis.entry_breakdown}</Text>
            </View>

            {/* Mood */}
            {analysis.mood.length > 0 && (
              <View style={styles.analysisSection}>
                <Text style={styles.sectionTitle}>🎭 Mood</Text>
                <View style={styles.moodContainer}>
                  {analysis.mood.map((mood, index) => (
                    <View key={index} style={styles.moodTag}>
                      <Text style={styles.moodTagText}>{mood}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* People */}
            {analysis.people.length > 0 && (
              <View style={styles.analysisSection}>
                <Text style={styles.sectionTitle}>👥 People Mentioned</Text>
                <View style={styles.peopleContainer}>
                  {analysis.people.map((person, index) => (
                    <View key={index} style={styles.personTag}>
                      <Text style={styles.personTagText}>{person}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Themes */}
            {analysis.identified_themes.length > 0 && (
              <View style={styles.analysisSection}>
                <Text style={styles.sectionTitle}>🎯 Themes</Text>
                <View style={styles.themesContainer}>
                  {analysis.identified_themes.map((theme, index) => (
                    <View key={index} style={styles.themeTag}>
                      <Text style={styles.themeTagText}>{theme}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Lexicon Words */}
            {analysis.lexicon_words_identified.length > 0 && (
              <View style={styles.analysisSection}>
                <Text style={styles.sectionTitle}>🔄 Words Transformed</Text>
                <View style={styles.lexiconContainer}>
                  {analysis.lexicon_words_identified.map((word, index) => (
                    <View key={index} style={styles.lexiconPair}>
                      <Text style={styles.oldWord}>{word.old}</Text>
                      <Ionicons name="arrow-forward" size={16} color="#FFC300" />
                      <Text style={styles.newWord}>{word.new}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Actionable Insight */}
            <View style={styles.analysisSection}>
              <Text style={styles.sectionTitle}>💡 Actionable Insight</Text>
              <Text style={styles.insightText}>{analysis.actionable_insight}</Text>
            </View>
          </>
        ) : null}
      </ScrollView>
    );
  };

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

      {/* Analysis Modal */}
      <Modal
        visible={analysisModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeAnalysisModal}
      >
        <View style={styles.modalContainer}>
          {renderAnalysisContent()}
        </View>
      </Modal>
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
  analyzeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#FFC300',
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#121820',
  },
  analysisContent: {
    flex: 1,
    padding: 20,
  },
  analysisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  analysisTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#F5F5F0',
  },
  analysisDate: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 24,
  },
  analysisSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#F5F5F0',
    marginBottom: 12,
  },
  sectionContent: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#F5F5F0',
    lineHeight: 24,
  },
  moodContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  moodTag: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  moodTagText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#F5F5F0',
  },
  peopleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  personTag: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  personTagText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#F5F5F0',
  },
  themesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  themeTag: {
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#FFC300',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  themeTagText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#FFC300',
  },
  lexiconContainer: {
    gap: 8,
  },
  lexiconPair: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  oldWord: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  newWord: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#10B981',
  },
  insightText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#F5F5F0',
    lineHeight: 24,
    fontStyle: 'italic',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC300',
  },
}); 