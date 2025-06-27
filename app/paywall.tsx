import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Sparkles,
  Check,
  Crown,
  ArrowLeft,
  Zap,
  Brain,
  Calendar,
  Volume2
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { SubscriptionService, SubscriptionPackage, SubscriptionTier } from '@/services/subscriptionService';
import { logger } from '@/lib/logger';

/**
 * Premium features list for display on paywall
 */
const PREMIUM_FEATURES = [
  {
    icon: Brain,
    title: 'Advanced AI Insights',
    description: 'Deep pattern analysis and personalized growth recommendations'
  },
  {
    icon: Volume2,
    title: 'Unlimited Voice Sessions',
    description: 'Record as many sessions as you want without limits'
  },
  {
    icon: Zap,
    title: 'Priority AI Processing',
    description: 'Faster transcriptions and summaries with premium servers'
  },
  {
    icon: Calendar,
    title: 'Extended History',
    description: 'Access your complete journey with unlimited session storage'
  },
  {
    icon: Sparkles,
    title: 'Personalized Growth Plans',
    description: 'Custom roadmaps tailored to your transformation goals'
  }
];

/**
 * PaywallScreen Component
 * Premium subscription paywall with package selection and purchase flow
 * Showcases premium features and handles subscription purchases
 */
export default function PaywallScreen() {
  const router = useRouter();
  const { session } = useAuth();
  
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  /**
   * Fetches available subscription packages on component mount
   * Automatically selects the yearly package as default
   */
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        logger.info('Fetching subscription packages for paywall');
        
        const availablePackages = await SubscriptionService.getAvailablePackages();
        setPackages(availablePackages);
        
        // Auto-select yearly package if available, otherwise monthly
        const yearlyPackage = availablePackages.find(pkg => 
          pkg.product.identifier.includes('yearly') || pkg.packageType === 'ANNUAL'
        );
        const monthlyPackage = availablePackages.find(pkg => 
          pkg.product.identifier.includes('monthly') || pkg.packageType === 'MONTHLY'
        );
        
        if (yearlyPackage) {
          setSelectedPackage(yearlyPackage.identifier);
        } else if (monthlyPackage) {
          setSelectedPackage(monthlyPackage.identifier);
        }
        
        logger.info('Packages loaded for paywall', { 
          packagesCount: availablePackages.length,
          selectedPackage: yearlyPackage?.identifier || monthlyPackage?.identifier
        });
        
      } catch (error) {
        logger.error('Failed to fetch packages for paywall', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        Alert.alert('Error', 'Unable to load subscription options. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchPackages();
  }, []);

  /**
   * Handles package selection by the user
   * Updates the selected package state
   */
  const handlePackageSelect = (packageId: string) => {
    logger.info('User selected subscription package', { packageId });
    setSelectedPackage(packageId);
  };

  /**
   * Initiates the subscription purchase flow
   * Handles the entire purchase process and navigation
   */
  const handlePurchase = async () => {
    if (!selectedPackage || !session?.user?.id) {
      logger.warn('Purchase attempted without selected package or user session');
      Alert.alert('Error', 'Please select a subscription plan and ensure you are logged in.');
      return;
    }

    setPurchasing(true);
    
    try {
      logger.info('Starting subscription purchase', { 
        packageId: selectedPackage,
        userId: session.user.id 
      });

      // Ensure RevenueCat is properly linked to the user
      await SubscriptionService.setUserID(session.user.id);
      
      // Attempt the purchase
      const result = await SubscriptionService.purchasePackage(selectedPackage);
      
      if (result.success) {
        logger.info('Subscription purchase successful', { packageId: selectedPackage });
        
        Alert.alert(
          'Welcome to Premium!',
          'Your subscription is now active. Enjoy unlimited access to all premium features!',
          [
            {
              text: 'Continue',
              onPress: () => router.back()
            }
          ]
        );
      } else {
        logger.error('Subscription purchase failed', { 
          packageId: selectedPackage,
          error: result.error 
        });
        
        Alert.alert(
          'Purchase Failed', 
          result.error || 'Unable to complete purchase. Please try again.'
        );
      }
    } catch (error) {
      logger.error('Unexpected error during purchase', {
        packageId: selectedPackage,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  /**
   * Handles restoring previous purchases
   * Useful for users who reinstalled the app
   */
  const handleRestorePurchases = async () => {
    setRestoring(true);
    
    try {
      logger.info('Restoring purchases for user', { userId: session?.user?.id });
      
      const result = await SubscriptionService.restorePurchases();
      
      if (result.success) {
        // Check if premium was restored
        const hasPremium = await SubscriptionService.hasPremiumAccess();
        
        if (hasPremium) {
          logger.info('Premium access restored successfully');
          Alert.alert(
            'Purchases Restored',
            'Your premium subscription has been restored!',
            [
              {
                text: 'Continue',
                onPress: () => router.back()
              }
            ]
          );
        } else {
          logger.info('No active premium subscription found during restore');
          Alert.alert('No Purchases Found', 'No active premium subscription found.');
        }
      } else {
        logger.error('Failed to restore purchases', { error: result.error });
        Alert.alert('Restore Failed', result.error || 'Unable to restore purchases.');
      }
    } catch (error) {
      logger.error('Unexpected error during purchase restoration', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setRestoring(false);
    }
  };

  /**
   * Calculates the savings percentage for yearly vs monthly packages
   */
  const getSavingsPercentage = (): number => {
    const yearlyPackage = packages.find(pkg => 
      pkg.product.identifier.includes('yearly') || pkg.packageType === 'ANNUAL'
    );
    const monthlyPackage = packages.find(pkg => 
      pkg.product.identifier.includes('monthly') || pkg.packageType === 'MONTHLY'
    );

    if (!yearlyPackage || !monthlyPackage) return 0;

    const yearlyMonthlyPrice = yearlyPackage.product.price / 12;
    const monthlyPrice = monthlyPackage.product.price;
    
    return Math.round(((monthlyPrice - yearlyMonthlyPrice) / monthlyPrice) * 100);
  };

  const savingsPercentage = getSavingsPercentage();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
          >
            <ArrowLeft color="#F5F5F0" size={24} strokeWidth={2} />
          </TouchableOpacity>
          
          <View style={styles.titleContainer}>
            <View style={styles.crownIcon}>
              <Crown color="#FFC300" size={32} strokeWidth={2} />
            </View>
            <Text style={styles.title}>Unlock Premium</Text>
            <Text style={styles.subtitle}>
              Transform your language, transform your life
            </Text>
          </View>
        </View>

        {/* Premium Features */}
        <View style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>Premium Features</Text>
          {PREMIUM_FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <feature.icon color="#FFC300" size={20} strokeWidth={2} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Subscription Packages */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#FFC300" size="large" />
            <Text style={styles.loadingText}>Loading subscription options...</Text>
          </View>
        ) : (
          <View style={styles.packagesSection}>
            <Text style={styles.packagesTitle}>Choose Your Plan</Text>
            
            {packages.map((pkg) => {
              const isSelected = selectedPackage === pkg.identifier;
              const isYearly = pkg.product.identifier.includes('yearly') || pkg.packageType === 'ANNUAL';
              
              return (
                <TouchableOpacity
                  key={pkg.identifier}
                  style={[styles.packageCard, isSelected && styles.selectedPackage]}
                  onPress={() => handlePackageSelect(pkg.identifier)}
                >
                  {isYearly && savingsPercentage > 0 && (
                    <View style={styles.savingsBadge}>
                      <Text style={styles.savingsText}>Save {savingsPercentage}%</Text>
                    </View>
                  )}
                  
                  <View style={styles.packageHeader}>
                    <View style={styles.packageInfo}>
                      <Text style={styles.packageTitle}>
                        {isYearly ? 'Yearly Premium' : 'Monthly Premium'}
                      </Text>
                      <Text style={styles.packagePrice}>{pkg.product.priceString}</Text>
                      {isYearly && (
                        <Text style={styles.packagePriceDetail}>
                          {`$${(pkg.product.price / 12).toFixed(2)}/month`}
                        </Text>
                      )}
                    </View>
                    
                    <View style={[styles.radioButton, isSelected && styles.radioButtonSelected]}>
                      {isSelected && <Check color="#121820" size={16} strokeWidth={3} />}
                    </View>
                  </View>
                  
                  <Text style={styles.packageDescription}>
                    {pkg.product.description}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={[styles.upgradeButton, purchasing && styles.disabledButton]}
            onPress={handlePurchase}
            disabled={purchasing || !selectedPackage}
          >
            {purchasing ? (
              <ActivityIndicator color="#121820" size="small" />
            ) : (
              <>
                <Sparkles color="#121820" size={20} strokeWidth={2} />
                <Text style={styles.upgradeButtonText}>Start Premium</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestorePurchases}
            disabled={restoring}
          >
            {restoring ? (
              <ActivityIndicator color="#9CA3AF" size="small" />
            ) : (
              <Text style={styles.restoreButtonText}>Restore Purchases</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Terms */}
        <View style={styles.termsSection}>
          <Text style={styles.termsText}>
            Subscriptions auto-renew unless cancelled. Cancel anytime in App Store settings.
          </Text>
          <Text style={styles.termsText}>
            By purchasing, you agree to our Terms of Service and Privacy Policy.
          </Text>
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1F2937', // Component background color
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleContainer: {
    alignItems: 'center',
  },
  crownIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 195, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#F5F5F0', // Primary text color
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF', // Secondary text color
    textAlign: 'center',
  },
  featuresSection: {
    marginBottom: 30,
  },
  featuresTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#F5F5F0', // Primary text color
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 195, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#F5F5F0', // Primary text color
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF', // Secondary text color
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF', // Secondary text color
    marginTop: 12,
  },
  packagesSection: {
    marginBottom: 30,
  },
  packagesTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#F5F5F0', // Primary text color
    marginBottom: 20,
  },
  packageCard: {
    backgroundColor: '#1F2937', // Component background color
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#374151', // Border color
    padding: 20,
    marginBottom: 12,
    position: 'relative',
  },
  selectedPackage: {
    borderColor: '#FFC300', // Primary accent color
    backgroundColor: 'rgba(255, 195, 0, 0.05)',
  },
  savingsBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    backgroundColor: '#10B981', // Success color
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  savingsText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  packageInfo: {
    flex: 1,
  },
  packageTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#F5F5F0', // Primary text color
    marginBottom: 4,
  },
  packagePrice: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFC300', // Primary accent color
    marginBottom: 2,
  },
  packagePriceDetail: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF', // Secondary text color
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#374151', // Border color
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    backgroundColor: '#FFC300', // Primary accent color
    borderColor: '#FFC300',
  },
  packageDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF', // Secondary text color
    lineHeight: 20,
  },
  actionsSection: {
    marginBottom: 30,
  },
  upgradeButton: {
    backgroundColor: '#FFC300', // Primary accent color
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
  upgradeButtonText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#121820', // Dark text on light background
    marginLeft: 8,
  },
  restoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  restoreButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF', // Secondary text color
  },
  termsSection: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#374151', // Border color
  },
  termsText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280', // Tertiary text color
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },
}); 