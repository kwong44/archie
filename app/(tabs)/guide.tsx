import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
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
  MessageCircle
} from 'lucide-react-native';

export default function GuideScreen() {
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
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Guide</Text>
          <Text style={styles.subtitle}>Settings and support for your journey</Text>
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
                <TouchableOpacity key={itemIndex} style={styles.settingItem}>
                  <View style={styles.settingLeft}>
                    <View style={styles.settingIconContainer}>
                      <item.icon color="#9CA3AF" size={20} strokeWidth={2} />
                    </View>
                    <View style={styles.settingTextContainer}>
                      <Text style={styles.settingLabel}>{item.label}</Text>
                      <Text style={styles.settingDescription}>{item.description}</Text>
                    </View>
                  </View>
                  <ChevronRight color="#6B7280" size={20} strokeWidth={2} />
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
    backgroundColor: '#121820',
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
    color: '#F5F5F0',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
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
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#F5F5F0',
    marginBottom: 2,
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
  philosophy: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#374151',
    marginBottom: 20,
  },
  philosophyTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#F5F5F0',
    marginBottom: 12,
  },
  philosophyText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#F5F5F0',
    lineHeight: 24,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  philosophySignature: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFC300',
    textAlign: 'right',
  },
});