import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SubscriptionService, SubscriptionPackage } from '@/services/subscriptionService';
import { createContextLogger } from '@/lib/logger';
import { CheckCircle, Bell, Star } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { OnboardingService } from '@/services/onboardingService';

// Logger (rule: Logging)
const screenLogger = createContextLogger('TrialIntroScreen');

// Theme constants (rule: ui-guidelines)
const BG_PRIMARY = '#121820';
const COMPONENT_BG = '#1F2937';
const BORDER_COLOR = '#374151';
const ACCENT_PRIMARY = '#FFC300';
const TEXT_PRIMARY = '#F5F5F0';
const TEXT_SECONDARY = '#9CA3AF';
const SUCCESS_COLOR = '#10B981';

interface TimelineItem {
  icon: React.FC<{ color: string; size: number }>; // lucide icon component
  title: string;
  subtitle: string;
  accent?: boolean; // for first green check
}

const TIMELINE: TimelineItem[] = [
  {
    icon: CheckCircle,
    title: 'Today: unlock all features',
    subtitle: 'Insights, guided journals, voice journaling, and more.',
    accent: true,
  },
  {
    icon: Bell,
    title: 'Day 6: trial reminder',
    subtitle: "We'll send you a reminder that your trial is ending.",
  },
  {
    icon: Star,
    title: 'Day 7: trial ends',
    subtitle: "You'll be charged and your subscription will start.",
  },
];

export default function TrialIntroScreen() {
  const router = useRouter();
  const { session, checkOnboardingStatus } = useAuth();
  const [loading, setLoading] = useState(true);
  const [weeklyPackage, setWeeklyPackage] = useState<SubscriptionPackage | null>(null);
  const [processing, setProcessing] = useState(false);

  // Fetch yearly price for copy (rule: Consistency)
  useEffect(() => {
    SubscriptionService.getAvailablePackages()
      .then((pkgs) => {
        /**
         * The user MUST be presented with the weekly plan that contains
         * the introductory "pay as you go" trial offer.
         */
        const weekly = pkgs.find((p) => p.product.identifier.includes('premium_weekly'));

        if (weekly) {
          setWeeklyPackage(weekly);
          screenLogger.info('Found weekly package with intro offer', {
            packageId: weekly.identifier,
            introPrice: weekly.product.introductoryPrice?.priceString,
          });
        } else {
          screenLogger.warn('Could not find the required premium_weekly package');
        }
      })
      .catch((err) => screenLogger.error('Failed to fetch packages', { error: String(err) }))
      .finally(() => setLoading(false));
  }, []);

  /**
   * Marks onboarding as complete and refreshes the auth state.
   * This is the final step of the user onboarding flow.
   */
  const completeOnboarding = async () => {
    if (!session?.user) return;
    try {
      screenLogger.info('Completing onboarding flow', { userId: session.user.id });
      await OnboardingService.completeOnboarding(session.user.id);
      await checkOnboardingStatus(); // Refresh auth context
    } catch (error) {
      screenLogger.error('Failed to mark onboarding as complete', { error: String(error) });
      // Don't block the user, but log the error
    }
  };

  const handleContinue = async () => {
    if (!weeklyPackage) return;
    screenLogger.trackUserAction('trial_intro_continue', 'subscription', { packageId: weeklyPackage.identifier });
    setProcessing(true);
    try {
      const result = await SubscriptionService.purchasePackage(weeklyPackage.identifier);
      await completeOnboarding(); // Mark onboarding complete on success
      if (result.success) {
        Alert.alert('Welcome!', 'Your premium subscription is now active.');
        (router as any).replace('/(tabs)');
      } else {
        Alert.alert('Purchase Failed', result.error || 'Please try again.');
      }
    } catch (err) {
      screenLogger.error('Purchase flow error', { error: String(err) });
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setProcessing(false);
    }
  };

  const handleViewAll = () => {
    screenLogger.trackUserAction('trial_intro_view_all', 'subscription');
    // Intentionally not marking onboarding as complete here,
    // as the user might come back to this screen.
    router.push('/all-plans' as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <Text style={styles.title}>How your 7 day free{`\n`}trial works</Text>

        {/* Timeline */}
        <View style={styles.timelineContainer}>
          {TIMELINE.map((item, idx) => {
            const IconComp = item.icon;
            const isLast = idx === TIMELINE.length - 1;
            return (
              <View key={idx} style={styles.timelineRow}>
                {/* Left column with icon + connector*/}
                <View style={styles.timelineLeft}>
                  <View
                    style={[
                      styles.timelineIconWrapper,
                      item.accent && { backgroundColor: SUCCESS_COLOR },
                    ]}
                  >
                    { /* @ts-ignore dynamic lucide props */}
                    <IconComp size={20} color={item.accent ? BG_PRIMARY : TEXT_PRIMARY} strokeWidth={2} />
                  </View>
                  {/* vertical line */}
                  {!isLast && <View style={styles.timelineLine} />}
                </View>

                {/* Right column text */}
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>{item.title}</Text>
                  <Text style={styles.timelineSubtitle}>{item.subtitle}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Testimonial */}
        <View style={styles.testimonialCard}>
          <Text style={styles.stars}>★★★★★</Text>
          <Text style={styles.testimonialText}>
            The one thing I need to do every day to do everything else I need to do.
          </Text>
          <Text style={styles.testimonialAuthor}>Julian</Text>
        </View>

        {/* Dynamic price copy */}
        <View style={styles.priceCopyContainer}>
          {loading ? (
            <ActivityIndicator color={TEXT_SECONDARY} style={{ height: 44 }} />
          ) : weeklyPackage ? (
            <Text style={styles.priceCopy}>
              <Text style={styles.priceHighlight}>
                $0.99 for the first week
              </Text>
              , then {weeklyPackage.product.priceString}/week. Cancel anytime.
            </Text>
          ) : (
            <Text style={styles.priceCopy}>Could not load plan details.</Text>
          )}
        </View>

        {/* Continue button */}
        <TouchableOpacity style={[styles.continueButton, processing && { opacity: 0.6 }]} onPress={handleContinue} activeOpacity={0.8} disabled={processing || !weeklyPackage}>
          {processing ? <ActivityIndicator color={BG_PRIMARY} /> : <Text style={styles.continueButtonText}>Start Your Trial</Text>}
        </TouchableOpacity>

        {/* View all plans */}
        <TouchableOpacity style={styles.viewAllButton} onPress={handleViewAll}>
          <Text style={styles.viewAllText}>View all plans</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_PRIMARY,
  },
  scrollContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 32,
    color: TEXT_PRIMARY,
    marginTop: 40,
    lineHeight: 38,
  },
  timelineContainer: {
    marginTop: 32,
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 32,
  },
  timelineLeft: {
    width: 40,
    alignItems: 'center',
  },
  timelineIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COMPONENT_BG,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: BORDER_COLOR,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 12,
  },
  timelineTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 20,
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  timelineSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: TEXT_SECONDARY,
    lineHeight: 20,
  },
  testimonialCard: {
    backgroundColor: '#1F2937', // darker green for contrast
    borderRadius: 16,
    padding: 20,
    marginTop: 12,
  },
  stars: {
    color: ACCENT_PRIMARY,
    marginBottom: 8,
    fontFamily: 'Inter-SemiBold',
  },
  testimonialText: {
    color: TEXT_PRIMARY,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    lineHeight: 22,
  },
  testimonialAuthor: {
    color: TEXT_PRIMARY,
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'right',
  },
  priceCopyContainer: {
    marginTop: 24,
    minHeight: 44, // prevent layout shift
    justifyContent: 'center',
  },
  priceCopy: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 20,
  },
  priceHighlight: {
    fontFamily: 'Inter-Bold',
    color: TEXT_PRIMARY,
  },
  continueButton: {
    backgroundColor: ACCENT_PRIMARY,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12, // reduced from 24
  },
  continueButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: BG_PRIMARY, 
  },
  viewAllButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  viewAllText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: TEXT_SECONDARY,
  },
}); 