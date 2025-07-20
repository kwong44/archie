/**
 * This file contains custom type declarations to augment existing libraries.
 * It is used to patch missing or incorrect types from third-party packages.
 */

// --- react-native-purchases ---

import 'react-native-purchases';

declare module 'react-native-purchases' {
  /**
   * Represents a purchaseable introductory offer for a subscription.
   */
  interface PurchasesIntroductoryPrice {
    /** Price of the introductory offer in local currency */
    readonly price: number;
    /** Formatted price of the introductory offer, including its currency symbol. */
    readonly priceString: string;
    /** The period of the introductory offer, specified in ISO 8601 format. */
    readonly period: string;
    /** The number of subscription billing periods for which the introductory offer will be active. */
    readonly cycles: number;
    /** The billing period unit for the introductory offer (e.g., 'DAY', 'WEEK', 'MONTH', 'YEAR'). */
    readonly periodUnit: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'UNKNOWN';
    /** The number of units for the billing period (e.g., if periodUnit is 'MONTH' and this is 3, it's a 3-month period). */
    readonly periodNumberOfUnits: number;
  }

  /**
   * Augmenting the PurchasesStoreProduct interface to include the introductoryPrice property,
   * which is available in the native SDKs but sometimes missing from the TypeScript types.
   */
  interface PurchasesStoreProduct {
    /**
     * The introductory price details for the product, if available.
     * Returns null if there is no introductory price.
     */
    readonly introductoryPrice: PurchasesIntroductoryPrice | null;
  }
} 