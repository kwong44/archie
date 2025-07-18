import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SubscriptionService, SubscriptionPackage } from '@/services/subscriptionService';
import { createContextLogger } from '@/lib/logger';
import { CheckCircle, Bell, Star } from 'lucide-react-native';

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
    title: 'today: unlock all features',
    subtitle: 'insights, patterns, guided journals, voice journaling, extra yap time, relationship analysis, and more.',
    accent: true,
  },
  {
    icon: Bell,
    title: 'day 6: trial reminder',
    subtitle: "we'll send you a reminder that your trial is ending.",
  },
  {
    icon: Star,
    title: 'day 7: trial ends',
    subtitle: "you'll be charged and your subscription will start.",
  },
];

export default function TrialIntroScreen() {
  const router = useRouter();
  const [loadingPrice, setLoadingPrice] = useState(true);
  const [yearlyPriceString, setYearlyPriceString] = useState<string>('');
  const [yearlyPackageId, setYearlyPackageId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Fetch yearly price for copy (rule: Consistency)
  useEffect(() => {
    SubscriptionService.getAvailablePackages()
      .then((pkgs) => {
        const yearly = pkgs.find((p) => p.product.identifier.includes('yearly') || p.packageType === 'ANNUAL');
        if (yearly) {
          setYearlyPriceString(yearly.product.priceString);
          setYearlyPackageId(yearly.identifier);
        }
      })
      .catch((err) => screenLogger.error('Failed to fetch packages', { error: String(err) }))
      .finally(() => setLoadingPrice(false));
  }, []);

  const handleContinue = async () => {
    if (!yearlyPackageId) return;
    screenLogger.trackUserAction('trial_intro_continue', 'subscription', { packageId: yearlyPackageId });
    setProcessing(true);
    try {
      const result = await SubscriptionService.purchasePackage(yearlyPackageId);
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
    // @ts-ignore – typed routes not yet generated for dynamic screen
    (router as any).replace('/all-plans', undefined);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <Text style={styles.title}>how your 7 day free{`\n`}trial works</Text>

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
            like a pressure valve for my day. i just talk, no filter, and somehow i feel 10 pounds lighter every time.
          </Text>
          <Text style={styles.testimonialAuthor}>Julian</Text>
        </View>

        {/* Price copy */}
        <Text style={styles.priceCopy}>
          pre-order special: 7-day free trial, then{' '}
          {loadingPrice ? <Text>...</Text> : <Text>{yearlyPriceString || '$89.00/year (~$1.71/week)'}</Text>}
        </Text>

        {/* Continue button */}
        <TouchableOpacity style={[styles.continueButton, processing && { opacity: 0.6 }]} onPress={handleContinue} activeOpacity={0.8} disabled={processing || !yearlyPackageId}>
          {processing ? <ActivityIndicator color={BG_PRIMARY} /> : <Text style={styles.continueButtonText}>continue</Text>}
        </TouchableOpacity>

        {/* View all plans */}
        <TouchableOpacity style={styles.viewAllButton} onPress={handleViewAll}>
          <Text style={styles.viewAllText}>view all plans</Text>
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
    marginTop: 20,
    lineHeight: 38,
    textTransform: 'lowercase',
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
    textTransform: 'lowercase',
  },
  timelineSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: TEXT_SECONDARY,
    lineHeight: 20,
  },
  testimonialCard: {
    backgroundColor: '#254417', // darker green for contrast
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
  priceCopy: {
    marginTop: 24,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: TEXT_PRIMARY,
    textAlign: 'center',
  },
  continueButton: {
    backgroundColor: ACCENT_PRIMARY,
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  continueButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: BG_PRIMARY,
    textTransform: 'lowercase',
  },
  viewAllButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  viewAllText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: TEXT_SECONDARY,
    textTransform: 'lowercase',
  },
}); 