import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SubscriptionService, SubscriptionPackage } from '@/services/subscriptionService';
import { createContextLogger } from '@/lib/logger';
import { X as XIcon } from 'lucide-react-native';

// Logger scoped to this modal
const modalLogger = createContextLogger('ChangeSubscriptionModal');

// UI palette constants (from guidelines)
const BG_PRIMARY = '#121820';
const COMPONENT_BG = '#1F2937';
const BORDER_COLOR = '#374151';
const ACCENT_PRIMARY = '#FFC300';
const TEXT_PRIMARY = '#F5F5F0';
const TEXT_SECONDARY = '#9CA3AF';
const TEXT_ON_ACCENT = '#121820';

export default function ChangeSubscriptionScreen() {
  const router = useRouter();
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Fetch available packages
  useEffect(() => {
    SubscriptionService.getAvailablePackages()
      .then((pkgs) => {
        const sorted = pkgs.sort((a, b) => a.product.price - b.product.price);
        setPackages(sorted);
        if (sorted[0]) setSelectedPackageId(sorted[0].identifier);
      })
      .catch((err) => modalLogger.error('Failed to load packages', { error: String(err) }))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (id: string) => setSelectedPackageId(id);

  const handleContinue = async () => {
    if (!selectedPackageId) return;
    setProcessing(true);
    try {
      modalLogger.trackUserAction('change_subscription_purchase', 'subscription', { packageId: selectedPackageId });
      const result = await SubscriptionService.purchasePackage(selectedPackageId);
      if (result.success) {
        Alert.alert('Success', 'Your subscription has been updated.');
        router.back();
      } else {
        Alert.alert('Purchase Failed', result.error || 'Please try again.');
      }
    } catch (err) {
      modalLogger.error('Purchase error', { error: String(err) });
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      await SubscriptionService.openManageSubscription();
    } catch (_) {
      Alert.alert('Error', 'Unable to open subscription settings.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <XIcon color={TEXT_SECONDARY} size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Subscription</Text>
        <Text style={styles.headerSubtitle}>Change your plan</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {loading ? (
          <ActivityIndicator color={ACCENT_PRIMARY} size="large" />
        ) : (
          packages.map((pkg) => {
            const isSelected = pkg.identifier === selectedPackageId;
            return (
              <TouchableOpacity key={pkg.identifier} style={[styles.card, isSelected && styles.cardSelected]} onPress={() => handleSelect(pkg.identifier)}>
                <Text style={[styles.cardTitle, isSelected && { color: TEXT_ON_ACCENT }]}>{pkg.product.title}</Text>
                <Text style={[styles.cardPrice, isSelected && { color: TEXT_ON_ACCENT }]}>{pkg.product.priceString} / {pkg.packageType.toLowerCase()}</Text>
              </TouchableOpacity>
            );
          })
        )}

        {/* Continue */}
        <TouchableOpacity style={[styles.continueButton, (processing || !selectedPackageId) && { opacity: 0.6 }]} disabled={processing || !selectedPackageId} onPress={handleContinue}>
          {processing ? <ActivityIndicator color={TEXT_ON_ACCENT} /> : <Text style={styles.continueText}>Confirm</Text>}
        </TouchableOpacity>

        {/* Subtle cancel link */}
        <TouchableOpacity onPress={handleCancelSubscription} style={styles.cancelLinkWrapper}>
          <Text style={styles.cancelLinkText}>Cancel subscription</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// Inline styles to comply with guideline of colocated styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_PRIMARY,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 20,
  },
  closeButton: {
    position: 'absolute',
    left: 20,
  },
  headerTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: TEXT_PRIMARY,
  },
  headerSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: TEXT_SECONDARY,
  },
  scrollContainer: {
    padding: 24,
  },
  card: {
    backgroundColor: COMPONENT_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: 20,
    marginBottom: 16,
  },
  cardSelected: {
    backgroundColor: ACCENT_PRIMARY,
    borderColor: ACCENT_PRIMARY,
  },
  cardTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  cardPrice: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: TEXT_SECONDARY,
  },
  continueButton: {
    backgroundColor: '#F5F5F0',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  continueText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: TEXT_ON_ACCENT,
  },
  cancelLinkWrapper: {
    alignItems: 'center',
    marginTop: 24,
  },
  cancelLinkText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: TEXT_SECONDARY,
    textDecorationLine: 'underline',
  },
});

// Mark this route as a modal in expo-router
export const screenOptions = { presentation: 'modal', headerShown: false }; 