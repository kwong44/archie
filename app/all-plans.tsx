import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SubscriptionService, SubscriptionPackage } from '@/services/subscriptionService';
import { createContextLogger } from '@/lib/logger';
import { Check } from 'lucide-react-native';

// Logger
const screenLogger = createContextLogger('AllPlansScreen');

// UI Guideline Colors
const BG_PRIMARY = '#121820'; // Matching app's primary background
const COMPONENT_BG = '#1F2937'; // Matching app's component background
const BORDER_COLOR = '#374151'; // Matching app's border color
const ACCENT_PRIMARY = '#FFC300'; // Matching app's primary accent
const TEXT_PRIMARY = '#F5F5F0'; // Matching app's primary text
const TEXT_SECONDARY = '#9CA3AF'; // Matching app's secondary text
const TEXT_ON_ACCENT = '#121820'; // Text on accent backgrounds

export default function AllPlansScreen() {
  const router = useRouter();
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    SubscriptionService.getAvailablePackages()
      .then((pkgs) => {
        // Sort packages by estimated weekly price to handle different periods
        const sorted = pkgs.sort((a, b) => {
          const getNormalizedPrice = (p: SubscriptionPackage) => {
            switch (p.packageType) {
              case 'ANNUAL': return p.product.price / 52;
              case 'MONTHLY': return p.product.price / 4;
              case 'WEEKLY': return p.product.price;
              default: return p.product.price;
            }
          };
          return getNormalizedPrice(a) - getNormalizedPrice(b);
        });
        
        setPackages(sorted);
        
        // Default selection to the plan with an intro offer, or the first one.
        const defaultSelection = sorted.find(p => p.product.introductoryPrice) || sorted[0];
        if (defaultSelection) {
          setSelectedPackageId(defaultSelection.identifier);
        }
      })
      .catch((err) => screenLogger.error('Failed to load packages', { error: String(err) }))
      .finally(() => setLoading(false));
  }, []);


  const handleSelect = (id: string) => {
    setSelectedPackageId(id);
  };

  const handleContinue = async () => {
    if (!selectedPackageId) return;
    setProcessing(true);
    try {
      screenLogger.trackUserAction('all_plans_purchase', 'subscription', { packageId: selectedPackageId });
      const result = await SubscriptionService.purchasePackage(selectedPackageId);
      if (result.success) {
        Alert.alert('Thank you!', 'Your subscription is now active.');
        (router as any).replace('/(tabs)');
      } else {
        Alert.alert('Purchase Failed', result.error || 'Please try again.');
      }
    } catch (err) {
      screenLogger.error('Purchase error', { error: String(err) });
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setProcessing(false);
    }
  };

  const handleRestore = () => {
    screenLogger.trackUserAction('all_plans_restore', 'subscription');
    // Assuming you have a restore mechanism on the paywall or want one here
    Alert.alert('Restore Purchases', 'Restoring your previous purchases...');
    SubscriptionService.restorePurchases()
      .then(result => {
        if (result.success) {
          Alert.alert('Success', 'Your purchases have been restored.');
          (router as any).replace('/(tabs)');
        } else {
          Alert.alert('No Purchases Found', 'We couldn\'t find any previous purchases to restore.');
        }
      })
      .catch(err => {
        screenLogger.error('Restore error', { error: String(err) });
        Alert.alert('Error', 'An unexpected error occurred during restore.');
      });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Decorative placeholder could go here */}
        <View style={styles.titleWrapper}>
          <Text style={styles.title}>Choose Your Plan</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={ACCENT_PRIMARY} size="large" />
        ) : (
          packages.map((pkg) => {
            const isSelected = pkg.identifier === selectedPackageId;
            return (
              <TouchableOpacity
                key={pkg.identifier}
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => handleSelect(pkg.identifier)}
                activeOpacity={0.8}
              >
                <View style={styles.cardTextWrapper}>
                  <Text style={[styles.cardTitle, isSelected && { color: TEXT_ON_ACCENT }]}>
                    {pkg.product.title}
                  </Text>
                  
                  {/* Informational text about the plan */}
                  <Text style={[styles.cardSubtitle, isSelected && { color: TEXT_ON_ACCENT }]}>
                    {pkg.product.introductoryPrice ? (
                      <>
                        <Text style={{ fontFamily: 'Inter-Bold' }}>
                          {pkg.product.introductoryPrice.priceString} for the first {pkg.product.introductoryPrice.periodNumberOfUnits > 1 ? pkg.product.introductoryPrice.periodNumberOfUnits : ''} {pkg.product.introductoryPrice.periodUnit.toLowerCase()}
                        </Text>
                        , then {pkg.product.priceString} / {pkg.packageType === 'ANNUAL' ? 'year' : 'month'}
                      </>
                    ) : (
                      <>
                        {pkg.product.priceString} / {pkg.packageType === 'MONTHLY' ? 'month' : pkg.packageType === 'ANNUAL' ? 'year' : 'week'}
                        {pkg.packageType === 'ANNUAL' && (
                          <Text style={styles.discountText}> (Save 20%)</Text>
                        )}
                      </>
                    )}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Continue button */}
        <TouchableOpacity
          style={[styles.continueButton, (processing || !selectedPackageId) && { opacity: 0.6 }]}
          onPress={handleContinue}
          disabled={processing || !selectedPackageId}
        >
          {processing ? (
            <ActivityIndicator color={TEXT_ON_ACCENT} />
          ) : (
            <Text style={styles.continueText}>Continue</Text>
          )}
        </TouchableOpacity>

        {/* Restore purchase */}
        <TouchableOpacity style={styles.restoreButton} onPress={handleRestore}>
          <Text style={styles.restoreText}>Restore purchase</Text>
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
    paddingTop: 40,
    paddingBottom: 40,
  },
  titleWrapper: {
    marginBottom: 24,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 32,
    color: TEXT_PRIMARY,
    textAlign: 'center',
  },
  card: {
    backgroundColor: COMPONENT_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardSelected: {
    backgroundColor: ACCENT_PRIMARY,
    borderColor: ACCENT_PRIMARY,
  },
  cardTextWrapper: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 20,
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: TEXT_SECONDARY,
    lineHeight: 20,
  },
  discountText: {
    color: '#10B981', // accent-success from guidelines
    fontFamily: 'Inter-SemiBold',
  },
  continueButton: {
    backgroundColor: ACCENT_PRIMARY,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  continueText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: TEXT_ON_ACCENT,
  },
  restoreButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  restoreText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: TEXT_SECONDARY,
    textDecorationLine: 'underline',
  },
}); 