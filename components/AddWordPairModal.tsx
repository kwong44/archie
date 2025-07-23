import React, { useState, useEffect } from 'react';
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
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, ArrowRight } from 'lucide-react-native';
import { createContextLogger } from '@/lib/logger';
import { LexiconService, WordPair } from '@/services/lexiconService';

// Create context-specific logger for the modal
const modalLogger = createContextLogger('AddWordPairModal');

interface AddWordPairModalProps {
  visible: boolean;
  onClose: () => void;
  /**
   * Callback fired when a new word pair is added (create mode)
   */
  onWordPairAdded?: (wordPair: WordPair) => void;
  /**
   * Callback fired when an existing word pair is updated (edit mode)
   */
  onWordPairUpdated?: (wordPair: WordPair) => void;
  /**
   * Callback fired when an existing word pair is deleted (edit mode)
   */
  onWordPairDeleted?: (wordPairId: string) => void;
  /**
   * The authenticated user ID – required for Supabase writes
   */
  userId: string;
  /**
   * If provided, modal is shown in *edit* mode and these initial values are pre-filled
   */
  existingWordPair?: WordPair;
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
  onWordPairUpdated,
  onWordPairDeleted,
  userId,
  existingWordPair,
}) => {
  /**
   * Local form state. Values are initialised differently depending on
   * whether the modal is in *create* or *edit* mode.  */
  const [oldWord, setOldWord] = useState('');
  const [newWord, setNewWord] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * `true` when the modal is editing an existing word pair.
   * We treat the presence of `existingWordPair` as the discriminator.  */
  const isEditMode = !!existingWordPair;

  /**
   * When the modal becomes visible, populate form fields for edit mode or
   * reset them for create mode. Using `useEffect` allows us to react to
   * prop changes without manual intervention from the parent.  */
  useEffect(() => {
    if (!visible) return; // Do nothing when modal hidden

    if (isEditMode && existingWordPair) {
      modalLogger.debug('Prefilling word pair form for editing', {
        wordPairId: existingWordPair.id,
      });

      setOldWord(existingWordPair.old_word);
      setNewWord(existingWordPair.new_word);
      setDescription(existingWordPair.description ?? '');
    } else {
      // Fresh state for creation flow
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, isEditMode, existingWordPair]);

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
    modalLogger.info('Closing word pair modal');
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
    modalLogger.info(isEditMode ? 'Attempting to update word pair' : 'Attempting to add new word pair', {
      userId,
      mode: isEditMode ? 'edit' : 'create',
      wordPairId: existingWordPair?.id,
      oldWordLength: oldWord.length,
      newWordLength: newWord.length,
      hasDescription: !!description.trim(),
    });

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      if (isEditMode && existingWordPair) {
        // === Edit Flow ===
        const updated = await LexiconService.updateWordPair(
          userId,
          existingWordPair.id,
          {
            old_word: oldWord.trim(),
            new_word: newWord.trim(),
            description: description.trim() || undefined,
          }
        );

        modalLogger.info('Word pair updated successfully', {
          wordPairId: updated.id,
          transformation: `${updated.old_word} → ${updated.new_word}`,
        });

        // Notify parent
        onWordPairUpdated?.(updated);

        Alert.alert(
          'Word Pair Updated!',
          `Successfully updated "${updated.old_word} → ${updated.new_word}".`,
          [{ text: 'Great!' }]
        );

      } else {
        // === Create Flow ===
        const newWordPair = await LexiconService.addWordPair(
          userId,
          oldWord.trim(),
          newWord.trim(),
          description.trim() || undefined,
        );

        modalLogger.info('Word pair added successfully', {
          wordPairId: newWordPair.id,
          transformation: `${newWordPair.old_word} → ${newWordPair.new_word}`,
        });

        onWordPairAdded?.(newWordPair);

        Alert.alert(
          'Word Pair Added!',
          `Successfully added "${newWordPair.old_word} → ${newWordPair.new_word}" to your lexicon.`,
          [{ text: 'Great!' }]
        );
      }

      // Close modal for both flows
      handleClose();

    } catch (error) {
      const actionLabel = isEditMode ? 'update' : 'add';
      modalLogger.error(`Failed to ${actionLabel} word pair`, {
        userId,
        wordPairId: existingWordPair?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      Alert.alert(
        `Error ${isEditMode ? 'Updating' : 'Adding'} Word Pair`,
        error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles deletion of the word pair with confirmation dialog
   * Only available in edit mode when existingWordPair is provided
   */
  const handleDelete = async (): Promise<void> => {
    if (!isEditMode || !existingWordPair) {
      modalLogger.warn('Delete attempted outside of edit mode');
      return;
    }

    modalLogger.info('User requested word pair deletion', {
      userId,
      wordPairId: existingWordPair.id,
      transformation: `${existingWordPair.old_word} → ${existingWordPair.new_word}`,
    });

    // Show confirmation dialog
    Alert.alert(
      'Delete Word Pair',
      `Are you sure you want to delete "${existingWordPair.old_word} → ${existingWordPair.new_word}"?\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);

            try {
              await LexiconService.deleteWordPair(userId, existingWordPair.id);

              modalLogger.info('Word pair deleted successfully', {
                wordPairId: existingWordPair.id,
              });

              // Notify parent component
              onWordPairDeleted?.(existingWordPair.id);

              Alert.alert(
                'Word Pair Deleted',
                'The word pair has been removed from your lexicon.',
                [{ text: 'OK' }]
              );

              // Close modal
              handleClose();

            } catch (error) {
              modalLogger.error('Failed to delete word pair', {
                userId,
                wordPairId: existingWordPair.id,
                error: error instanceof Error ? error.message : 'Unknown error',
              });

              Alert.alert(
                'Error Deleting Word Pair',
                error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.',
                [{ text: 'OK' }]
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
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
                <Text style={styles.title}>{isEditMode ? 'Edit Word Pair' : 'Add Word Pair'}</Text>
                <Text style={styles.subtitle}>
                  {isEditMode ? 'Modify your existing transformation' : 'Create a new transformation for your lexicon'}
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

            {/* Actions - Vertically stacked: Save, Cancel, Delete (text) */}
            <View style={styles.actionsVertical}>
              {/* Save Button (Primary) */}
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.primaryButton,
                  loading && styles.buttonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={loading || !oldWord.trim() || !newWord.trim()}
              >
                {loading ? (
                  <ActivityIndicator color="#121820" size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>{isEditMode ? 'Save' : 'Add Word Pair'}</Text>
                )}
              </TouchableOpacity>

              {/* Cancel Button (Secondary) */}
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={handleClose}
                disabled={loading}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>

              {/* Delete Button - Only shown in edit mode, now a plain red text button */}
              {isEditMode && (
                <TouchableOpacity
                  style={styles.deleteTextButton}
                  onPress={handleDelete}
                  disabled={loading}
                >
                  <Text style={styles.deleteTextButtonText}>Delete</Text>
                </TouchableOpacity>
              )}
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
    // Old horizontal layout (kept for reference)
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  /**
   * New vertical actions layout for stacked buttons
   */
  actionsVertical: {
    flexDirection: 'column',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12, // vertical gap between buttons
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
  deleteButton: {
    backgroundColor: '#E53E3E', // utility-error
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600', // Inter-SemiBold
    color: '#F5F5F0', // text-primary
    fontFamily: 'Inter-SemiBold',
  },
  /**
   * Delete button as plain red text (no background, no border)
   */
  deleteTextButton: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
  },
  deleteTextButtonText: {
    fontSize: 16,
    fontWeight: '600', // Inter-SemiBold
    color: '#E53E3E', // utility-error (red)
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
  },
}); 