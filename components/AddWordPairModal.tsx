import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, ArrowRight } from 'lucide-react-native';
import { createContextLogger } from '@/lib/logger';
import { LexiconService, WordPair } from '@/services/lexiconService';
import { StyleSheet } from 'react-native';

// Create context-specific logger for the modal
const modalLogger = createContextLogger('AddWordPairModal');

interface AddWordPairModalProps {
  visible: boolean;
  onClose: () => void;
  onWordPairAdded: (wordPair: WordPair) => void;
  userId: string;
}

/**
 * AddWordPairModal Component
 * Allows users to add new word transformations to their lexicon
 * Validates input and prevents duplicates following styling guidelines
 */
export const AddWordPairModal: React.FC<AddWordPairModalProps> = ({
  visible,
  onClose,
  onWordPairAdded,
  userId,
}) => {
  const [oldWord, setOldWord] = useState('');
  const [newWord, setNewWord] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * Resets all form fields to empty state
   */
  const resetForm = (): void => {
    modalLogger.debug('Resetting add word pair form');
    setOldWord('');
    setNewWord('');
    setDescription('');
  };

  /**
   * Handles closing the modal and resetting form state
   */
  const handleClose = (): void => {
    modalLogger.info('Closing add word pair modal');
    resetForm();
    onClose();
  };

  /**
   * Validates form input before submission
   * @returns boolean indicating if form is valid
   */
  const validateForm = (): boolean => {
    const trimmedOldWord = oldWord.trim();
    const trimmedNewWord = newWord.trim();

    if (!trimmedOldWord) {
      Alert.alert('Validation Error', 'Please enter the word you want to transform.');
      return false;
    }

    if (!trimmedNewWord) {
      Alert.alert('Validation Error', 'Please enter the empowering replacement word.');
      return false;
    }

    if (trimmedOldWord.toLowerCase() === trimmedNewWord.toLowerCase()) {
      Alert.alert('Validation Error', 'The old word and new word should be different.');
      return false;
    }

    return true;
  };

  /**
   * Handles form submission to add new word pair
   * Validates input, calls service, and updates parent component
   */
  const handleSubmit = async (): Promise<void> => {
    modalLogger.info('Attempting to add new word pair', {
      userId,
      oldWordLength: oldWord.length,
      newWordLength: newWord.length,
      hasDescription: !!description.trim()
    });

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const newWordPair = await LexiconService.addWordPair(
        userId,
        oldWord.trim(),
        newWord.trim(),
        description.trim() || undefined
      );

      modalLogger.info('Word pair added successfully', {
        wordPairId: newWordPair.id,
        transformation: `${newWordPair.old_word} → ${newWordPair.new_word}`
      });

      // Notify parent component
      onWordPairAdded(newWordPair);

      // Show success message
      Alert.alert(
        'Word Pair Added!',
        `Successfully added "${newWordPair.old_word} → ${newWordPair.new_word}" to your lexicon.`,
        [{ text: 'Great!' }]
      );

      // Close modal and reset form
      handleClose();

    } catch (error) {
      modalLogger.error('Failed to add word pair', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      Alert.alert(
        'Error Adding Word Pair',
        error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.title}>Add Word Pair</Text>
                <Text style={styles.subtitle}>
                  Create a new transformation for your lexicon
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={handleClose}
                disabled={loading}
              >
                <X color="#F5F5F0" size={24} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {/* Form Content */}
            <View style={styles.content}>
              {/* Old Word Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Limiting Word</Text>
                <Text style={styles.inputDescription}>
                  The word or phrase you want to transform
                </Text>
                <TextInput
                  style={styles.input}
                  value={oldWord}
                  onChangeText={setOldWord}
                  placeholder="e.g., can't, impossible, stressed"
                  placeholderTextColor="#6B7280"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>

              {/* Arrow Indicator */}
              <View style={styles.arrowContainer}>
                <ArrowRight color="#FFC300" size={24} strokeWidth={2} />
              </View>

              {/* New Word Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Empowering Word</Text>
                <Text style={styles.inputDescription}>
                  The positive replacement that expands possibility
                </Text>
                <TextInput
                  style={styles.input}
                  value={newWord}
                  onChangeText={setNewWord}
                  placeholder="e.g., choose to, possible, energized"
                  placeholderTextColor="#6B7280"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>

              {/* Description Input (Optional) */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Description <Text style={styles.optional}>(Optional)</Text>
                </Text>
                <Text style={styles.inputDescription}>
                  Add context or a reminder about when to use this transformation
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="e.g., Use when feeling overwhelmed to reclaim choice"
                  placeholderTextColor="#6B7280"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  editable={!loading}
                />
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={handleClose}
                disabled={loading}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.primaryButton,
                  loading && styles.buttonDisabled
                ]}
                onPress={handleSubmit}
                disabled={loading || !oldWord.trim() || !newWord.trim()}
              >
                {loading ? (
                  <ActivityIndicator color="#121820" size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>Add Word Pair</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

/**
 * Styles following the Archie design system
 * Uses the established color palette and typography
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121820', // primary-background
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700', // Inter-Bold
    color: '#F5F5F0', // text-primary
    marginBottom: 4,
    fontFamily: 'Inter-Bold',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400', // Inter-Regular
    color: '#9CA3AF', // text-secondary
    fontFamily: 'Inter-Regular',
  },
  closeButton: {
    padding: 8,
    marginTop: -8,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600', // Inter-SemiBold
    color: '#F5F5F0', // text-primary
    marginBottom: 4,
    fontFamily: 'Inter-SemiBold',
  },
  optional: {
    fontSize: 14,
    fontWeight: '400', // Inter-Regular
    color: '#9CA3AF', // text-secondary
    fontFamily: 'Inter-Regular',
  },
  inputDescription: {
    fontSize: 14,
    fontWeight: '400', // Inter-Regular
    color: '#9CA3AF', // text-secondary
    marginBottom: 8,
    fontFamily: 'Inter-Regular',
  },
  input: {
    backgroundColor: '#1F2937', // component-background
    borderWidth: 1,
    borderColor: '#374151', // border
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontWeight: '400', // Inter-Regular
    color: '#F5F5F0', // text-primary
    fontFamily: 'Inter-Regular',
  },
  textArea: {
    minHeight: 80,
    paddingTop: 16,
  },
  arrowContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#FFC300', // accent-primary
  },
  secondaryButton: {
    backgroundColor: '#1F2937', // component-background
    borderWidth: 1,
    borderColor: '#374151', // border
  },
  buttonDisabled: {
    backgroundColor: '#374151', // border
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600', // Inter-SemiBold
    color: '#121820', // primary-background
    fontFamily: 'Inter-SemiBold',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600', // Inter-SemiBold
    color: '#F5F5F0', // text-primary
    fontFamily: 'Inter-SemiBold',
  },
}); 