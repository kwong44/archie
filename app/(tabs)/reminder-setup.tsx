import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Switch, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { createContextLogger } from '@/lib/logger';
import { NotificationService, ReminderTimeSlot } from '@/services/notificationService';
import { Sun, Flower, Moon } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';

// Create scoped logger for this screen
const screenLogger = createContextLogger('ReminderSetupScreen');

const ACCENT_PRIMARY = '#FFC300';
const COMPONENT_BG = '#1F2937';
const BORDER_COLOR = '#374151';
const TEXT_PRIMARY = '#F5F5F0';
const TEXT_SECONDARY = '#9CA3AF';
const TEXT_TERTIARY = '#6B7280';

interface TimeOption {
  slot: ReminderTimeSlot;
  label: string;
  icon: React.FC<{ color: string; size: number }>;
  displayTime: string;
}

const TIME_OPTIONS: TimeOption[] = [
  { slot: 'morning', label: 'morning', icon: Sun, displayTime: '8:03 AM' },
  { slot: 'day', label: 'day', icon: Flower, displayTime: '3:41 PM' },
  { slot: 'evening', label: 'evening', icon: Moon, displayTime: '8:22 PM' },
];

/**
 * ReminderSetupScreen
 * Allows the user to pick a preferred reminder time slot and enables local push notifications.
 * Mimics the provided mock UI while adhering to project styling guidelines.
 */
export default function ReminderSetupScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [selectedSlot, setSelectedSlot] = useState<ReminderTimeSlot>('day');
  const [processing, setProcessing] = useState(false);

  /**
   * Handles toggle interaction – ensures only one switch is active at a time.
   */
  const handleToggle = (slot: ReminderTimeSlot) => {
    setSelectedSlot(slot);
  };

  /**
   * Requests permission and schedules the daily reminder.
   */
  const handleEnableMotivation = async () => {
    screenLogger.trackUserAction('enable_motivation_pressed', 'notifications', { slot: selectedSlot }, session?.user?.id);

    setProcessing(true);
    try {
      await NotificationService.scheduleDailyReminder(selectedSlot);
      Alert.alert('All set!', 'We\'ll remind you daily.');
      router.replace('/(tabs)');
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
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>nice! small steps lead to{"\n"}big results.</Text>
        <Text style={styles.headerSubtitle}>what time feels best for your me-time?</Text>
      </View>

      {/* Time Options */}
      <View style={styles.optionsContainer}>
        {TIME_OPTIONS.map((opt) => {
          const IconComp = opt.icon;
          const isSelected = selectedSlot === opt.slot;
          return (
            <View key={opt.slot} style={styles.optionColumn}>
              {/* Icon */}
              <IconComp color={ACCENT_PRIMARY} size={28} />
              {/* Label */}
              <Text style={styles.optionLabel}>{opt.label}</Text>
              {/* Time display */}
              <View style={styles.timeBubble}>
                <Text style={styles.timeText}>{opt.displayTime}</Text>
              </View>
              {/* Switch */}
              <Switch
                value={isSelected}
                onValueChange={() => handleToggle(opt.slot)}
                thumbColor={isSelected ? '#121820' : '#FFFFFF'}
                trackColor={{ true: ACCENT_PRIMARY, false: BORDER_COLOR }}
              />
            </View>
          );
        })}
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        {/* Setup later */}
        <TouchableOpacity style={styles.laterButton} onPress={handleSetupLater} disabled={processing}>
          <Text style={styles.laterButtonText}>set up later</Text>
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
            <Text style={styles.enableButtonText}>turn on motivation</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: 24,
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
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 60,
  },
  optionColumn: {
    alignItems: 'center',
    flex: 1,
  },
  optionLabel: {
    marginTop: 12,
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: ACCENT_PRIMARY,
    textTransform: 'lowercase',
  },
  timeBubble: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
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
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  laterButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: TEXT_PRIMARY,
    textTransform: 'lowercase',
  },
  enableButton: {
    backgroundColor: TEXT_SECONDARY,
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
  },
  enableButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#121820',
    textTransform: 'lowercase',
  },
}); 