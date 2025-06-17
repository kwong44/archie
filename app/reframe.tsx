import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Sparkles, RefreshCw } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

export default function ReframeScreen() {
  const router = useRouter();
  const [transcript, setTranscript] = useState(
    "I'm feeling really anxious about this presentation tomorrow. I'm worried I'm going to mess up and everyone will think I'm incompetent. I always get so stressed about these things, and I feel like I'm just not good enough for this job. It's overwhelming having so many expectations on me."
  );
  
  const [isReframing, setIsReframing] = useState(false);
  const [reframedWords, setReframedWords] = useState<{[key: string]: string}>({});
  
  // Identified "old words" that can be reframed
  const oldWords = {
    'anxious': 'excited',
    'worried': 'preparing',
    'stressed': 'energized',
    'overwhelmed': 'full of opportunities',
    'not good enough': 'still growing'
  };

  const reframeWord = (oldWord: string, newWord: string) => {
    setIsReframing(true);
    setTimeout(() => {
      setReframedWords(prev => ({ ...prev, [oldWord]: newWord }));
      setIsReframing(false);
    }, 500);
  };

  const getDisplayText = () => {
    let displayText = transcript;
    Object.entries(reframedWords).forEach(([oldWord, newWord]) => {
      displayText = displayText.replace(new RegExp(oldWord, 'gi'), newWord);
    });
    return displayText;
  };

  const renderTranscriptWithHighlights = () => {
    const words = transcript.split(' ');
    return words.map((word, index) => {
      const cleanWord = word.toLowerCase().replace(/[.,!?]/g, '');
      const isOldWord = oldWords.hasOwnProperty(cleanWord) || 
                       Object.keys(oldWords).some(phrase => cleanWord.includes(phrase.split(' ')[0]));
      const isReframed = reframedWords.hasOwnProperty(cleanWord) ||
                        Object.keys(reframedWords).some(phrase => cleanWord.includes(phrase.split(' ')[0]));
      
      return (
        <TouchableOpacity
          key={index}
          onPress={() => {
            if (isOldWord && !isReframed) {
              const matchedOldWord = Object.keys(oldWords).find(phrase => 
                cleanWord.includes(phrase.split(' ')[0])
              ) || cleanWord;
              reframeWord(matchedOldWord, oldWords[matchedOldWord]);
            }
          }}
          style={[
            styles.word,
            isOldWord && !isReframed && styles.oldWord,
            isReframed && styles.reframedWord
          ]}
        >
          <Text style={[
            styles.transcriptText,
            isOldWord && !isReframed && styles.oldWordText,
            isReframed && styles.reframedWordText
          ]}>
            {isReframed ? (reframedWords[cleanWord] || oldWords[cleanWord] || word) : word}
          </Text>
        </TouchableOpacity>
      );
    });
  };

  const generateSummary = () => {
    const reframedText = getDisplayText();
    return `You're preparing for an important presentation, feeling excited about the opportunity to share your work. This energy you're experiencing shows how much you care about doing well. Remember that growth happens when we step into new challenges, and you're exactly where you need to be in your journey. The expectations you feel are a sign that others believe in your capabilities.`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft color="#F5F5F0" size={24} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>The Blueprint</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.transcriptContainer}>
          <Text style={styles.sectionTitle}>Your Thoughts</Text>
          <View style={styles.transcriptBox}>
            <View style={styles.transcriptContent}>
              {renderTranscriptWithHighlights()}
            </View>
          </View>
          
          <Text style={styles.helpText}>
            Tap the <Text style={styles.blueText}>blue highlighted words</Text> to reframe them with more empowering language
          </Text>
        </View>

        {/* Word Transformations */}
        {Object.keys(reframedWords).length > 0 && (
          <View style={styles.transformationsContainer}>
            <Text style={styles.sectionTitle}>Transformations Made</Text>
            {Object.entries(reframedWords).map(([oldWord, newWord]) => (
              <View key={oldWord} style={styles.transformationItem}>
                <Text style={styles.transformationOld}>{oldWord}</Text>
                <Text style={styles.transformationArrow}>→</Text>
                <Text style={styles.transformationNew}>{newWord}</Text>
              </View>
            ))}
          </View>
        )}

        {/* The Guide's Summary */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryHeader}>
            <Sparkles color="#FFC300" size={20} strokeWidth={2} />
            <Text style={styles.summaryTitle}>The Guide's Reflection</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryText}>{generateSummary()}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => {
              setReframedWords({});
            }}
          >
            <RefreshCw color="#9CA3AF" size={20} strokeWidth={2} />
            <Text style={styles.secondaryButtonText}>Reset</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => router.push('/(tabs)')}
          >
            <Text style={styles.primaryButtonText}>Save & Continue</Text>
          </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#F5F5F0',
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    padding: 20,
  },
  transcriptContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#F5F5F0',
    marginBottom: 16,
  },
  transcriptBox: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#374151',
    marginBottom: 12,
  },
  transcriptContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  word: {
    marginRight: 4,
    marginBottom: 4,
    borderRadius: 4,
    paddingHorizontal: 2,
    paddingVertical: 1,
  },
  oldWord: {
    backgroundColor: 'rgba(74, 144, 226, 0.2)',
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  reframedWord: {
    backgroundColor: 'rgba(255, 195, 0, 0.2)',
    borderWidth: 1,
    borderColor: '#FFC300',
  },
  transcriptText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#F5F5F0',
    lineHeight: 24,
  },
  oldWordText: {
    color: '#4A90E2',
  },
  reframedWordText: {
    color: '#FFC300',
    fontFamily: 'Inter-SemiBold',
  },
  helpText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
  },
  blueText: {
    color: '#4A90E2',
  },
  transformationsContainer: {
    marginBottom: 30,
  },
  transformationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  transformationOld: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#4A90E2',
    flex: 1,
  },
  transformationArrow: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginHorizontal: 12,
  },
  transformationNew: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFC300',
    flex: 1,
    textAlign: 'right',
  },
  summaryContainer: {
    marginBottom: 30,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#F5F5F0',
    marginLeft: 8,
  },
  summaryBox: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#374151',
    borderLeftWidth: 4,
    borderLeftColor: '#FFC300',
  },
  summaryText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#F5F5F0',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#374151',
    paddingVertical: 16,
    borderRadius: 12,
  },
  secondaryButtonText: {
    color: '#9CA3AF',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    marginLeft: 8,
  },
  primaryButton: {
    flex: 2,
    backgroundColor: '#FFC300',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#121820',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
});