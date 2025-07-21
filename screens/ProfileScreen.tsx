import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { X as XIcon, Trash2, Save } from 'lucide-react-native';
import { createContextLogger } from '@/lib/logger';
import { useAuth } from '@/context/AuthContext';
import { UserService, UserProfile } from '@/services/userService';
import { supabase } from '@/lib/supabase';

const log = createContextLogger('ProfileScreen');

const TEXT_PRIMARY = '#F5F5F0';
const TEXT_SECONDARY = '#9CA3AF';
const PRIMARY_BACKGROUND = '#121820';
const COMPONENT_BACKGROUND = '#1F2937';
const BORDER_COLOR = '#374151';
const ACCENT_PRIMARY = '#FFC300';
const UTILITY_ERROR = '#E53E3E';

export default function ProfileScreen() {
  const router = useRouter();
  const { session, clearSession } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!session) {
        log.warn('No session found, cannot fetch profile.');
        setIsLoading(false);
        return;
      }
      try {
        log.info('Fetching user profile.');
        const userProfile = await UserService.getCurrentUserProfile();
        setProfile(userProfile);
        setFullName(userProfile?.full_name || '');
        log.info('User profile fetched successfully.', { hasProfile: !!userProfile });
      } catch (error) {
        log.error('Failed to fetch user profile', { error });
        Alert.alert('Error', 'Could not fetch your profile. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [session]);

  const handleClose = () => {
    log.info('ProfileScreen close button pressed');
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    if (fullName.trim() === (profile.full_name || '')) {
      log.info('No changes to save.');
      return;
    }

    setIsSaving(true);
    log.info('Saving profile updates.', { userId: profile.user_id });
    try {
      const updatedProfile = await UserService.updateUserProfile({ full_name: fullName.trim() });
      setProfile(updatedProfile);
      setFullName(updatedProfile.full_name || '');
      Alert.alert('Success', 'Your profile has been updated.');
      log.info('Profile updated successfully.');
    } catch (error) {
      log.error('Failed to save profile', { error });
      Alert.alert('Error', 'Could not save your profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!session?.user?.id) return;
    setIsDeleting(true);
    log.warn('Attempting to delete account.', { userId: session.user.id });

    try {
      // This would ideally be a call to a Supabase Edge Function
      // that handles deleting all user-related data before deleting the auth user.
      // For now, we call a placeholder function.
      const { error } = await supabase.rpc('delete_user_account');

      if (error) {
        throw error;
      }
      
      log.info('User account deleted successfully, signing out.');
      Alert.alert('Account Deleted', 'Your account and all associated data have been permanently deleted.');
      // The onAuthStateChange listener in AuthContext will handle routing.
      await clearSession();

    } catch (error) {
      log.error('Failed to delete account', { error });
      Alert.alert('Error', 'Could not delete your account. Please contact support.');
      setIsDeleting(false);
    }
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This is permanent. Are you sure you want to delete your account and all of your data?',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => log.info('Account deletion cancelled.') },
        { text: 'Delete', style: 'destructive', onPress: handleDeleteAccount },
      ]
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return <ActivityIndicator color={ACCENT_PRIMARY} size="large" />;
    }

    if (!profile) {
      return <Text style={styles.placeholder}>Could not load profile.</Text>;
    }

    return (
      <>
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your full name"
              placeholderTextColor={TEXT_SECONDARY}
              autoCapitalize="words"
              autoComplete="name"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={profile.email || ''}
              editable={false}
            />
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator color={PRIMARY_BACKGROUND} />
            ) : (
              <>
                <Save color={PRIMARY_BACKGROUND} size={20} />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={confirmDeleteAccount}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator color={UTILITY_ERROR} />
            ) : (
              <>
                <Trash2 color={UTILITY_ERROR} size={20} />
                <Text style={styles.deleteButtonText}>Delete Account</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </>
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
            accessibilityLabel="Close profile"
            accessibilityRole="button"
          >
            <XIcon color="#9CA3AF" size={28} />
          </TouchableOpacity>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>Manage your personal information.</Text>
        </View>

        <View style={styles.content}>
          {renderContent()}
        </View>

      </View>
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
    position: 'relative',
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
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  placeholder: {
      color: TEXT_SECONDARY,
      fontFamily: 'Inter-Regular',
      fontSize: 16,
      textAlign: 'center',
      marginTop: 40,
  },
  form: {
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    color: TEXT_SECONDARY,
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    paddingLeft: 4,
  },
  input: {
    backgroundColor: COMPONENT_BACKGROUND,
    borderColor: BORDER_COLOR,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    color: TEXT_PRIMARY,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
  },
  disabledInput: {
    backgroundColor: '#374151',
    color: '#9CA3AF',
  },
  actions: {
    gap: 16,
    paddingBottom: 20,
  },
  saveButton: {
    backgroundColor: '#F5F5F0',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  saveButtonText: {
    color: PRIMARY_BACKGROUND,
    fontFamily: 'Inter-Bold',
    fontSize: 16,
  },
  deleteButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  deleteButtonText: {
    color: UTILITY_ERROR,
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  }
}); 