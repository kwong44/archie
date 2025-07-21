import Purchases, { PurchasesPackage, CustomerInfo, PurchasesOffering, LOG_LEVEL } from 'react-native-purchases';
import { Platform, Linking } from 'react-native';
import { logger } from '@/lib/logger';

/**
 * Subscription tiers available in the app
 */
export enum SubscriptionTier {
  /**
   * FREE tier represents users without any active subscription.
   * This value is used as a safe fallback whenever no premium entitlement is detected.
   */
  FREE = 'free',
  PREMIUM_WEEKLY = 'premium_weekly',
  PREMIUM_MONTHLY = 'premium_monthly',
  PREMIUM_YEARLY = 'premium_yearly'
}

/**
 * Interface for subscription status information
 */
export interface SubscriptionStatus {
  isActive: boolean;
  tier: SubscriptionTier;
  /** The type of the current billing period (TRIAL, INTRO, NORMAL) */
  periodType?: 'TRIAL' | 'INTRO' | 'NORMAL';
  expiresAt?: Date;
  willRenew?: boolean;
  productIdentifier?: string;
}

/**
 * Interface for available subscription packages
 */
export interface SubscriptionPackage {
  identifier: string;
  packageType: string;
  product: {
    identifier: string;
    description: string;
    title: string;
    priceString: string;
    price: number;
    currencyCode: string;
    /** Details about an introductory offer, if available for the user */
    introductoryPrice?: {
      price: number;
      priceString: string;
      period: string;
      cycles: number;
      periodUnit: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'UNKNOWN';
      periodNumberOfUnits: number;
    } | null;
  };
}

/**
 * SubscriptionService
 * Manages premium subscriptions using RevenueCat
 * Handles purchase flow, subscription status, and restoration
 */
export class SubscriptionService {
  private static initialized = false;

  /**
   * Initializes RevenueCat with platform-specific API keys
   * Following RevenueCat React Native documentation requirements
   * This should be called once when the app starts
   */
  static async initialize(iosApiKey: string, androidApiKey: string): Promise<void> {
    if (this.initialized) {
      logger.warn('RevenueCat already initialized');
      return;
    }

    try {
      logger.info('Initializing RevenueCat SDK', { 
        platform: Platform.OS,
        hasIosKey: !!iosApiKey,
        hasAndroidKey: !!androidApiKey 
      });
      
      // Set log level to DEBUG for development, INFO for production
      await Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.INFO);
      
      // Configure with platform-specific API key as per RevenueCat docs
      if (Platform.OS === 'ios') {
        if (!iosApiKey) {
          throw new Error('iOS API key is required for iOS platform');
        }
        await Purchases.configure({ apiKey: iosApiKey });
        logger.info('RevenueCat configured for iOS', { 
          keyPrefix: iosApiKey.slice(0, 10) + '...' 
        });
      } else if (Platform.OS === 'android') {
        if (!androidApiKey) {
          throw new Error('Android API key is required for Android platform');
        }
        await Purchases.configure({ apiKey: androidApiKey });
        logger.info('RevenueCat configured for Android', { 
          keyPrefix: androidApiKey.slice(0, 10) + '...' 
        });
      } else {
        throw new Error(`Unsupported platform: ${Platform.OS}`);
      }
      
      this.initialized = true;
      logger.info('RevenueCat SDK initialized successfully', { platform: Platform.OS });
    } catch (error) {
      logger.error('Failed to initialize RevenueCat', { 
        platform: Platform.OS,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  /**
   * Sets the user ID for RevenueCat (should match Supabase user ID)
   * This links purchases to the specific user account
   */
  static async setUserID(userID: string): Promise<void> {
    try {
      logger.info('Setting RevenueCat user ID', { userID });
      await Purchases.logIn(userID);
      logger.info('RevenueCat user ID set successfully');
    } catch (error) {
      logger.error('Failed to set RevenueCat user ID', { 
        userID, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  /**
   * Gets the current subscription status for the logged-in user
   * Returns detailed information about active subscriptions
   */
  static async getSubscriptionStatus(): Promise<SubscriptionStatus> {
    try {
      logger.info('Fetching current subscription status');
      
      const customerInfo: CustomerInfo = await Purchases.getCustomerInfo();
      
      // Check if user has any active premium entitlements
      const isPremiumActive = customerInfo.entitlements.active['premium'] !== undefined;
      
      if (!isPremiumActive) {
        logger.info('User has no active premium subscription');
        return {
          isActive: false,
          tier: SubscriptionTier.FREE
        };
      }

      // Get the active premium entitlement details
      const premiumEntitlement = customerInfo.entitlements.active['premium'];
      const productId = premiumEntitlement.productIdentifier;
      
      // Determine subscription tier based on product ID
      let tier: SubscriptionTier;
      if (productId.includes('weekly')) {
        tier = SubscriptionTier.PREMIUM_WEEKLY;
      } else if (productId.includes('monthly')) {
        tier = SubscriptionTier.PREMIUM_MONTHLY;
      } else if (productId.includes('yearly')) {
        tier = SubscriptionTier.PREMIUM_YEARLY;
      } else {
        // If product identifier doesn't match known tiers, fall back to MONTHLY to minimise feature lockouts
        logger.warn('Unmapped product ID, defaulting tier to monthly', { productId });
        tier = SubscriptionTier.PREMIUM_MONTHLY;
      }

      const status: SubscriptionStatus = {
        isActive: true,
        tier,
        periodType: premiumEntitlement.periodType as any, // Cast because RC types are strings
        expiresAt: premiumEntitlement.expirationDate ? new Date(premiumEntitlement.expirationDate) : undefined,
        willRenew: premiumEntitlement.willRenew,
        productIdentifier: productId
      };

      logger.info('Subscription status retrieved', { status });
      return status;
      
    } catch (error) {
      logger.error('Failed to get subscription status', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      // Return free tier as fallback
      return {
        isActive: false,
        tier: SubscriptionTier.FREE
      };
    }
  }

  /**
   * Fetches available subscription packages from RevenueCat
   * Returns packages that can be purchased by the user
   */
  static async getAvailablePackages(): Promise<SubscriptionPackage[]> {
    try {
      logger.info('Fetching available subscription packages');
      
      const offerings = await Purchases.getOfferings();
      
      if (!offerings.current) {
        logger.warn('No current offering found');
        return [];
      }

      const packages = offerings.current.availablePackages.map((pkg: PurchasesPackage) => ({
        identifier: pkg.identifier,
        packageType: pkg.packageType,
        product: {
          identifier: pkg.product.identifier,
          description: pkg.product.description,
          title: pkg.product.title,
          priceString: pkg.product.priceString,
          price: pkg.product.price,
          currencyCode: pkg.product.currencyCode,
          introductoryPrice: pkg.product.introductoryPrice ? {
            price: pkg.product.introductoryPrice.price,
            priceString: pkg.product.introductoryPrice.priceString,
            period: pkg.product.introductoryPrice.period,
            cycles: pkg.product.introductoryPrice.cycles,
            periodUnit: pkg.product.introductoryPrice.periodUnit,
            periodNumberOfUnits: pkg.product.introductoryPrice.periodNumberOfUnits
          } : null
        }
      }));

      logger.info('Available packages retrieved', { 
        packagesCount: packages.length,
        packages: packages.map(p => ({ id: p.identifier, price: p.product.priceString }))
      });
      
      return packages;
      
    } catch (error) {
      logger.error('Failed to get available packages', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return [];
    }
  }

  /**
   * Initiates a subscription purchase for the specified package
   * Handles the entire purchase flow and returns the result
   */
  static async purchasePackage(packageIdentifier: string): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('Initiating package purchase', { packageIdentifier });
      
      // Get the current offerings to find the package
      const offerings = await Purchases.getOfferings();
      const currentOffering = offerings.current;
      
      if (!currentOffering) {
        logger.error('No current offering available for purchase');
        return { success: false, error: 'No subscription packages available' };
      }

      // Find the specific package
      const packageToPurchase = currentOffering.availablePackages.find(
        (pkg: PurchasesPackage) => pkg.identifier === packageIdentifier
      );

      if (!packageToPurchase) {
        logger.error('Package not found', { packageIdentifier });
        return { success: false, error: 'Subscription package not found' };
      }

      // Make the purchase
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      
      // Verify the purchase was successful
      const isPremiumActive = customerInfo.entitlements.active['premium'] !== undefined;
      
      if (isPremiumActive) {
        logger.info('Package purchase successful', { 
          packageIdentifier,
          entitlements: Object.keys(customerInfo.entitlements.active)
        });
        return { success: true };
      } else {
        logger.error('Purchase completed but premium not active', { packageIdentifier });
        return { success: false, error: 'Purchase verification failed' };
      }
      
    } catch (error) {
      logger.error('Failed to purchase package', { 
        packageIdentifier,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Purchase failed' 
      };
    }
  }

  /**
   * Restores previous purchases for the current user
   * Useful when users reinstall the app or log in on a new device
   */
  static async restorePurchases(): Promise<{ success: boolean; error?: string }> {
    try {
      logger.info('Restoring previous purchases');
      
      const customerInfo = await Purchases.restorePurchases();
      
      // Check if any premium entitlements were restored
      const isPremiumActive = customerInfo.entitlements.active['premium'] !== undefined;
      
      if (isPremiumActive) {
        logger.info('Purchases restored successfully with active premium');
        return { success: true };
      } else {
        logger.info('Purchases restored but no active premium found');
        return { success: true }; // Still successful, just no active subscriptions
      }
      
    } catch (error) {
      logger.error('Failed to restore purchases', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Restore failed' 
      };
    }
  }

  /**
   * Checks if the user has premium access
   * This is a quick utility method for feature gating
   */
  static async hasPremiumAccess(): Promise<boolean> {
    try {
      const status = await this.getSubscriptionStatus();
      return status.isActive;
    } catch (error) {
      logger.error('Failed to check premium access', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false; // Default to no access on error
    }
  }

  /**
   * Signs out the current user from RevenueCat
   * Should be called when user signs out of the app
   */
  static async signOut(): Promise<void> {
    try {
      // Safety check: Only log out if the user is not anonymous.
      // Calling logOut for an anonymous user is unnecessary and causes an error.
      const isAnonymous = await Purchases.isAnonymous();
      if (isAnonymous) {
        logger.info('User is anonymous, skipping RevenueCat sign out.');
        return;
      }

      logger.info('Signing out from RevenueCat');
      await Purchases.logOut();
      logger.info('RevenueCat sign out successful');
    } catch (error) {
      logger.error('Failed to sign out from RevenueCat', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * Opens the native subscription management screen so the user can cancel or
   * modify their plan via the App Store / Google Play. RevenueCat recommends
   * deep-linking users rather than handling cancellations via support. (Rule: Security-First)
   */
  static async openManageSubscription(): Promise<void> {
    try {
      logger.info('Opening native subscription management', { platform: Platform.OS });

      const url = Platform.OS === 'ios'
        ? 'https://apps.apple.com/account/subscriptions'
        : Platform.OS === 'android'
          ? 'https://play.google.com/store/account/subscriptions'
          : undefined;

      if (!url) {
        logger.warn('Unsupported platform for subscription management', { platform: Platform.OS });
        return;
      }

      await Linking.openURL(url);
    } catch (error) {
      logger.error('Failed to open subscription management URL', { error });
      throw error;
    }
  }
} 