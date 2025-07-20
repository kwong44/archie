import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { createContextLogger } from '@/lib/logger';

const screenLogger = createContextLogger('TimePickerModal');

const ACCENT_PRIMARY = '#FFC300';
const COMPONENT_BG = '#121820';
const MODAL_OVERLAY_BG = 'rgba(0,0,0,0.7)';
const TEXT_PRIMARY = '#F5F5F0';
const TEXT_SECONDARY = '#9CA3AF';
const TEXT_TERTIARY = '#6B7280';

export interface TimePickerProps {
  visible: boolean;
  onClose: () => void;
  onSave: (time: { hour: number; minute: number }) => void;
  initialHour?: number;
  initialMinute?: number;
}

export const TimePickerModal: React.FC<TimePickerProps> = ({
  visible,
  onClose,
  onSave,
  initialHour = 8,
  initialMinute = 0,
}) => {
  const [hour, setHour] = useState(initialHour % 12 === 0 ? 12 : initialHour % 12);
  const [minute, setMinute] = useState(initialMinute);
  const [period, setPeriod] = useState<'AM' | 'PM'>(initialHour >= 12 ? 'PM' : 'AM');

  const timePickerData = useMemo(() => {
    return {
      hours: Array.from({ length: 12 }, (_, i) => i + 1),
      minutes: Array.from({ length: 60 }, (_, i) => i),
      periods: ['AM', 'PM'],
    };
  }, []);

  const handleSave = () => {
    let finalHour = hour;
    if (period === 'PM' && hour !== 12) {
      finalHour += 12;
    }
    if (period === 'AM' && hour === 12) {
      finalHour = 0; // Midnight case
    }
    onSave({ hour: finalHour, minute });
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.modalContainer} activeOpacity={1} onPressOut={onClose}>
        <SafeAreaView style={styles.modalContent} onStartShouldSetResponder={() => true}>
          <Text style={styles.headerTitle}>Select a Time</Text>
          <View style={styles.timePickerContainer}>
            {/* Hour Column */}
            <ScrollView
              style={styles.pickerColumn}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.pickerContent}
            >
              {timePickerData.hours.map((h) => (
                <TouchableOpacity key={h} onPress={() => setHour(h)}>
                  <Text style={[styles.pickerItem, h === hour && styles.selectedPickerItem]}>{h}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Minute Column */}
            <ScrollView
              style={styles.pickerColumn}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.pickerContent}
            >
              {timePickerData.minutes.map((m) => (
                <TouchableOpacity key={m} onPress={() => setMinute(m)}>
                  <Text style={[styles.pickerItem, m === minute && styles.selectedPickerItem]}>
                    {m.toString().padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Period Column */}
            <ScrollView
              style={styles.pickerColumn}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.pickerContent}
            >
              {timePickerData.periods.map((p) => (
                <TouchableOpacity key={p} onPress={() => setPeriod(p as 'AM' | 'PM')}>
                  <Text style={[styles.pickerItem, p === period && styles.selectedPickerItem]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.laterButton} onPress={onClose}>
              <Text style={styles.laterButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.enableButton} onPress={handleSave}>
              <Text style={styles.enableButtonText}>Save Time</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: MODAL_OVERLAY_BG,
      },
      modalContent: {
        backgroundColor: COMPONENT_BG,
        borderRadius: 20,
        padding: 20,
        marginBottom: 10,
        height: '50%',
      },
      headerTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 24,
        color: TEXT_PRIMARY,
        textAlign: 'center',
        marginTop: 20,
        marginBottom: 20,
      },
      timePickerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        height: 150,
      },
      pickerColumn: {
        flex: 1,
        height: '100%',
      },
      pickerContent: {
        alignItems: 'center',
      },
      pickerItem: {
        fontFamily: 'Inter-Regular',
        fontSize: 20,
        color: TEXT_TERTIARY,
        paddingVertical: 8,
      },
      selectedPickerItem: {
        fontFamily: 'Inter-Bold',
        color: TEXT_PRIMARY,
        fontSize: 28,
      },
      buttonContainer: {
        marginTop: 'auto',
        paddingBottom: 20,
        marginHorizontal: 20,
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
        backgroundColor: ACCENT_PRIMARY,
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
      },
      enableButtonText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 16,
        color: '#121820',
      },
}); 