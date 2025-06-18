import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

/**
 * Custom storage adapter using Expo's SecureStore
 * Provides secure, persistent storage for authentication tokens
 * Handles all async operations properly with error handling
 */
const ExpoSecureStoreAdapter = {
  /**
   * Retrieves an item from secure storage
   * @param key - Storage key to retrieve
   * @returns Promise resolving to the stored value or null
   */
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('Error getting item from SecureStore:', error);
      return null;
    }
  },
  
  /**
   * Stores an item in secure storage
   * @param key - Storage key
   * @param value - Value to store
   * @returns Promise resolving when storage is complete
   */
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('Error setting item in SecureStore:', error);
      throw error;
    }
  },
  
  /**
   * Removes an item from secure storage
   * @param key - Storage key to remove
   * @returns Promise resolving when removal is complete
   */
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('Error removing item from SecureStore:', error);
      // Don't throw error for removal failures to prevent auth issues
    }
  },
};

// Retrieve Supabase URL and anon key from environment variables
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey;

// Throw an error if the Supabase URL or anon key is missing
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and/or anon key are not defined in app.json. Please add them to the 'extra' field.");
}

/**
 * Supabase client instance configured with secure storage
 * Uses ExpoSecureStoreAdapter for token persistence
 * Handles authentication state management automatically
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
}); 