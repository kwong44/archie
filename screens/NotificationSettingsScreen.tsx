import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Switch, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { NotificationService } from '@/services/notificationService';
import { createContextLogger } from '@/lib/logger';
import { Sun, Cloud, Moon, X as XIcon } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { TimePickerModal } from '@/components/TimePickerModal';

const log = createContextLogger('NotificationSettings');

const ACCENT_PRIMARY = '#FFC300';
const COMPONENT_BG = '#1F2937';
const BORDER_COLOR = '#374151';
const TEXT_PRIMARY = '#F5F5F0';
const TEXT_SECONDARY = '#9CA3AF';
const TEXT_TERTIARY = '#6B7280';
const PRIMARY_BACKGROUND = '#121820';

type ReminderSlot = 'morning' | 'day' | 'night';

interface TimeOptionDef {
  slot: ReminderSlot;
  label: string;
  icon: React.FC<{ color: string; size: number }>;
  display: string;
  hour: number;
  minute: number;
}

const OPTIONS: TimeOptionDef[] = [
  { slot: 'morning', label: 'Morning', icon: Sun, display: '8:00 AM', hour: 8, minute: 0 },
  { slot: 'day', label: 'Day', icon: Cloud, display: '3:00 PM', hour: 15, minute: 0 },
  { slot: 'night', label: 'Night', icon: Moon, display: '9:00 PM', hour: 21, minute: 0 },
];

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [selected, setSelected] = useState<ReminderSlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeSlot, setActiveSlot] = useState<ReminderSlot | null>(null);

  const [reminders, setReminders] = useState<Record<ReminderSlot, { hour: number; minute: number }>>({
    morning: { hour: 8, minute: 0 },
    day: { hour: 15, minute: 0 },
    night: { hour: 21, minute: 0 },
  });

  useEffect(() => {
    const loadPref = async () => {
      try {
        console.log('Loading notification preferences...');
        const pref = await NotificationService.getUserPreference();
        console.log('Retrieved preference:', pref);
        
        if (pref) {
          // Update the reminders state with the actual stored values
          setReminders(prev => ({
            ...prev,
            morning: { hour: pref.hour, minute: pref.minute },
            day: { hour: pref.hour, minute: pref.minute },
            night: { hour: pref.hour, minute: pref.minute },
          }));
          
          // Try to match stored hour/minute to one of our predefined slots
          const match = OPTIONS.find(o => o.hour === pref.hour && o.minute === pref.minute);
          console.log('Found match:', match);
          
          if (match) {
            setSelected(match.slot);
          } else {
            // If no exact match, default to morning but keep the stored time
            setSelected('morning');
          }
        } else {
          console.log('No preference found, using defaults');
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      } finally {
        setLoading(false);
      }
    };
    loadPref();
  }, []);

  const formatTime = (hour: number, minute: number) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h = hour % 12 === 0 ? 12 : hour % 12;
    const m = minute.toString().padStart(2, '0');
    return `${h}:${m} ${ampm}`;
  };

  const handleSave = async () => {
    if (!selected) return;
    setProcessing(true);
    try {
      const timeToSave = reminders[selected];
      if (!timeToSave) throw new Error('Invalid selection');
      await NotificationService.scheduleDailyReminder(timeToSave.hour, timeToSave.minute, selected);
      Alert.alert('Updated', 'Reminder time saved.');
      router.back();
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setProcessing(false);
    }
  };

  const handleDisable = async () => {
    setProcessing(true);
    try {
      await NotificationService.cancelExistingReminder();
      Alert.alert('Disabled', 'Reminders disabled.');
      setSelected(null);
      // remove pref in supabase handled in cancel func? Not yet, but ok.
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setProcessing(false);
    }
  };

  const toggle = (slot: ReminderSlot) => setSelected(slot);

  const openTimePicker = (slot: ReminderSlot) => {
    setActiveSlot(slot);
    setModalVisible(true);
  };

  const handleTimeSave = (time: { hour: number; minute: number }) => {
    if (activeSlot) {
      setReminders(prev => ({
        ...prev,
        [activeSlot]: time,
      }));
      setSelected(activeSlot);
      setModalVisible(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}><ActivityIndicator color={ACCENT_PRIMARY} /></SafeAreaView>
    );
  }

  const handleClose = () => {
    log.info('NotificationSettings close button pressed');
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const renderCard = (option: TimeOptionDef) => {
    const Icon = option.icon;
    const active = selected === option.slot;
    const displayTime = formatTime(reminders[option.slot].hour, reminders[option.slot].minute);

    return (
      <View key={option.slot} style={styles.card}>
        <View style={styles.cardLeft}>
          <Icon color={TEXT_SECONDARY} size={24} />
          <Text style={styles.cardLabel}>{option.label}</Text>
        </View>
        <View style={styles.cardRight}>
          <TouchableOpacity onPress={() => openTimePicker(option.slot)}>
            <Text style={styles.timeText}>{displayTime}</Text>
          </TouchableOpacity>
          <Switch
            trackColor={{ false: BORDER_COLOR, true: ACCENT_PRIMARY }}
            thumbColor={active ? PRIMARY_BACKGROUND : TEXT_SECONDARY}
            onValueChange={() => toggle(option.slot)}
            value={active}
          />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.innerContainer}>
        <View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Close notification settings"
            accessibilityRole="button"
          >
            <XIcon color="#9CA3AF" size={28} />
          </TouchableOpacity>
          <Text style={styles.title}>Reminders</Text>
          <Text style={styles.subtitle}>Choose when you'd like a gentle nudge.</Text>
        </View>

        <View style={styles.cardsContainer}>
          {OPTIONS.map(renderCard)}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={processing || !selected}>
            {processing ? <ActivityIndicator color={PRIMARY_BACKGROUND} /> : <Text style={styles.saveTxt}>Save</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.disableBtn} onPress={handleDisable} disabled={processing}>
            <Text style={styles.disableTxt}>Disable reminders</Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeSlot && (
        <TimePickerModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSave={handleTimeSave}
          initialHour={activeSlot ? reminders[activeSlot].hour : 8}
          initialMinute={activeSlot ? reminders[activeSlot].minute : 0}
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
    position: 'relative',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
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
  saveBtn: {
    marginTop: 40,
    backgroundColor: '#F5F5F0',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  saveTxt: {
    color: '#121820',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  disableBtn: {
    marginTop: 20,
    alignItems: 'center',
  },
  disableTxt: {
    color: TEXT_TERTIARY,
    fontFamily: 'Inter-Regular',
  },
  buttonContainer: {
    marginTop: 'auto',
    marginBottom: 40,
  },
}); 