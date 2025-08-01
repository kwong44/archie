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
const REMINDER_STORAGE_KEY_PREFIX = 'archie_daily_reminder_';

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
  static async scheduleDailyReminder(hour: number, minute: number, slot: string): Promise<void> {
    // Ensure we have permission first
    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      throw new Error('Notifications permission not granted');
    }

    const storageKey = `${REMINDER_STORAGE_KEY_PREFIX}${slot}`;

    // Cancel an existing reminder for this specific slot
    await this.cancelReminderForSlot(slot);

    // Schedule the daily notification using the DAILY trigger type
    // This is the correct way according to Expo documentation
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time for your me-time',
        body: 'Open Archie and take a moment for yourself.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        repeats: true,
      },
    });

    // Persist locally for cancellation
    await AsyncStorage.setItem(
      storageKey,
      JSON.stringify({ 
        identifier,
        hour, 
        minute, 
        slot,
        scheduledAt: new Date().toISOString()
      })
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

      /**
       * Map the UI slot to database slot format
       * The database accepts "morning", "day", "evening" but UI uses "night"
       */
      const dbSlot = slot === 'night' ? 'evening' : slot;
      notificationLogger.debug('Persisting notification preference', {
        userId,
        originalSlot: slot,
        dbSlot,
        hour,
        minute,
      });

      // Upsert the notification preference for this specific slot
      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert(
          {
            user_id: userId,
            reminder_slot: dbSlot,
            hour,
            minute,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,reminder_slot' } // Use composite key if available, otherwise will create new row
        );

      if (error) {
        notificationLogger.warn('Failed to save notification preference to Supabase', {
          userId,
          error: error.message,
        });
      } else {
        notificationLogger.info('Notification preference saved to Supabase', { userId, slot: dbSlot });
      }
    } catch (err) {
      notificationLogger.warn('Error persisting preference to Supabase', {
        error: (err as Error).message,
      });
    }

    notificationLogger.info('Daily reminder scheduled', { 
      identifier,
      hour, 
      minute, 
      slot,
      triggerType: 'DAILY'
    });
  }

  /**
   * Reads AsyncStorage and cancels any previously scheduled reminder.
   * This is idempotent – it is safe to call even if nothing is scheduled.
   */
  static async cancelExistingReminder(): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    const reminderKeys = keys.filter(key => key.startsWith(REMINDER_STORAGE_KEY_PREFIX));

    for (const key of reminderKeys) {
        const stored = await AsyncStorage.getItem(key);
        if (!stored) continue;

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
          await AsyncStorage.removeItem(key);
        }
    }
  }

  static async cancelReminderForSlot(slot: string): Promise<void> {
    const storageKey = `${REMINDER_STORAGE_KEY_PREFIX}${slot}`;
    const stored = await AsyncStorage.getItem(storageKey);
    if (!stored) return;

    try {
      const { identifier } = JSON.parse(stored);
      
      if (identifier) {
        await Notifications.cancelScheduledNotificationAsync(identifier);
        notificationLogger.debug(`Cancelled reminder for slot: ${slot}`, { identifier });
      }
    } catch (err) {
      notificationLogger.warn(`Failed to cancel reminder for slot: ${slot}`, {
        error: (err as Error).message,
      });
    } finally {
      await AsyncStorage.removeItem(storageKey);
    }
  }

  /**
   * Retrieves all of the user's stored notification preferences from Supabase.
   */
  static async getUserPreferences(): Promise<Array<{ slot: string; hour: number; minute: number }>> {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) return [];

    const { data, error } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', session.user.id);

    if (error) {
      notificationLogger.warn('Failed to fetch user notification preferences', { error: error.message });
      return [];
    }

    // Map database slots back to UI slots and return all preferences
    return data.map(pref => ({
      slot: pref.reminder_slot === 'evening' ? 'night' : pref.reminder_slot,
      hour: pref.hour,
      minute: pref.minute,
    }));
  }

  /**
   * Retrieves the user's stored preference from Supabase (if any).
   * @deprecated Use getUserPreferences() instead for multiple slot support
   */
  static async getUserPreference(): Promise<{ hour: number; minute: number } | null> {
    const preferences = await this.getUserPreferences();
    if (preferences.length === 0) return null;
    
    // Return the first preference for backward compatibility
    const firstPref = preferences[0];
    return { hour: firstPref.hour, minute: firstPref.minute };
  }

  /**
   * Gets all currently scheduled notifications for debugging purposes.
   * This is useful for verifying that notifications are scheduled correctly.
   */
  static async getScheduledNotifications(): Promise<any[]> {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      notificationLogger.debug('Retrieved scheduled notifications', { 
        count: scheduledNotifications.length 
      });
      return scheduledNotifications;
    } catch (error) {
      notificationLogger.error('Failed to get scheduled notifications', { error });
      return [];
    }
  }

  /**
   * Schedules a test notification for debugging purposes.
   * This will fire in 5 seconds to verify notification functionality.
   */
  static async scheduleTestNotification(): Promise<string> {
    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      throw new Error('Notifications permission not granted');
    }

    const testTime = new Date(Date.now() + 5000); // 5 seconds from now
    
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Test Notification',
        body: 'This is a test notification from Archie',
      },
      trigger: {
        date: testTime,
        repeats: false,
      },
    });

    notificationLogger.info('Test notification scheduled', { 
      identifier, 
      scheduledFor: testTime.toISOString() 
    });
    
    return identifier;
  }

  /**
   * Removes a specific notification preference for a slot.
   * This cancels the notification and removes it from the database.
   */
  static async removeNotificationPreference(slot: string): Promise<void> {
    const storageKey = `${REMINDER_STORAGE_KEY_PREFIX}${slot}`;

    // Cancel the local notification for this slot
    await this.cancelReminderForSlot(slot);

    // Remove from Supabase
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        notificationLogger.warn('No active session for removing preference');
        return;
      }

      const userId = session.user.id;
      const dbSlot = slot === 'night' ? 'evening' : slot;

      const { error } = await supabase
        .from('user_notification_preferences')
        .delete()
        .eq('user_id', userId)
        .eq('reminder_slot', dbSlot);

      if (error) {
        notificationLogger.warn('Failed to remove notification preference from Supabase', {
          userId,
          slot: dbSlot,
          error: error.message,
        });
      } else {
        notificationLogger.info('Notification preference removed from Supabase', { 
          userId, 
          slot: dbSlot 
        });
      }
    } catch (err) {
      notificationLogger.warn('Error removing preference from Supabase', {
        error: (err as Error).message,
      });
    }
  }

  /**
   * Debug method to check the current state of notification preferences in the database.
   * This helps troubleshoot issues with preference fetching.
   */
  static async debugUserPreferences(): Promise<void> {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        notificationLogger.warn('No active session for debug', { sessionError });
        return;
      }

      const userId = session.user.id;
      notificationLogger.info('Debugging user preferences', { userId });

      // Get all preferences using the new method
      const preferences = await this.getUserPreferences();
      notificationLogger.info('User notification preferences found', {
        userId,
        preferences,
        count: preferences.length
      });

      // Also check what's currently scheduled
      const scheduledNotifications = await this.getScheduledNotifications();
      notificationLogger.info('Currently scheduled notifications', {
        userId,
        scheduledCount: scheduledNotifications.length,
        scheduledNotifications: scheduledNotifications.map(n => ({
          identifier: n.identifier,
          trigger: n.trigger,
          content: n.content
        }))
      });

      // Get next trigger dates for all scheduled notifications
      for (const notification of scheduledNotifications) {
        try {
          const nextTriggerDate = await Notifications.getNextTriggerDateAsync(notification.identifier);
          notificationLogger.info('Next trigger date for notification', {
            identifier: notification.identifier,
            nextTriggerDate: nextTriggerDate?.toISOString()
          });
        } catch (error) {
          notificationLogger.warn('Failed to get next trigger date', {
            identifier: notification.identifier,
            error: (error as Error).message
          });
        }
      }

    } catch (error) {
      notificationLogger.error('Error in debugUserPreferences', { error: (error as Error).message });
    }
  }
} 