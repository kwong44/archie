import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, Plus, Edit3 } from 'lucide-react-native';

interface WordPair {
  id: string;
  oldWord: string;
  newWord: string;
  frequency: number;
  lastUsed: string;
}

export default function LexiconScreen() {
  const [wordPairs] = useState<WordPair[]>([
    {
      id: '1',
      oldWord: 'anxious',
      newWord: 'excited',
      frequency: 12,
      lastUsed: '2 days ago'
    },
    {
      id: '2',
      oldWord: 'stressed',
      newWord: 'energized',
      frequency: 8,
      lastUsed: '1 week ago'
    },
    {
      id: '3',
      oldWord: 'overwhelmed',
      newWord: 'full of opportunities',
      frequency: 5,
      lastUsed: '3 days ago'
    },
    {
      id: '4',
      oldWord: 'tired',
      newWord: 'recharging',
      frequency: 15,
      lastUsed: '1 day ago'
    },
    {
      id: '5',
      oldWord: 'confused',
      newWord: 'exploring',
      frequency: 3,
      lastUsed: '1 week ago'
    }
  ]);

  const sortedPairs = [...wordPairs].sort((a, b) => b.frequency - a.frequency);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Your Lexicon</Text>
          <Text style={styles.subtitle}>Words that transform your perspective</Text>
        </View>

        <TouchableOpacity style={styles.addButton}>
          <Plus color="#121820" size={20} strokeWidth={2} />
          <Text style={styles.addButtonText}>Add New Word Pair</Text>
        </TouchableOpacity>

        <View style={styles.wordPairsList}>
          {sortedPairs.map((pair) => (
            <View key={pair.id} style={styles.wordPairCard}>
              <View style={styles.wordPairHeader}>
                <View style={styles.frequencyBadge}>
                  <Text style={styles.frequencyText}>{pair.frequency}x</Text>
                </View>
                <TouchableOpacity style={styles.editButton}>
                  <Edit3 color="#6B7280" size={16} strokeWidth={2} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.wordTransformation}>
                <View style={styles.oldWordContainer}>
                  <Text style={styles.oldWordLabel}>FROM</Text>
                  <Text style={styles.oldWord}>{pair.oldWord}</Text>
                </View>
                
                <View style={styles.arrowContainer}>
                  <ArrowRight color="#FFC300" size={24} strokeWidth={2} />
                </View>
                
                <View style={styles.newWordContainer}>
                  <Text style={styles.newWordLabel}>TO</Text>
                  <Text style={styles.newWord}>{pair.newWord}</Text>
                </View>
              </View>
              
              <Text style={styles.lastUsed}>Last used {pair.lastUsed}</Text>
            </View>
          ))}
        </View>

        <View style={styles.stats}>
          <Text style={styles.statsTitle}>Your Progress</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{wordPairs.length}</Text>
              <Text style={styles.statLabel}>Word Pairs</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>
                {wordPairs.reduce((sum, pair) => sum + pair.frequency, 0)}
              </Text>
              <Text style={styles.statLabel}>Transformations</Text>
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFC300',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 30,
  },
  addButtonText: {
    color: '#121820',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    marginLeft: 8,
  },
  wordPairsList: {
    gap: 16,
    marginBottom: 30,
  },
  wordPairCard: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  wordPairHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  frequencyBadge: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  frequencyText: {
    color: '#F5F5F0',
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
    color: '#6B7280',
    marginBottom: 4,
    letterSpacing: 1,
  },
  oldWord: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    color: '#4A90E2',
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
    color: '#6B7280',
    marginBottom: 4,
    letterSpacing: 1,
  },
  newWord: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFC300',
    textAlign: 'right',
  },
  lastUsed: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  stats: {
    marginTop: 20,
  },
  statsTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#F5F5F0',
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  statNumber: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#FFC300',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
  },
});