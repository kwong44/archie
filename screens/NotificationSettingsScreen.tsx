import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Switch, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { NotificationService, ReminderTimeSlot } from '@/services/notificationService';
import { createContextLogger } from '@/lib/logger';
import { Sun, Flower, Moon } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';

const log = createContextLogger('NotificationSettings');

const ACCENT_PRIMARY = '#FFC300';
const COMPONENT_BG = '#1F2937';
const BORDER_COLOR = '#374151';
const TEXT_PRIMARY = '#F5F5F0';
const TEXT_SECONDARY = '#9CA3AF';

interface TimeOptionDef {
  slot: ReminderTimeSlot;
  label: string;
  icon: React.FC<{ color: string; size: number }>;
  display: string;
}
const OPTIONS: TimeOptionDef[] = [
  { slot: 'morning', label: 'morning', icon: Sun, display: '8:03 AM' },
  { slot: 'day', label: 'day', icon: Flower, display: '3:41 PM' },
  { slot: 'evening', label: 'evening', icon: Moon, display: '8:22 PM' },
];

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [selected, setSelected] = useState<ReminderTimeSlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const loadPref = async () => {
      const pref = await NotificationService.getUserPreference();
      if (pref) setSelected(pref.slot);
      setLoading(false);
    };
    loadPref();
  }, []);

  const handleSave = async () => {
    if (!selected) return;
    setProcessing(true);
    try {
      await NotificationService.scheduleDailyReminder(selected);
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

  const toggle = (slot: ReminderTimeSlot) => setSelected(slot);

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}><ActivityIndicator color={ACCENT_PRIMARY} /></SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Notification settings</Text>
      <Text style={styles.subtitle}>Choose when to receive your daily motivation</Text>
      <View style={styles.row}>
        {OPTIONS.map(o => {
          const Icon = o.icon;
          const active = selected === o.slot;
          return (
            <View key={o.slot} style={styles.col}>
              <Icon color={ACCENT_PRIMARY} size={24} />
              <Text style={styles.label}>{o.label}</Text>
              <View style={styles.bubble}><Text style={styles.time}>{o.display}</Text></View>
              <Switch
                value={active}
                onValueChange={() => toggle(o.slot)}
                thumbColor={active ? '#121820' : '#FFFFFF'}
                trackColor={{ true: ACCENT_PRIMARY, false: BORDER_COLOR }}
              />
            </View>
          );
        })}
      </View>
      <View style={{ marginTop: 'auto' }}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={processing || !selected}>
          {processing ? <ActivityIndicator color="#121820" /> : <Text style={styles.saveTxt}>Save</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.disableBtn} onPress={handleDisable} disabled={processing}>
          <Text style={styles.disableTxt}>Disable reminders</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 24 },
  centered: { flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'#000' },
  title: { color: TEXT_PRIMARY, fontFamily:'Inter-Bold', fontSize:28 },
  subtitle: { color: TEXT_SECONDARY, marginTop:8, fontFamily:'Inter-Regular', fontSize:16 },
  row: { flexDirection:'row', justifyContent:'space-between', marginTop:48 },
  col: { alignItems:'center', flex:1 },
  label: { marginTop:8, color:ACCENT_PRIMARY, fontFamily:'Inter-SemiBold', textTransform:'lowercase' },
  bubble: { marginTop:16, backgroundColor:COMPONENT_BG, borderRadius:24, borderWidth:1, borderColor:BORDER_COLOR, paddingVertical:10, paddingHorizontal:14 },
  time: { color: TEXT_PRIMARY, fontFamily:'Inter-Regular', fontSize:15 },
  saveBtn: { marginTop:40, backgroundColor:TEXT_SECONDARY, paddingVertical:16, borderRadius:50, alignItems:'center' },
  saveTxt: { color:'#121820', fontFamily:'Inter-SemiBold', fontSize:16 },
  disableBtn: { marginTop:20, alignItems:'center' },
  disableTxt: { color:TEXT_TERTIARY, fontFamily:'Inter-Regular' },
}); 