import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { logger } from '@/lib/logger';

/**
 * EntriesScreen
 * ---------------------------------------------------------------------------
 * Placeholder screen for displaying a list of the user's journal entries.
 * For now, it simply renders static text indicating that the feature is
 * under construction.
 * ---------------------------------------------------------------------------
 */
const EntriesScreen: React.FC = () => {
  // Log screen mount for debugging and analytics
  React.useEffect(() => {
    logger.info('EntriesScreen mounted');
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Entries</Text>
        <Text style={styles.subtitle}>Your journal entries will appear here soon.</Text>
      </View>
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#F5F5F0',
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
}); 