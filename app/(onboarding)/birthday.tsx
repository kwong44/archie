import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { logger } from '../../lib/logger';
import { useAuth } from '../../context/AuthContext';
import { UserService } from '../../services/userService';
import { ArrowLeft } from 'lucide-react-native';

// Cake illustration component
const CakeIllustration = () => (
  <View style={styles.cakeContainer}>
    {/* Cake base */}
    <View style={styles.cakeBase} />
    
    {/* Cake layers with different colors */}
    <View style={[styles.cakeLayer, { backgroundColor: '#A855F7', bottom: 30 }]} />
    <View style={[styles.cakeLayer, { backgroundColor: '#F3F4F6', bottom: 50 }]} />
    <View style={[styles.cakeLayer, { backgroundColor: '#84CC16', bottom: 70 }]} />
    
    {/* Candles */}
    <View style={[styles.candle, { left: 45, bottom: 85, backgroundColor: '#F97316' }]} />
    <View style={[styles.candle, { left: 60, bottom: 85, backgroundColor: '#EF4444' }]} />
    <View style={[styles.candle, { left: 75, bottom: 85, backgroundColor: '#84CC16' }]} />
    
    {/* Flames */}
    <View style={[styles.flame, { left: 47, bottom: 95 }]} />
    <View style={[styles.flame, { left: 62, bottom: 95 }]} />
    <View style={[styles.flame, { left: 77, bottom: 95 }]} />
  </View>
);

/**
 * BirthdayScreen Component
 * This screen prompts the user to enter their birthday as part of the onboarding process.
 * It features a personalized greeting, cake illustration, and date picker interface.
 * The birthday is saved to the user_profiles table in the database.
 */
export default function BirthdayScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [userDisplayName, setUserDisplayName] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Date picker data
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

  /**
   * Fetch the user's display name when component mounts
   */
  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const displayName = await UserService.getUserDisplayName();
        setUserDisplayName(displayName);
        logger.info('Fetched user display name for birthday screen', { displayName });
      } catch (error) {
        logger.error('Failed to fetch user display name', { error });
        setUserDisplayName('friend'); // Fallback
      }
    };

    fetchUserName();
  }, []);

  /**
   * Handles the back navigation
   */
  const handleGoBack = () => {
    logger.info('User navigating back from birthday screen');
    router.back();
  };

  /**
   * Handles the continue button press
   * Validates the birthday input and saves it to the database
   */
  const handleContinue = async () => {
    // Validate that all date components are selected
    if (selectedMonth === null || selectedDay === null || selectedYear === null) {
      Alert.alert("Birthday Required", "Please select your complete birthday.");
      return;
    }

    // Validate date is realistic
    if (selectedYear > currentYear || selectedYear < currentYear - 120) {
      Alert.alert("Invalid Year", "Please select a valid birth year.");
      return;
    }

    // Create date object and validate it's a real date
    const birthday = new Date(selectedYear, selectedMonth, selectedDay);
    if (birthday.getMonth() !== selectedMonth || birthday.getDate() !== selectedDay) {
      Alert.alert("Invalid Date", "Please select a valid date.");
      return;
    }

    if (!session?.user) {
      Alert.alert("Error", "No user session found. Please restart the app.");
      logger.error('No user found on birthday screen');
      return;
    }

    setLoading(true);
    const userId = session.user.id;
    const birthdayString = birthday.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    
    logger.info("User proceeding from birthday screen.", { 
      userId, 
      birthday: birthdayString,
      month: selectedMonth,
      day: selectedDay,
      year: selectedYear
    });

    try {
      await UserService.updateUserBirthday(userId, birthdayString);
      logger.info("User birthday updated successfully.", { userId });
      // Navigate to the next step in onboarding (gender selection)
      router.replace('/(onboarding)/gender' as any);
    } catch (error) {
      logger.error('Failed to update user birthday', { userId, error });
      Alert.alert("Error", "Could not save your birthday. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <ArrowLeft color="#F5F5F0" size={24} />
        </TouchableOpacity>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar} />
          <Text style={styles.progressText}>2/5</Text>
          <TouchableOpacity onPress={() => router.replace('/(onboarding)/gender' as any)}>
            <Text style={styles.skipText}>skip</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.mainContent}>
        <Text style={styles.title}>
          hey {userDisplayName}, welcome in.{'\n'}
          when do we get to{'\n'}
          celebrate you?
        </Text>
        
        <CakeIllustration />

        {/* Date Picker Interface */}
        <View style={styles.datePickerContainer}>
          {/* Month Picker */}
          <View style={styles.pickerColumn}>
            <ScrollView 
              style={styles.picker}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.pickerContent}
            >
              {months.map((month, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.pickerItem,
                    selectedMonth === index && styles.selectedPickerItem
                  ]}
                  onPress={() => setSelectedMonth(index)}
                >
                  <Text style={[
                    styles.pickerItemText,
                    selectedMonth === index && styles.selectedPickerItemText
                  ]}>
                    {month}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Day Picker */}
          <View style={styles.pickerColumn}>
            <ScrollView 
              style={styles.picker}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.pickerContent}
            >
              {days.map((day) => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.pickerItem,
                    selectedDay === day && styles.selectedPickerItem
                  ]}
                  onPress={() => setSelectedDay(day)}
                >
                  <Text style={[
                    styles.pickerItemText,
                    selectedDay === day && styles.selectedPickerItemText
                  ]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Year Picker */}
          <View style={styles.pickerColumn}>
            <ScrollView 
              style={styles.picker}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.pickerContent}
            >
              {years.map((year) => (
                <TouchableOpacity
                  key={year}
                  style={[
                    styles.pickerItem,
                    selectedYear === year && styles.selectedPickerItem
                  ]}
                  onPress={() => setSelectedYear(year)}
                >
                  <Text style={[
                    styles.pickerItemText,
                    selectedYear === year && styles.selectedPickerItemText
                  ]}>
                    {year}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[
            styles.nextButton,
            (selectedMonth === null || selectedDay === null || selectedYear === null) && styles.disabledButton
          ]} 
          onPress={handleContinue} 
          disabled={loading || selectedMonth === null || selectedDay === null || selectedYear === null}
        >
          {loading ? (
            <ActivityIndicator color="#121820" />
          ) : (
            <Text style={styles.nextButtonText}>next</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121820',
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  progressContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  progressBar: {
    position: 'absolute',
    left: 20,
    height: 4,
    backgroundColor: '#A7F3D0',
    width: '40%', // 2/5 progress
    borderRadius: 2,
  },
  progressText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#F5F5F0',
    marginRight: 10,
  },
  skipText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#9CA3AF',
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 20,
  },
  title: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 28,
    color: '#F5F5F0',
    textAlign: 'center',
    marginBottom: 40,
    textTransform: 'lowercase',
    lineHeight: 34,
  },
  cakeContainer: {
    width: 120,
    height: 100,
    position: 'relative',
    marginBottom: 60,
  },
  cakeBase: {
    position: 'absolute',
    bottom: 0,
    left: 20,
    width: 80,
    height: 30,
    backgroundColor: '#8B4513',
    borderRadius: 4,
  },
  cakeLayer: {
    position: 'absolute',
    left: 25,
    width: 70,
    height: 20,
    borderRadius: 10,
  },
  candle: {
    position: 'absolute',
    width: 3,
    height: 15,
    borderRadius: 1.5,
  },
  flame: {
    position: 'absolute',
    width: 6,
    height: 8,
    backgroundColor: '#FFA500',
    borderRadius: 3,
  },
  datePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    height: 200,
    marginBottom: 40,
  },
  pickerColumn: {
    flex: 1,
    marginHorizontal: 5,
  },
  picker: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    maxHeight: 200,
  },
  pickerContent: {
    paddingVertical: 8,
  },
  pickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  selectedPickerItem: {
    backgroundColor: '#374151',
  },
  pickerItemText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#9CA3AF',
  },
  selectedPickerItemText: {
    color: '#F5F5F0',
    fontFamily: 'Inter-SemiBold',
  },
  footer: {
    paddingBottom: 20,
    alignItems: 'center',
  },
  nextButton: {
    backgroundColor: '#F5F5F0',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#374151',
  },
  nextButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#121820',
    textTransform: 'lowercase',
  },
}); 