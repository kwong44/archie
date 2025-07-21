// ---------------------------------------------------------------------------
// GuideScreen: Settings & Support UI (with colocated styles)
// Styles are now colocated in this file for maintainability and to keep the
// component self-contained. (Rule: No-Massive-Files, Modular-Architecture)
// ---------------------------------------------------------------------------
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  User,
  Bell,
  HelpCircle,
  Shield,
  Heart,
  ChevronRight,
  Sparkles,
  MessageCircle,
  LogOut,
  X as XIcon,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { SubscriptionService } from '@/services/subscriptionService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface AppInfoData {
  totalSessions: number;
  totalTransformations: number;
  memberSince: string;
  userEmail: string;
}

interface SettingsItem {
  icon: React.ComponentType<any>;
  label: string;
  description: string;
  isSignOut?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}

interface SettingsSection {
  title: string;
  items: SettingsItem[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const GuideScreen: React.FC = () => {
  const { session } = useAuth();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [appInfo, setAppInfo] = useState<AppInfoData | null>(null);
  const [loadingAppInfo, setLoadingAppInfo] = useState(true);
  const [hasPremium, setHasPremium] = useState(false);
  const [checkingPremium, setCheckingPremium] = useState(true);

  // -----------------------------------------------------------------------
  // Data Fetching
  // -----------------------------------------------------------------------
  useEffect(() => {
    const fetchAppInfo = async () => {
      if (!session?.user?.id) {
        logger.warn('No authenticated user found for app info');
        setLoadingAppInfo(false);
        return;
      }

      try {
        logger.info('Fetching app info data for user', { userId: session.user.id });

        const [
          { data: sessions },
          { data: transformations },
          { data: userProfile },
        ] = await Promise.all([
          supabase.from('journal_sessions').select('id').eq('user_id', session.user.id),
          supabase.from('transformation_usage').select('id').eq('user_id', session.user.id),
          supabase.from('user_profiles').select('created_at').eq('user_id', session.user.id).single(),
        ]);

        const memberSinceDate = userProfile?.created_at
          ? new Date(userProfile.created_at)
          : new Date(session.user.created_at || Date.now());

        const memberSince = memberSinceDate.toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        });

        setAppInfo({
          totalSessions: sessions?.length || 0,
          totalTransformations: transformations?.length || 0,
          memberSince,
          userEmail: session.user.email || 'Unknown',
        });
      } catch (error) {
        logger.error('Error fetching app info data', { error });
      } finally {
        setLoadingAppInfo(false);
      }
    };

    fetchAppInfo();
  }, [session?.user?.id]);

  useEffect(() => {
    const checkPremium = async () => {
      if (!session?.user?.id) return;
      try {
        await SubscriptionService.setUserID(session.user.id);
        setHasPremium(await SubscriptionService.hasPremiumAccess());
      } catch (error) {
        logger.error('Failed to check premium status', { error });
      } finally {
        setCheckingPremium(false);
      }
    };

    checkPremium();
  }, [session?.user?.id]);

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------
  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setIsSigningOut(true);
          try {
            await supabase.auth.signOut();
          } catch (error) {
            logger.error('Error during sign-out', { error });
          } finally {
            setIsSigningOut(false);
          }
        },
      },
    ]);
  };

  /**
   * Handles closing the Guide screen. If possible, navigates back, otherwise goes to main tab.
   */
  const handleClose = () => {
    logger.info('GuideScreen close button pressed');
    // Try to go back, otherwise go to root
    if (router.canGoBack?.()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  // Personal settings – dynamically include subscription management when premium is active
  const personalItems: SettingsItem[] = [
    { icon: User, label: 'Profile', description: 'Manage your info', onPress: () => router.push('/profile' as any) },
    { icon: Bell, label: 'Notifications', description: 'Customize reminders', onPress: () => router.push('/notification-settings' as any) },
  ];

  // Add "Change Subscription" button only for premium users
  if (hasPremium) {
    personalItems.push({
      icon: Heart,
      label: 'Change Subscription',
      description: 'Switch your plan',
      onPress: () => router.push('/change-subscription' as any),
    });
  }

  // Settings Sections definition
  const settingsSections: SettingsSection[] = [
    {
      title: 'Personal',
      items: personalItems,
    },
    {
      title: 'Support',
      items: [
        { icon: HelpCircle, label: 'Help & FAQ', description: 'Common questions', onPress: () => router.push('/help' as any) },
        { icon: Shield, label: 'Privacy', description: 'Data protection', onPress: () => router.push('/privacy' as any) },
        { icon: LogOut, label: 'Sign Out', description: 'Sign out of account', isSignOut: true, onPress: handleSignOut, disabled: isSigningOut },
      ],
    },
  ];

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          {/* Close (X) button in top-right */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Close settings"
            accessibilityRole="button"
          >
            <XIcon color="#9CA3AF" size={28} />
          </TouchableOpacity>
          <Text style={styles.title}>Guide</Text>
          <Text style={styles.subtitle}>Settings & support</Text>
          {session?.user && <Text style={styles.userEmail}>{session.user.email}</Text>}
        </View>

        {/* Premium Banner */}
        {!hasPremium && !checkingPremium && (
          <TouchableOpacity style={styles.premiumBanner} onPress={() => router.push('/paywall' as any)}>
            <View style={styles.premiumContent}>
              <View style={styles.premiumIcon}>
                <Sparkles color="#121820" size={24} />
              </View>
              <View style={styles.premiumText}>
                <Text style={styles.premiumTitle}>Unlock Premium</Text>
                <Text style={styles.premiumDescription}>Advanced AI insights, unlimited recordings</Text>
              </View>
            </View>
            <View style={styles.premiumButton}>
              <Text style={styles.premiumButtonText}>Upgrade</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Settings */}
        {settingsSections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionItems}>
              {section.items.map((item, index, arr) => (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.settingItem,
                    (item.isSignOut || index === arr.length - 1) && styles.signOutItem,
                    item.disabled && styles.disabledItem,
                  ]}
                  onPress={item.onPress}
                  disabled={item.disabled}
                >
                  <View style={styles.settingLeft}>
                    <View style={[styles.settingIconContainer, item.isSignOut && styles.signOutIconContainer]}>
                      {item.disabled ? <ActivityIndicator color="#E53E3E" /> : <item.icon color={item.isSignOut ? '#E53E3E' : '#9CA3AF'} size={20} />}
                    </View>
                    <View style={styles.settingTextContainer}>
                      <Text style={[styles.settingLabel, item.isSignOut && styles.signOutLabel]}>{item.label}</Text>
                      <Text style={styles.settingDescription}>{item.description}</Text>
                    </View>
                  </View>
                  {!item.isSignOut && <ChevronRight color="#6B7280" size={20} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoTitle}>About</Text>
          {loadingAppInfo ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#FFC300" />
              <Text style={styles.loadingText}>Loading app info…</Text>
            </View>
          ) : (
            <View style={styles.appInfoGrid}>
              <View style={styles.appInfoItem}>
                <Text style={styles.appInfoLabel}>Version</Text>
                <Text style={styles.appInfoValue}>1.0.0</Text>
              </View>
              <View style={styles.appInfoItem}>
                <Text style={styles.appInfoLabel}>Sessions</Text>
                <Text style={styles.appInfoValue}>{appInfo?.totalSessions ?? 0}</Text>
              </View>
              <View style={styles.appInfoItem}>
                <Text style={styles.appInfoLabel}>Words Reframed</Text>
                <Text style={styles.appInfoValue}>{appInfo?.totalTransformations ?? 0}</Text>
              </View>
              <View style={[styles.appInfoItem, styles.lastAppInfoItem]}>
                <Text style={styles.appInfoLabel}>Member Since</Text>
                <Text style={styles.appInfoValue}>{appInfo?.memberSince ?? '—'}</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ---------------------------------------------------------------------------
// Styles (colocated for maintainability)
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121820',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 30,
    position: 'relative',
    minHeight: 60,
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#F5F5F0',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  userEmail: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  premiumBanner: {
    backgroundColor: '#FFC300',
    borderRadius: 20,
    padding: 20,
    marginBottom: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  premiumContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  premiumIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(18, 24, 32, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  premiumText: {
    flex: 1,
  },
  premiumTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#121820',
    marginBottom: 4,
  },
  premiumDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#121820',
    opacity: 0.8,
  },
  premiumButton: {
    backgroundColor: '#121820',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  premiumButtonText: {
    color: '#FFC300',
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#F5F5F0',
    marginBottom: 12,
  },
  sectionItems: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  signOutItem: {
    borderBottomWidth: 0,
  },
  disabledItem: {
    opacity: 0.6,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  signOutIconContainer: {
    backgroundColor: 'rgba(229, 62, 62, 0.1)',
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#F5F5F0',
    marginBottom: 2,
  },
  signOutLabel: {
    color: '#E53E3E',
  },
  settingDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  appInfo: {
    marginBottom: 30,
  },
  appInfoTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#F5F5F0',
    marginBottom: 16,
  },
  appInfoGrid: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  appInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  lastAppInfoItem: {
    borderBottomWidth: 0,
  },
  appInfoLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  appInfoValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#F5F5F0',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginLeft: 10,
  },
});

export default GuideScreen; 