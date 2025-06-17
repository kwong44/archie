import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  LogOut
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

/**
 * GuideScreen Component
 * Settings and support screen with user profile management
 * Includes sign-out functionality and app information
 */
export default function GuideScreen() {
  const { session } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  /**
   * Handles user sign-out with confirmation dialog
   * Signs out from Supabase and clears the user session
   */
  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? Your data will be saved and you can sign back in anytime.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setIsSigningOut(true);
            
            try {
              console.log('🔐 Signing out user');
              
              const { error } = await supabase.auth.signOut();
              
              if (error) {
                console.error('❌ Sign-out error:', error);
                Alert.alert('Sign Out Error', error.message);
              } else {
                console.log('✅ User signed out successfully');
                // Navigation will be handled automatically by AuthContext
              }
            } catch (error) {
              console.error('❌ Unexpected sign-out error:', error);
              Alert.alert('Error', 'An unexpected error occurred. Please try again.');
            } finally {
              setIsSigningOut(false);
            }
          },
        },
      ]
    );
  };

  const settingsSections = [
    {
      title: 'Personal',
      items: [
        { icon: User, label: 'Profile', description: 'Manage your personal information' },
        { icon: Bell, label: 'Notifications', description: 'Customize your reminders' },
        { icon: Moon, label: 'Preferences', description: 'App settings and customization' },
      ]
    },
    {
      title: 'Journey',
      items: [
        { icon: Sparkles, label: 'AI Guide', description: 'Adjust your reframing assistant' },
        { icon: Heart, label: 'Wellness', description: 'Health and mindfulness settings' },
        { icon: MessageCircle, label: 'Export Data', description: 'Download your journal entries' },
      ]
    },
    {
      title: 'Support',
      items: [
        { icon: HelpCircle, label: 'Help & FAQ', description: 'Get answers to common questions' },
        { icon: Shield, label: 'Privacy & Security', description: 'Data protection and privacy' },
      ]
    },
    {
      title: 'Account',
      items: [
        { 
          icon: LogOut, 
          label: 'Sign Out', 
          description: 'Sign out of your account',
          isSignOut: true,
          onPress: handleSignOut,
          disabled: isSigningOut
        },
      ]
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Guide</Text>
          <Text style={styles.subtitle}>Settings and support for your journey</Text>
          
          {/* User Info */}
          {session?.user && (
            <View style={styles.userInfo}>
              <Text style={styles.userEmail}>{session.user.email}</Text>
            </View>
          )}
        </View>

        {/* Premium Banner */}
        <View style={styles.premiumBanner}>
          <View style={styles.premiumContent}>
            <View style={styles.premiumIcon}>
              <Sparkles color="#121820" size={24} strokeWidth={2} />
            </View>
            <View style={styles.premiumText}>
              <Text style={styles.premiumTitle}>Unlock Premium</Text>
              <Text style={styles.premiumDescription}>
                Advanced AI insights, unlimited recordings, and personalized growth plans
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.premiumButton}>
            <Text style={styles.premiumButtonText}>Upgrade</Text>
          </TouchableOpacity>
        </View>

        {/* Settings Sections */}
        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionItems}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity 
                  key={itemIndex} 
                  style={[
                    styles.settingItem,
                    item.isSignOut && styles.signOutItem,
                    item.disabled && styles.disabledItem
                  ]}
                  onPress={item.onPress}
                  disabled={item.disabled}
                >
                  <View style={styles.settingLeft}>
                    <View style={[
                      styles.settingIconContainer,
                      item.isSignOut && styles.signOutIconContainer
                    ]}>
                      {item.disabled && isSigningOut ? (
                        <ActivityIndicator color="#E53E3E" size="small" />
                      ) : (
                        <item.icon 
                          color={item.isSignOut ? "#E53E3E" : "#9CA3AF"} 
                          size={20} 
                          strokeWidth={2} 
                        />
                      )}
                    </View>
                    <View style={styles.settingTextContainer}>
                      <Text style={[
                        styles.settingLabel,
                        item.isSignOut && styles.signOutLabel
                      ]}>
                        {item.label}
                      </Text>
                      <Text style={styles.settingDescription}>{item.description}</Text>
                    </View>
                  </View>
                  {!item.isSignOut && (
                    <ChevronRight color="#6B7280" size={20} strokeWidth={2} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoTitle}>About</Text>
          <View style={styles.appInfoGrid}>
            <View style={styles.appInfoItem}>
              <Text style={styles.appInfoLabel}>Version</Text>
              <Text style={styles.appInfoValue}>1.0.0</Text>
            </View>
            <View style={styles.appInfoItem}>
              <Text style={styles.appInfoLabel}>Sessions</Text>
              <Text style={styles.appInfoValue}>127</Text>
            </View>
            <View style={styles.appInfoItem}>
              <Text style={styles.appInfoLabel}>Words Reframed</Text>
              <Text style={styles.appInfoValue}>1,248</Text>
            </View>
            <View style={styles.appInfoItem}>
              <Text style={styles.appInfoLabel}>Member Since</Text>
              <Text style={styles.appInfoValue}>Jan 2025</Text>
            </View>
          </View>
        </View>

        {/* Philosophy */}
        <View style={styles.philosophy}>
          <Text style={styles.philosophyTitle}>Our Philosophy</Text>
          <Text style={styles.philosophyText}>
            Every word you speak shapes your reality. By gently reframing the language of limitation into the language of possibility, 
            you're not just changing words—you're rewiring the very foundation of how you experience life.
          </Text>
          <Text style={styles.philosophySignature}>— The Guide</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121820', // Primary background color
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#F5F5F0', // Primary text color
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF', // Secondary text color
  },
  userInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#374151', // Border color
  },
  userEmail: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280', // Tertiary text color
  },
  premiumBanner: {
    backgroundColor: '#FFC300', // Primary accent color
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
    color: '#121820', // Dark text on light background
    marginBottom: 4,
  },
  premiumDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#121820', // Dark text on light background
    opacity: 0.8,
  },
  premiumButton: {
    backgroundColor: '#121820', // Primary background color
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  premiumButtonText: {
    color: '#FFC300', // Primary accent color
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#F5F5F0', // Primary text color
    marginBottom: 12,
  },
  sectionItems: {
    backgroundColor: '#1F2937', // Component background color
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#374151', // Border color
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151', // Border color
  },
  signOutItem: {
    borderBottomWidth: 0, // Remove border for sign-out item as it's last
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
    backgroundColor: '#374151', // Border color
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
    color: '#F5F5F0', // Primary text color
    marginBottom: 2,
  },
  signOutLabel: {
    color: '#E53E3E', // Error color for sign-out
  },
  settingDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF', // Secondary text color
  },
  appInfo: {
    marginBottom: 30,
  },
  appInfoTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#F5F5F0', // Primary text color
    marginBottom: 16,
  },
  appInfoGrid: {
    backgroundColor: '#1F2937', // Component background color
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#374151', // Border color
  },
  appInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#374151', // Border color
  },
  appInfoLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF', // Secondary text color
  },
  appInfoValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#F5F5F0', // Primary text color
  },
  philosophy: {
    backgroundColor: '#1F2937', // Component background color
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#374151', // Border color
    marginBottom: 20,
  },
  philosophyTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#F5F5F0', // Primary text color
    marginBottom: 12,
  },
  philosophyText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#F5F5F0', // Primary text color
    lineHeight: 24,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  philosophySignature: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFC300', // Primary accent color
    textAlign: 'right',
  },
});