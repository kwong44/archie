/**
 * Analytics Service for The Architect
 * Official PostHog React Native integration following their documentation
 * Provides comprehensive event tracking and user journey analytics
 * 
 * Usage:
 * - Use usePostHog() hook in components
 * - Use AnalyticsService helpers for consistent event formatting
 */

import { usePostHog } from 'posthog-react-native';
import { logger } from './logger';

/**
 * Analytics event categories for organized tracking
 */
export enum AnalyticsEventCategory {
  AUTHENTICATION = 'authentication',
  ONBOARDING = 'onboarding', 
  JOURNALING = 'journaling',
  REFRAMING = 'reframing',
  NAVIGATION = 'navigation',
  ENGAGEMENT = 'engagement',
  PREMIUM = 'premium',
  ERROR = 'error'
}

/**
 * Standard event properties interface
 */
export interface AnalyticsEventProps {
  userId?: string;
  sessionId?: string;
  screen?: string;
  feature?: string;
  action?: string;
  value?: number;
  category?: AnalyticsEventCategory;
  metadata?: Record<string, any>;
}

/**
 * User properties for identification
 */
export interface UserProperties {
  userId: string;
  email?: string;
  onboardingCompleted?: boolean;
  premiumStatus?: 'free' | 'premium';
  journalSessionsTotal?: number;
  signupMethod?: 'email' | 'google';
  lastActiveDate?: string;
}

/**
 * Analytics Service Class
 * Provides helper methods for consistent event tracking with PostHog
 * Use this with the usePostHog() hook for standardized analytics
 */
export class AnalyticsService {
  /**
   * Identifies a user with PostHog
   * Call this after successful authentication
   */
  static identifyUser(posthog: any, properties: UserProperties): void {
    try {
      posthog.identify(properties.userId, {
        email: properties.email,
        onboarding_completed: properties.onboardingCompleted,
        premium_status: properties.premiumStatus,
        journal_sessions_total: properties.journalSessionsTotal,
        signup_method: properties.signupMethod,
        last_active_date: properties.lastActiveDate,
      });

      logger.info('User identified in analytics', {
        userId: properties.userId,
        premiumStatus: properties.premiumStatus
      });

    } catch (error) {
      logger.error('Failed to identify user in analytics', { 
        userId: properties.userId, 
        error 
      });
    }
  }

  /**
   * Tracks authentication events
   */
  static trackAuthEvent(
    posthog: any, 
    action: 'signup' | 'login' | 'logout', 
    props?: AnalyticsEventProps
  ): void {
    try {
      posthog.capture(`auth_${action}`, {
        category: AnalyticsEventCategory.AUTHENTICATION,
        action,
        method: props?.metadata?.method || 'unknown',
        success: props?.metadata?.success ?? true,
        ...props
      });

      logger.info('Auth event tracked', { action, success: props?.metadata?.success });

    } catch (error) {
      logger.error('Failed to track auth event', { action, error });
    }
  }

  /**
   * Tracks onboarding progress
   */
  static trackOnboardingEvent(
    posthog: any,
    step: 'principles_started' | 'principles_completed' | 'lexicon_started' | 'lexicon_completed',
    props?: AnalyticsEventProps
  ): void {
    try {
      posthog.capture(`onboarding_${step}`, {
        category: AnalyticsEventCategory.ONBOARDING,
        step,
        screen: props?.screen,
        ...props
      });

      logger.info('Onboarding event tracked', { step });

    } catch (error) {
      logger.error('Failed to track onboarding event', { step, error });
    }
  }

  /**
   * Tracks journaling session events
   */
  static trackJournalingEvent(
    posthog: any,
    action: 'session_started' | 'recording_started' | 'recording_completed' | 'transcription_received',
    props?: AnalyticsEventProps
  ): void {
    try {
      posthog.capture(`journaling_${action}`, {
        category: AnalyticsEventCategory.JOURNALING,
        action,
        session_duration: props?.metadata?.duration,
        word_count: props?.metadata?.wordCount,
        ...props
      });

      logger.info('Journaling event tracked', { action, duration: props?.metadata?.duration });

    } catch (error) {
      logger.error('Failed to track journaling event', { action, error });
    }
  }

  /**
   * Tracks reframing/transformation events
   */
  static trackReframingEvent(
    posthog: any,
    action: 'reframe_applied' | 'lexicon_word_used' | 'summary_generated' | 'session_completed',
    props?: AnalyticsEventProps
  ): void {
    try {
      posthog.capture(`reframing_${action}`, {
        category: AnalyticsEventCategory.REFRAMING,
        action,
        transformations_count: props?.metadata?.transformationsCount,
        words_reframed: props?.metadata?.wordsReframed,
        ai_summary_generated: props?.metadata?.aiSummaryGenerated,
        ...props
      });

      logger.info('Reframing event tracked', { 
        action, 
        transformationsCount: props?.metadata?.transformationsCount 
      });

    } catch (error) {
      logger.error('Failed to track reframing event', { action, error });
    }
  }

  /**
   * Tracks navigation and screen views
   */
  static trackNavigationEvent(
    posthog: any,
    screen: string,
    props?: AnalyticsEventProps
  ): void {
    try {
      posthog.capture('screen_view', {
        category: AnalyticsEventCategory.NAVIGATION,
        screen,
        previous_screen: props?.metadata?.previousScreen,
        navigation_method: props?.metadata?.navigationMethod,
        ...props
      });

      logger.info('Navigation event tracked', { screen });

    } catch (error) {
      logger.error('Failed to track navigation event', { screen, error });
    }
  }

  /**
   * Tracks premium/subscription events
   */
  static trackPremiumEvent(
    posthog: any,
    action: 'paywall_viewed' | 'upgrade_attempted' | 'subscription_purchased' | 'subscription_cancelled',
    props?: AnalyticsEventProps
  ): void {
    try {
      posthog.capture(`premium_${action}`, {
        category: AnalyticsEventCategory.PREMIUM,
        action,
        subscription_plan: props?.metadata?.plan,
        price: props?.value,
        ...props
      });

      logger.info('Premium event tracked', { action, plan: props?.metadata?.plan });

    } catch (error) {
      logger.error('Failed to track premium event', { action, error });
    }
  }

  /**
   * Tracks engagement events (prompts, features, etc.)
   */
  static trackEngagementEvent(
    posthog: any,
    action: 'prompt_viewed' | 'prompt_used' | 'feature_discovered' | 'session_extended',
    props?: AnalyticsEventProps
  ): void {
    try {
      posthog.capture(`engagement_${action}`, {
        category: AnalyticsEventCategory.ENGAGEMENT,
        action,
        prompt_category: props?.metadata?.promptCategory,
        feature_name: props?.feature,
        ...props
      });

      logger.info('Engagement event tracked', { action, feature: props?.feature });

    } catch (error) {
      logger.error('Failed to track engagement event', { action, error });
    }
  }

  /**
   * Tracks error events for debugging
   */
  static trackErrorEvent(
    posthog: any,
    error: Error | string,
    context?: string,
    props?: AnalyticsEventProps
  ): void {
    try {
      posthog.capture('error_occurred', {
        category: AnalyticsEventCategory.ERROR,
        error_message: typeof error === 'string' ? error : error.message,
        error_context: context,
        screen: props?.screen,
        ...props
      });

      logger.error('Error event tracked', { error, context });

    } catch (trackingError) {
      logger.error('Failed to track error event', { originalError: error, trackingError });
    }
  }
}

/**
 * Custom React Hook for Analytics
 * Combines usePostHog with our AnalyticsService helpers
 * 
 * Usage:
 * const analytics = useAnalytics();
 * analytics.trackAuth('login', { metadata: { method: 'email' } });
 */
export function useAnalytics() {
  const posthog = usePostHog();

  return {
    // Direct PostHog access
    posthog,
    
    // Convenience methods using our service
    identifyUser: (props: UserProperties) => AnalyticsService.identifyUser(posthog, props),
    trackAuth: (action: Parameters<typeof AnalyticsService.trackAuthEvent>[1], props?: AnalyticsEventProps) => 
      AnalyticsService.trackAuthEvent(posthog, action, props),
    trackOnboarding: (step: Parameters<typeof AnalyticsService.trackOnboardingEvent>[1], props?: AnalyticsEventProps) => 
      AnalyticsService.trackOnboardingEvent(posthog, step, props),
    trackJournaling: (action: Parameters<typeof AnalyticsService.trackJournalingEvent>[1], props?: AnalyticsEventProps) => 
      AnalyticsService.trackJournalingEvent(posthog, action, props),
    trackReframing: (action: Parameters<typeof AnalyticsService.trackReframingEvent>[1], props?: AnalyticsEventProps) => 
      AnalyticsService.trackReframingEvent(posthog, action, props),
    trackNavigation: (screen: string, props?: AnalyticsEventProps) => 
      AnalyticsService.trackNavigationEvent(posthog, screen, props),
    trackPremium: (action: Parameters<typeof AnalyticsService.trackPremiumEvent>[1], props?: AnalyticsEventProps) => 
      AnalyticsService.trackPremiumEvent(posthog, action, props),
    trackEngagement: (action: Parameters<typeof AnalyticsService.trackEngagementEvent>[1], props?: AnalyticsEventProps) => 
      AnalyticsService.trackEngagementEvent(posthog, action, props),
    trackError: (error: Error | string, context?: string, props?: AnalyticsEventProps) => 
      AnalyticsService.trackErrorEvent(posthog, error, context, props),
  };
}

/**
 * Export for backward compatibility and direct usage
 */
export { usePostHog } from 'posthog-react-native'; 