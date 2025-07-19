import * as Notifications from 'expo-notifications';
// @ts-ignore - type declarations may not be present in bare version; Expo managed app will have types at runtime.
import AsyncStorage from '@react-native-async-storage/async-storage';
// Platform import removed – we no longer branch on platform in this module.
import { createContextLogger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';

/**
 * NotificationService
 * Handles permission requests and scheduling/canceling of daily reminder notifications.
 * Follows BaaS First principle by persisting minimal preference data locally.
 * If/when a Supabase table for notification preferences is added, this class can be easily extended.
 */
// Storage key to persist the scheduled notification identifier & slot
const REMINDER_STORAGE_KEY = 'archie_daily_reminder';

// Create a scoped logger for this service
const notificationLogger = createContextLogger('NotificationService');

// Configure default foreground behaviour once, the first time this module is imported
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export class NotificationService {
  /**
   * Requests user permission for notifications (if not already granted).
   * Returns true if the permission is granted, false otherwise.
   */
  static async requestPermission(): Promise<boolean> {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.status === 'granted') {
      notificationLogger.debug('Notification permission previously granted');
      return true;
    }

    const { status } = await Notifications.requestPermissionsAsync();
    const granted = status === 'granted';
    notificationLogger.info('Notification permission result', { granted });
    return granted;
  }

  /**
   * Cancels any previously-scheduled daily reminder and schedules a new one for the
   * provided time slot.
   */
  static async scheduleDailyReminder(hour: number, minute: number): Promise<void> {
    // Ensure we have permission first
    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      throw new Error('Notifications permission not granted');
    }

    // Cancel an existing reminder if one was stored
    await this.cancelExistingReminder();

    // Schedule the local notification to repeat daily at the desired time
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time for your me-time ✨',
        body: 'Open The Architect to transform your language and reality.',
      },
      trigger: {
        hour,
        minute,
        repeats: true,
      },
    });

    // Persist locally for cancellation
    await AsyncStorage.setItem(
      REMINDER_STORAGE_KEY,
      JSON.stringify({ identifier, hour, minute })
    );

    // Persist to Supabase for cross-device sync
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(sessionError.message);
      }

      if (!session?.user) {
        throw new Error('No active session');
      }

      const userId = session.user.id;

      // Upsert preference (unique per user)
      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert(
          {
            user_id: userId,
            reminder_slot: 'custom',
            hour,
            minute,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (error) {
        notificationLogger.warn('Failed to save notification preference to Supabase', {
          userId,
          error: error.message,
        });
      } else {
        notificationLogger.info('Notification preference saved to Supabase', { userId });
      }
    } catch (err) {
      notificationLogger.warn('Error persisting preference to Supabase', {
        error: (err as Error).message,
      });
    }

    notificationLogger.info('Daily reminder scheduled', { identifier, hour, minute });
  }

  /**
   * Reads AsyncStorage and cancels any previously scheduled reminder.
   * This is idempotent – it is safe to call even if nothing is scheduled.
   */
  static async cancelExistingReminder(): Promise<void> {
    const stored = await AsyncStorage.getItem(REMINDER_STORAGE_KEY);
    if (!stored) return;

    try {
      const { identifier } = JSON.parse(stored);
      if (identifier) {
        await Notifications.cancelScheduledNotificationAsync(identifier);
        notificationLogger.debug('Cancelled existing scheduled reminder', { identifier });
      }
    } catch (err) {
      notificationLogger.warn('Failed to cancel existing reminder (parse error)', {
        error: (err as Error).message,
      });
    } finally {
      await AsyncStorage.removeItem(REMINDER_STORAGE_KEY);
    }
  }

  /**
   * Retrieves the user\'s stored preference from Supabase (if any).
   */
  static async getUserPreference(): Promise<{ hour: number; minute: number } | null> {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) return null;

    const { data, error } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (error) {
      notificationLogger.warn('Failed to fetch user notification preference', { error: error.message });
      return null;
    }

    return { hour: data.hour, minute: data.minute };
  }
} 