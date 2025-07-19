import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { createContextLogger } from '@/lib/logger';
import { NotificationService } from '@/services/notificationService';
import { useAuth } from '@/context/AuthContext';
import DateTimePicker from '@react-native-community/datetimepicker';

// Create scoped logger for this screen
const screenLogger = createContextLogger('ReminderSetupScreen');

const ACCENT_PRIMARY = '#FFC300';
const COMPONENT_BG = '#1F2937';
const BORDER_COLOR = '#374151';
const TEXT_PRIMARY = '#F5F5F0';
const TEXT_SECONDARY = '#9CA3AF';
const TEXT_TERTIARY = '#6B7280';

/**
 * ReminderSetupScreen
 * Allows the user to pick a preferred reminder time slot and enables local push notifications.
 * Mimics the provided mock UI while adhering to project styling guidelines.
 */
export default function ReminderSetupScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [processing, setProcessing] = useState(false);

  // State for custom time picker
  const [time, setTime] = useState<Date>(() => {
    const d = new Date();
    d.setHours(8, 0, 0, 0); // default 8:00 AM
    return d;
  });
  const [showPicker, setShowPicker] = useState(false);

  /**
   * Requests permission and schedules the daily reminder.
   */
  const handleEnableMotivation = async () => {
    screenLogger.trackUserAction('enable_motivation_pressed', 'notifications', { hour: time.getHours(), minute: time.getMinutes() }, session?.user?.id);

    setProcessing(true);
    try {
      await NotificationService.scheduleDailyReminder(time.getHours(), time.getMinutes());
      Alert.alert('All set!', 'We\'ll remind you daily.');
      router.replace('/personalizing' as any);
    } catch (err) {
      screenLogger.error('Failed to enable notifications', { error: (err as Error).message });
      Alert.alert(
        'Permission Required',
        'Please enable notifications in your device settings to receive reminders.'
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleSetupLater = () => {
    screenLogger.trackUserAction('setup_later_pressed', 'notifications', undefined, session?.user?.id);
    router.replace('/personalizing' as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.innerContainer}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Your journaling routine is near</Text>
          <Text style={styles.headerSubtitle}>When would you like to receive your gentle reminder?</Text>
        </View>

        {/* Time Picker Bubble */}
        <TouchableOpacity style={styles.timeBubble} onPress={() => setShowPicker(true)}>
          <Text style={styles.timeText}>
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </TouchableOpacity>

        {showPicker && (
          <DateTimePicker
            value={time}
            mode="time"
            is24Hour={false}
            display="spinner"
            onChange={(event: any, selectedDate?: Date) => {
              if (event.type === 'set' && selectedDate) {
                setTime(selectedDate);
              }
              setShowPicker(false);
            }}
          />
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {/* Setup later */}
          <TouchableOpacity style={styles.laterButton} onPress={handleSetupLater} disabled={processing}>
            <Text style={styles.laterButtonText}>Set up later</Text>
          </TouchableOpacity>

          {/* Enable motivation */}
          <TouchableOpacity
            style={[styles.enableButton, processing && { backgroundColor: BORDER_COLOR }]}
            onPress={handleEnableMotivation}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator color="#121820" />
            ) : (
              <Text style={styles.enableButtonText}>Turn on motivation</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121820',
  },
  innerContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  headerContainer: {
    marginTop: 16,
  },
  headerTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 32,
    color: TEXT_PRIMARY,
    lineHeight: 38,
  },
  headerSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: TEXT_SECONDARY,
    marginTop: 12,
  },
  timeBubble: {
    alignSelf: 'center',
    marginTop: 60,
    marginBottom: 20,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: COMPONENT_BG,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  timeText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: TEXT_PRIMARY,
  },
  buttonContainer: {
    marginTop: 'auto',
    marginBottom: 40,
  },
  laterButton: {
    borderWidth: 1,
    borderColor: TEXT_PRIMARY,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  laterButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: TEXT_PRIMARY,
  },
  enableButton: {
    backgroundColor: '#F5F5F0',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  enableButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#121820',
  },
  optionColumn: { display: 'none' },
  optionLabel: { display: 'none' },
  optionsContainer: { display: 'none' },
}); 