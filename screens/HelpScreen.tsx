import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, LayoutAnimation, UIManager, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { X as XIcon, ChevronDown } from 'lucide-react-native';
import { createContextLogger } from '@/lib/logger';

const log = createContextLogger('HelpScreen');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const TEXT_PRIMARY = '#F5F5F0';
const TEXT_SECONDARY = '#9CA3AF';
const PRIMARY_BACKGROUND = '#121820';
const COMPONENT_BACKGROUND = '#1F2937';
const BORDER_COLOR = '#374151';
const ACCENT_PRIMARY = '#FFC300';

interface FAQItemProps {
  question: string;
  answer: string;
}

const faqData: FAQItemProps[] = [
  {
    question: "What is The Architect?",
    answer: "The Architect is a sanctuary for your thoughts. It helps you identify limiting language and consciously replace it with empowering words, transforming how you speak to yourself and experience your reality.",
  },
  {
    question: "How does the Workshop work?",
    answer: "Tap the pulsing orb on the Workshop screen and speak your thoughts. Your voice will be transcribed into text. The app will then highlight words you've marked as 'Old Words' in your Lexicon, allowing you to reframe them.",
  },
  {
    question: "What is the Lexicon?",
    answer: "The Lexicon is your personal dictionary of transformation. You populate it with 'Old Words' (limiting language) and the 'New Words' (empowering alternatives) you want to use instead. It's the engine of your reframing practice.",
  },
  {
    question: "Is my audio saved?",
    answer: "No. Your privacy is paramount. Your audio recording is sent securely for transcription and is immediately discarded. We never store your audio files. Only the final text transcript is saved to your account.",
  },
  {
    question: "What is the Guide's Reflection?",
    answer: "After you reframe your entry, our AI Guide (powered by Google Gemini) provides an encouraging summary. It reflects on your new perspective, helping to reinforce the positive changes you're making.",
  },
    {
    question: "How do I delete my account?",
    answer: "You can permanently delete your account and all associated data by navigating to the Guide tab, selecting 'Profile', and then tapping 'Delete Account' at the bottom of the screen.",
  },
];

const FAQItem: React.FC<FAQItemProps> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsOpen(!isOpen);
  };

  return (
    <View style={styles.faqItemContainer}>
      <TouchableOpacity onPress={toggleOpen} style={styles.questionContainer}>
        <Text style={styles.questionText}>{question}</Text>
        <ChevronDown color={isOpen ? ACCENT_PRIMARY : TEXT_SECONDARY} size={24} style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }} />
      </TouchableOpacity>
      {isOpen && (
        <View style={styles.answerContainer}>
          <Text style={styles.answerText}>{answer}</Text>
        </View>
      )}
    </View>
  );
};

export default function HelpScreen() {
  const router = useRouter();

  const handleClose = () => {
    log.info('HelpScreen close button pressed');
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.innerContainer}>
        <View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Close help"
            accessibilityRole="button"
          >
            <XIcon color="#9CA3AF" size={28} />
          </TouchableOpacity>
          <Text style={styles.title}>Help & FAQ</Text>
          <Text style={styles.subtitle}>Find answers to common questions.</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {faqData.map((item, index) => (
              <FAQItem key={index} question={item.question} answer={item.answer} />
            ))}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PRIMARY_BACKGROUND,
  },
  innerContainer: {
    flex: 1,
    paddingHorizontal: 20,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 0,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'transparent',
  },
  title: {
    color: TEXT_PRIMARY,
    fontFamily: 'Inter-Bold',
    fontSize: 32,
    textAlign: 'center',
    marginTop: 16,
  },
  subtitle: {
    color: TEXT_SECONDARY,
    marginTop: 12,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
  },
  content: {
    paddingBottom: 40,
  },
  faqItemContainer: {
    backgroundColor: COMPONENT_BACKGROUND,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginBottom: 16,
    overflow: 'hidden',
  },
  questionContainer: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  questionText: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    marginRight: 12,
  },
  answerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  answerText: {
    color: TEXT_SECONDARY,
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    lineHeight: 22,
  }
}); 