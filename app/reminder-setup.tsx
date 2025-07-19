import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator, Alert, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { createContextLogger } from '@/lib/logger';
import { NotificationService } from '@/services/notificationService';
import { useAuth } from '@/context/AuthContext';
import { TimePickerModal } from '@/components/TimePickerModal';
import { Sun, Cloud, Moon } from 'lucide-react-native';

// Create scoped logger for this screen
const screenLogger = createContextLogger('ReminderSetupScreen');

const ACCENT_PRIMARY = '#FFC300';
const COMPONENT_BG = '#1F2937';
const BORDER_COLOR = '#374151';
const TEXT_PRIMARY = '#F5F5F0';
const TEXT_SECONDARY = '#9CA3AF';
const TEXT_TERTIARY = '#6B7280';
const PRIMARY_BACKGROUND = '#121820';

type ReminderSlot = 'morning' | 'day' | 'night';
type Reminder = {
  enabled: boolean;
  hour: number;
  minute: number;
};

/**
 * ReminderSetupScreen
 * Allows the user to pick a preferred reminder time using a custom-built time picker
 * and enables local push notifications.
 */
export default function ReminderSetupScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [processing, setProcessing] = useState(false);

  const [reminders, setReminders] = useState<Record<ReminderSlot, Reminder>>({
    morning: { enabled: false, hour: 8, minute: 0 },
    day: { enabled: false, hour: 15, minute: 0 },
    night: { enabled: false, hour: 21, minute: 0 },
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [activeSlot, setActiveSlot] = useState<ReminderSlot | null>(null);

  const openTimePicker = (slot: ReminderSlot) => {
    setActiveSlot(slot);
    setModalVisible(true);
  };

  const handleTimeSave = (time: { hour: number; minute: number }) => {
    if (activeSlot) {
      setReminders(prev => ({
        ...prev,
        [activeSlot]: { ...time, enabled: true },
      }));
    }
  };

  const toggleSwitch = (slot: ReminderSlot) => {
    setReminders(prev => ({
      ...prev,
      [slot]: { ...prev[slot], enabled: !prev[slot].enabled },
    }));
  };

  const formatTime = (hour: number, minute: number) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h = hour % 12 === 0 ? 12 : hour % 12;
    const m = minute.toString().padStart(2, '0');
    return `${h}:${m} ${ampm}`;
  };

  const handleDone = async () => {
    setProcessing(true);
    const enabledReminders = Object.entries(reminders).filter(([, r]) => r.enabled);

    if (enabledReminders.length === 0) {
      router.replace('/personalizing' as any);
      return;
    }

    try {
      await NotificationService.cancelExistingReminder(); // Clear old reminders first
      for (const [slot, reminder] of enabledReminders) {
        await NotificationService.scheduleDailyReminder(reminder.hour, reminder.minute, slot);
        screenLogger.info(`Scheduled ${slot} reminder`, { ...reminder });
      }
      Alert.alert('Reminders Set!', 'Your preferences have been saved.');
      router.replace('/personalizing' as any);
    } catch (err) {
      screenLogger.error('Failed to set reminders', { error: (err as Error).message });
      Alert.alert('Error', 'Could not save your reminder settings.');
    } finally {
      setProcessing(false);
    }
  };

  const renderReminderCard = (slot: ReminderSlot, icon: React.ReactNode, label: string) => {
    const reminder = reminders[slot];
    return (
      <View style={styles.card}>
        <View style={styles.cardLeft}>
          {icon}
          <Text style={styles.cardLabel}>{label}</Text>
        </View>
        <View style={styles.cardRight}>
          <TouchableOpacity onPress={() => openTimePicker(slot)}>
            <Text style={styles.timeText}>{formatTime(reminder.hour, reminder.minute)}</Text>
          </TouchableOpacity>
          <Switch
            trackColor={{ false: BORDER_COLOR, true: ACCENT_PRIMARY }}
            thumbColor={reminder.enabled ? PRIMARY_BACKGROUND : TEXT_SECONDARY}
            onValueChange={() => toggleSwitch(slot)}
            value={reminder.enabled}
          />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.innerContainer}>
        <View>
          <Text style={styles.headerTitle}>Daily Reminders</Text>
          <Text style={styles.headerSubtitle}>Choose when you'd like a gentle nudge.</Text>
        </View>

        <View style={styles.cardsContainer}>
          {renderReminderCard('morning', <Sun color={TEXT_SECONDARY} size={24} />, 'Morning')}
          {renderReminderCard('day', <Cloud color={TEXT_SECONDARY} size={24} />, 'Day')}
          {renderReminderCard('night', <Moon color={TEXT_SECONDARY} size={24} />, 'Night')}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.doneButton} onPress={handleDone} disabled={processing}>
            {processing ? <ActivityIndicator color={PRIMARY_BACKGROUND} /> : <Text style={styles.doneButtonText}>Done</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {activeSlot && (
        <TimePickerModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSave={handleTimeSave}
          initialHour={reminders[activeSlot].hour}
          initialMinute={reminders[activeSlot].minute}
        />
      )}
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
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 32,
    color: TEXT_PRIMARY,
    textAlign: 'center',
    marginTop: 16,
  },
  headerSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 40,
  },
  cardsContainer: {
    gap: 16,
  },
  card: {
    backgroundColor: COMPONENT_BG,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  cardLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: TEXT_PRIMARY,
  },
  timeText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: ACCENT_PRIMARY,
  },
  buttonContainer: {
    marginBottom: 40,
  },
  doneButton: {
    backgroundColor: ACCENT_PRIMARY,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: PRIMARY_BACKGROUND,
  },
}); 