import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { SessionService, JournalSession } from '@/services/sessionService';
import { aiApiClient, AnalyzeEntryResponse } from '@/lib/aiApiClient';
import { logger } from '@/lib/logger';

/**
 * EntryDetailScreen
 * ---------------------------------------------------------------------------
 * Displays detailed view of a journal entry with two tabs:
 * 1. Transcript - Shows original transcript and AI summary
 * 2. Analysis - Shows comprehensive AI analysis with mood, themes, insights
 * 
 * Following project guidelines:
 * - BaaS First: Uses Supabase for data operations
 * - Modular Architecture: Clean separation of concerns
 * - TypeScript: Fully typed implementation
 * - Comprehensive Logging: Logs all user interactions and API calls
 * ---------------------------------------------------------------------------
 */

type TabType = 'transcript' | 'analysis';

const EntryDetailScreen: React.FC = () => {
  const router = useRouter();
  const { session } = useAuth();
  const { entryId } = useLocalSearchParams<{ entryId: string }>();
  
  // Component state
  const [activeTab, setActiveTab] = useState<TabType>('transcript');
  const [entry, setEntry] = useState<JournalSession | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzeEntryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzingEntry, setAnalyzingEntry] = useState(false);

  /**
   * Load entry details on component mount
   */
  useEffect(() => {
    if (entryId) {
      logger.info('EntryDetailScreen mounted', {
        entryId,
        userId: session?.user?.id,
        context: 'EntryDetailScreen'
      });
      loadEntryDetails();
    }
  }, [entryId]);

  /**
   * Load entry details from Supabase
   */
  const loadEntryDetails = async () => {
    if (!session?.user || !entryId) {
      logger.warn('No authenticated user or entry ID', {
        hasUser: !!session?.user,
        entryId,
        context: 'EntryDetailScreen'
      });
      setLoading(false);
      return;
    }

    try {
      logger.info('Loading entry details', {
        entryId,
        userId: session.user.id,
        context: 'EntryDetailScreen'
      });

      const entryDetails = await SessionService.getSessionById(entryId, session.user.id);
      setEntry(entryDetails);

      logger.info('Entry details loaded successfully', {
        entryId,
        userId: session.user.id,
        hasTranscript: !!entryDetails.original_transcript,
        hasSummary: !!entryDetails.ai_summary,
        context: 'EntryDetailScreen'
      });

    } catch (error) {
      logger.error('Failed to load entry details', {
        entryId,
        userId: session.user.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        context: 'EntryDetailScreen'
      });

      Alert.alert(
        'Error Loading Entry',
        'Unable to load entry details. Please try again.',
        [
          { text: 'Go Back', onPress: () => router.back() },
          { text: 'Retry', onPress: loadEntryDetails }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle entry analysis when analysis tab is selected
   */
  const handleAnalysisTab = async () => {
    setActiveTab('analysis');

    // If analysis already loaded, don't reload
    if (analysis || !entry || analyzingEntry) {
      return;
    }

    logger.info('Starting entry analysis', {
      entryId: entry.id,
      userId: session?.user?.id,
      context: 'EntryDetailScreen'
    });

    setAnalyzingEntry(true);

    try {
      const analysisResult = await aiApiClient.analyzeEntry({
        journal_session_id: entry.id
      });

      logger.info('Entry analysis completed successfully', {
        entryId: entry.id,
        userId: session?.user?.id,
        processingTimeMs: analysisResult.processing_time_ms,
        context: 'EntryDetailScreen'
      });

      setAnalysis(analysisResult);

    } catch (error) {
      logger.error('Failed to analyze entry', {
        entryId: entry.id,
        userId: session?.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        context: 'EntryDetailScreen'
      });

      Alert.alert(
        'Analysis Error',
        'Unable to analyze this entry. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setAnalyzingEntry(false);
    }
  };

  /**
   * Handle tab change
   */
  const handleTabChange = (tab: TabType) => {
    logger.info('Tab changed', {
      previousTab: activeTab,
      newTab: tab,
      entryId: entry?.id,
      context: 'EntryDetailScreen'
    });

    if (tab === 'analysis') {
      handleAnalysisTab();
    } else {
      setActiveTab(tab);
    }
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  /**
   * Handle back navigation
   */
  const handleBack = () => {
    logger.info('Navigating back from entry detail', {
      entryId: entry?.id,
      context: 'EntryDetailScreen'
    });
    router.back();
  };

  /**
   * Render transcript tab content
   */
  const renderTranscriptTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Original Transcript */}
      <View style={styles.contentSection}>
        <Text style={styles.sectionTitle}>Original Thoughts</Text>
        <Text style={styles.transcriptText}>{entry?.original_transcript}</Text>
      </View>

      {/* Reframed Text (if different) */}
      {entry?.reframed_text && entry.reframed_text !== entry.original_transcript && (
        <View style={styles.contentSection}>
          <Text style={styles.sectionTitle}>Reframed Thoughts</Text>
          <Text style={styles.reframedText}>{entry.reframed_text}</Text>
        </View>
      )}

      {/* AI Summary */}
      {entry?.ai_summary && (
        <View style={styles.contentSection}>
          <Text style={styles.sectionTitle}>Guide's Reflection</Text>
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryText}>{entry.ai_summary}</Text>
          </View>
        </View>
      )}

      {/* Session Stats */}
      <View style={styles.contentSection}>
        <Text style={styles.sectionTitle}>Session Details</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Transformations</Text>
            <Text style={styles.statValue}>
              {entry?.transformations_applied?.length || 0}
            </Text>
          </View>
          {entry?.mood_before && (
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Mood Before</Text>
              <Text style={styles.statValue}>{entry.mood_before}</Text>
            </View>
          )}
          {entry?.mood_after && (
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Mood After</Text>
              <Text style={styles.statValue}>{entry.mood_after}</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );

  /**
   * Render analysis tab content
   */
  const renderAnalysisTab = () => {
    if (analyzingEntry) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFC300" />
          <Text style={styles.loadingText}>Analyzing your entry...</Text>
        </View>
      );
    }

    if (!analysis) {
      return (
        <View style={styles.emptyAnalysisContainer}>
          <Ionicons name="analytics-outline" size={64} color="#6B7280" />
          <Text style={styles.emptyAnalysisTitle}>No Analysis Yet</Text>
          <Text style={styles.emptyAnalysisSubtitle}>
            Switch to this tab to generate AI analysis of your entry.
          </Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {/* Entry Breakdown */}
        <View style={styles.contentSection}>
          <Text style={styles.sectionTitle}>Entry Breakdown</Text>
          <Text style={styles.analysisText}>{analysis.entry_breakdown}</Text>
        </View>

        {/* Mood */}
        {analysis.mood.length > 0 && (
          <View style={styles.contentSection}>
            <Text style={styles.sectionTitle}>Mood</Text>
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
          <View style={styles.contentSection}>
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
          <View style={styles.contentSection}>
            <Text style={styles.sectionTitle}>Themes</Text>
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
          <View style={styles.contentSection}>
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
        <View style={styles.contentSection}>
          <Text style={styles.sectionTitle}>Actionable Insight</Text>
          <View style={styles.insightContainer}>
            <Text style={styles.insightText}>{analysis.actionable_insight}</Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  // Show loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFC300" />
          <Text style={styles.loadingText}>Loading entry...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error if no entry found
  if (!entry) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#E53E3E" />
          <Text style={styles.errorTitle}>Entry Not Found</Text>
          <Text style={styles.errorSubtitle}>
            This entry could not be loaded. It may have been deleted or you don't have access to it.
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Row: Back Button (absolute left), Tab Navigation (centered) */}
      <View style={styles.topRowContainer}>
        {/* Back Button pinned to the left edge */}
        <TouchableOpacity onPress={handleBack} style={styles.inlineBackIcon} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={24} color="#F5F5F0" />
        </TouchableOpacity>
        {/* Centered Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'transcript' && styles.activeTab
            ]}
            onPress={() => handleTabChange('transcript')}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'transcript' && styles.activeTabText
            ]}>
              Transcript
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'analysis' && styles.activeTab
            ]}
            onPress={() => handleTabChange('analysis')}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'analysis' && styles.activeTabText
            ]}>
              Analysis
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Content */}
      <View style={styles.contentContainer}>
        {activeTab === 'transcript' ? renderTranscriptTab() : renderAnalysisTab()}
      </View>
    </SafeAreaView>
  );
};

export default EntryDetailScreen;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121820',
  },
  /**
   * Top row container for back button and tabs
   * - Back button is absolutely positioned left
   * - Tab container is centered
   */
  topRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 16,
    marginBottom: 10,
    height: 48, // Ensures enough height for absolute back button
  },
  /**
   * Back button pinned to the left edge
   */
  inlineBackIcon: {
    position: 'absolute',
    left: 20, // Flush with screen edge or desired padding
    zIndex: 2,
    padding: 4,
    borderRadius: 8,
  },
  /**
   * Tab container is centered, with left padding to avoid overlap with back button
   */
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 4,
    minWidth: 0,
    paddingLeft: 12, // Ensures tabs don't overlap with back button
    paddingRight: 12, // Optional: add right padding for symmetry
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#F5F5F0',
  },
  tabText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: '#9CA3AF',
  },
  activeTabText: {
    color: '#121820',
  },
  contentContainer: {
    flex: 1,
    marginTop: 16,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  contentSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#F5F5F0',
    marginBottom: 12,
  },
  transcriptText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#F5F5F0',
    lineHeight: 24,
  },
  reframedText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#10B981',
    lineHeight: 24,
  },
  summaryContainer: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC300',
  },
  summaryText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#F5F5F0',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statItem: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    minWidth: 100,
    alignItems: 'center',
  },
  statLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  statValue: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#FFC300',
  },
  analysisText: {
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
  insightContainer: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC300',
  },
  insightText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#F5F5F0',
    lineHeight: 24,
    fontStyle: 'italic',
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
  emptyAnalysisContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyAnalysisTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: '#F5F5F0',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyAnalysisSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 24,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: '#E53E3E',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#FFC300',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#121820',
  },
}); 