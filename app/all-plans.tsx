import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SubscriptionService, SubscriptionPackage } from '@/services/subscriptionService';
import { createContextLogger } from '@/lib/logger';
import { Check } from 'lucide-react-native';

// Logger
const screenLogger = createContextLogger('AllPlansScreen');

// Theme constants
const BG_PRIMARY = '#121820';
const CARD_BG = '#FFFFFF';
const CARD_BG_SELECTED = '#D6FF8F'; // light lime similar to screenshot
const TEXT_PRIMARY = '#000000';
const TEXT_SECONDARY = '#6B7280';
const ACCENT_PRIMARY = '#FFC300';

export default function AllPlansScreen() {
  const router = useRouter();
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    SubscriptionService.getAvailablePackages()
      .then((pkgs) => {
        // Sort to monthly first, then yearly etc.
        const sorted = pkgs.sort((a, b) => {
          // simple price sort isn't robust enough for different periods.
          // this is a rough but better approximation.
          const priceA = a.product.price / (a.packageType === 'MONTHLY' ? 1 : a.packageType === 'ANNUAL' ? 12 : 0.25);
          const priceB = b.product.price / (b.packageType === 'MONTHLY' ? 1 : b.packageType === 'ANNUAL' ? 12 : 0.25);
          return priceA - priceB;
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
    router.replace('/paywall' as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Decorative placeholder could go here */}
        <View style={styles.titleWrapper}>
          <Text style={styles.title}>Choose other plan</Text>
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
                  <Text style={[styles.cardTitle, isSelected && { color: TEXT_PRIMARY }]}>
                    {pkg.product.title}
                  </Text>
                  
                  {/* Informational text about the plan */}
                  <Text style={[styles.cardSubtitle, isSelected && { color: TEXT_PRIMARY }]}>
                    {pkg.product.introductoryPrice ? (
                      <>
                        <Text style={{ fontWeight: 'bold' }}>
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
                <View style={[styles.radio, isSelected && styles.radioSelected]}>
                  {isSelected && <Check size={18} color={BG_PRIMARY} strokeWidth={3} />}
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Continue button */}
        <TouchableOpacity
          style={[styles.continueButton, processing && { opacity: 0.6 }]}
          onPress={handleContinue}
          disabled={processing || !selectedPackageId}
        >
          {processing ? (
            <ActivityIndicator color={BG_PRIMARY} />
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
    paddingTop: 20,
    paddingBottom: 40,
  },
  titleWrapper: {
    marginBottom: 24,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 32,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 28,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardSelected: {
    backgroundColor: CARD_BG_SELECTED,
  },
  cardTextWrapper: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 20,
    color: TEXT_PRIMARY,
  },
  cardSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: TEXT_SECONDARY,
    lineHeight: 20,
  },
  discountText: {
    color: '#059669', // a nice green for the discount
    fontFamily: 'Inter-SemiBold',
  },
  radio: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#C4C4C4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  continueButton: {
    backgroundColor: '#D1D1D1',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  continueText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#000000',
  },
  restoreButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  restoreText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: TEXT_SECONDARY,
  },
}); 