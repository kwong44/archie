import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  User,
  Bell,
  HelpCircle,
  Shield,
  Heart,
  ChevronRight,
  Moon,
  Sparkles,
  MessageCircle,
  LogOut,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { SubscriptionService } from '@/services/subscriptionService';
import { styles } from './GuideScreen.styles';

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

  // Settings Sections definition
  const settingsSections: SettingsSection[] = [
    {
      title: 'Personal',
      items: [
        { icon: User, label: 'Profile', description: 'Manage your info' },
        { icon: Bell, label: 'Notifications', description: 'Customize reminders' },
        { icon: Moon, label: 'Preferences', description: 'Theme & display' },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: HelpCircle, label: 'Help & FAQ', description: 'Common questions' },
        { icon: Shield, label: 'Privacy', description: 'Data protection' },
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
              {section.items.map((item) => (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.settingItem, item.isSignOut && styles.signOutItem, item.disabled && styles.disabledItem]}
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

export default GuideScreen; 