import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { createContextLogger } from '../lib/logger';
import { SubscriptionService } from '@/services/subscriptionService';
import { UserService } from '@/services/userService';
import { PostHogProvider } from 'posthog-react-native';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
import { finishOAuth } from '@/lib/finishOAuth';
import { Platform } from 'react-native';

// Create a context-specific logger for navigation workflows
const navLogger = createContextLogger('RootLayout');

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { session, loading, onboardingCompleted } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  // Track whether the user currently has an active (trial OR paid) subscription
  const [hasPremium, setHasPremium] = useState<boolean | null>(null);

  // Fetch premium status whenever the session changes (logged in/out)
  useEffect(() => {
    if (!session) {
      setHasPremium(null);
      return;
    }

    (async () => {
      try {
        const premium = await SubscriptionService.hasPremiumAccess();
        navLogger.info('Premium access evaluated', { premium });
        setHasPremium(premium);
      } catch (err) {
        navLogger.error('Failed to evaluate premium access', { error: String(err) });
        // Fail-safe: treat as no premium to block core content until resolved
        setHasPremium(false);
      }
    })();
  }, [session, segments]);

  /**
   * Deep link handler - logs all incoming URLs for debugging
   * This helps track OAuth redirects and other deep links
   */
  useEffect(() => {
    // Get the initial URL if app was opened from a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        navLogger.info('App opened with initial URL', { url });
      }
    });

    // Listen for incoming deep links while app is running
    const subscription = Linking.addEventListener('url', (event) => {
      navLogger.info('Deep link received', { url: event.url });
      
      // Check if this is an OAuth success redirect containing tokens/code
      if (event.url.includes('/success')) {
        navLogger.info('OAuth success deep link detected', { url: event.url });

        if (event.url.includes('access_token') || event.url.includes('code=')) {
          const redirectUrl = makeRedirectUri({ scheme: 'archie', path: 'success' });
          finishOAuth(event.url, redirectUrl)
            .then(() => navLogger.info('Session established from deep link'))
            .catch((err) => navLogger.warn('finishOAuth failed in RootLayout', { error: String(err) }));
        }
      }
    });

    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';
    const inTabsGroup = segments[0] === '(tabs)';
    const inReframeScreen = segments[0] === 'reframe';
    const inGuideScreen = segments[0] === 'guide';
    const inEntryDetailScreen = segments[0] === 'entry-detail';
    const onSuccessScreen = segments.join('/').includes('success'); // Check if we're on the success screen

    navLogger.info('Navigation state evaluation', {
      hasSession: !!session,
      onboardingCompleted,
      currentGroup: segments[0],
      currentScreen: segments[1],
      inAuthGroup,
      inOnboardingGroup,
      inTabsGroup,
      inReframeScreen,
      inGuideScreen,
      inEntryDetailScreen,
      onSuccessScreen,
      fullSegments: segments
    });

    if (!session) {
      // User is not authenticated - redirect to auth
      if (!inAuthGroup) {
        navLogger.info('Redirecting to auth - no session');
        router.replace('/(auth)');
      }
    } else if (session && onSuccessScreen) {
      // IMPORTANT: Don't redirect away from success screen during OAuth flow
      // Let the success screen handle its own navigation after verification
      navLogger.info('User on success screen with session - allowing success screen to handle navigation');
      return;
    } else if (session && onboardingCompleted === false) {
      // User is authenticated but hasn't completed onboarding
      // Determine which onboarding step they should be on
      if (!inOnboardingGroup && !onSuccessScreen) {
        navLogger.info('Redirecting to appropriate onboarding step - session exists but onboarding incomplete');
        
        // Use UserService to determine the correct onboarding step
        UserService.getNextOnboardingStep()
          .then((nextStep) => {
            navLogger.info('Redirecting to determined onboarding step', { nextStep });
            router.replace(nextStep as any);
          })
          .catch((error) => {
            navLogger.error('Failed to determine onboarding step, defaulting to name', { error });
            // Fallback to name step if there's an error
            router.replace('/(onboarding)/name');
          });
      }
    } else if (session && onboardingCompleted === true) {
      // Subscription gating logic
      const inPaywallFlow = segments[0] === 'trial-intro' || segments[0] === 'paywall' || segments[0] === 'all-plans';

      // Wait until premium status has been determined
      if (hasPremium === null) {
        navLogger.debug('Awaiting premium status evaluation...');
        return;
      }

      if (!hasPremium) {
        // No premium – redirect user to trial intro (hard paywall)
        if (!inPaywallFlow) {
          navLogger.info('No active subscription detected – redirecting to paywall');
          router.replace('/trial-intro' as any);
        }
      } else {
        // Premium active – ensure user is within the main app
        if (!inTabsGroup && !inReframeScreen && !inGuideScreen && !inEntryDetailScreen && !onSuccessScreen && !inPaywallFlow) {
          navLogger.info('Premium active – redirecting to main tabs');
          router.replace('/(tabs)');
        }
        // If user is lingering on a paywall-related screen post-purchase, push them to main app
        if (inPaywallFlow) {
          navLogger.info('Premium active but user in paywall flow – navigating to main tabs');
          router.replace('/(tabs)');
        }
      }
    }
    // If onboardingCompleted is null, we're still checking - don't redirect yet

  }, [session, loading, onboardingCompleted, segments, hasPremium]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
      <Stack.Screen name="reframe" options={{ headerShown: false }} />
      <Stack.Screen name="paywall" options={{ headerShown: false }} />
      <Stack.Screen name="entry-detail" options={{ headerShown: false }} />
      <Stack.Screen name="notification-settings" options={{ headerShown: false }} />
      <Stack.Screen name="personalizing" options={{ headerShown: false }} />
      <Stack.Screen name="trial-intro" options={{ headerShown: false }} />
      <Stack.Screen name="all-plans" options={{ headerShown: false }} />
      <Stack.Screen name="reminder-setup" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}


export default function RootLayout() {
  // ALL HOOKS MUST BE CALLED AT THE TOP LEVEL (Rules of Hooks)
  useFrameworkReady();

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  /**
   * PostHog analytics configuration - Following official documentation pattern
   * Uses environment variables for secure configuration
   */
  const postHogApiKey = Constants.expoConfig?.extra?.postHogApiKey;
  const postHogHost = Constants.expoConfig?.extra?.postHogHost || 'https://us.i.posthog.com';
  
  // Check if we have a valid PostHog API key (starts with 'phc_')
  const hasValidApiKey = postHogApiKey && 
    postHogApiKey !== '$EXPO_PUBLIC_POSTHOG_API_KEY' && 
    postHogApiKey.startsWith('phc_');

  useEffect(() => {
    const initializeApp = async () => {
      try {
        navLogger.info('Initializing application dependencies...');
        
        /**
         * Initialize RevenueCat SDK
         * Using hardcoded API keys as requested for direct testing.
         * NOTE: For production, it is strongly recommended to switch back to 
         * using environment variables to manage different keys for sandbox and live environments.
         */
        const iosApiKey = "appl_xMCnvnfjISfQSJNlCEMyzKSNpdK";
        const androidApiKey = "your_revenuecat_android_api_key_here"; // Replace with your actual key

        // Log the keys (partially) to confirm they are being loaded correctly
        navLogger.info('RevenueCat environment check', {
          platform: Platform.OS,
          hasIosKey: !!iosApiKey,
          hasAndroidKey: !!androidApiKey,
          iosKeyPrefix: iosApiKey?.slice(0, 5) + '...',
          androidKeyPrefix: androidApiKey?.slice(0, 5) + '...',
        });

        if ((Platform.OS === 'ios' && iosApiKey) || (Platform.OS === 'android' && androidApiKey)) {
          navLogger.info('Initializing RevenueCat with available keys');
          // Your service is designed to take both, which is great.
          await SubscriptionService.initialize(iosApiKey || '', androidApiKey || '');
          navLogger.info('RevenueCat initialized successfully');
        } else {
          navLogger.error('Missing required RevenueCat API key for the current platform.', { platform: Platform.OS });
        }

      } catch (error) {
        navLogger.error('Failed during app initialization', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      } finally {
        // This now runs after all other initialization logic is complete
        navLogger.debug('Initialization complete, hiding splash screen.');
        SplashScreen.hideAsync();
      }
    };

    // Only run the initialization logic after fonts are ready
    if (fontsLoaded || fontError) {
      initializeApp();
    }
  }, [fontsLoaded, fontError]); // Re-run if font status changes

  // Log PostHog configuration status
  useEffect(() => {
    const isDisabled = __DEV__ || !hasValidApiKey;
    
    if (hasValidApiKey && !__DEV__) {
      navLogger.info('PostHog analytics enabled', { 
        host: postHogHost,
        keyPrefix: postHogApiKey?.substring(0, 8) + '...'
      });
    } else {
      navLogger.info('PostHog analytics disabled', {
        reason: __DEV__ ? 'development_mode' : 'missing_api_key',
        apiKeyProvided: !!postHogApiKey,
        isDevelopment: __DEV__
      });
    }
  }, [postHogApiKey, postHogHost, hasValidApiKey]);

  // Early return AFTER all hooks are called
  if (!fontsLoaded && !fontError) {
    return null;
  }
  
  return (
    <PostHogProvider 
      apiKey={hasValidApiKey ? postHogApiKey : 'phc_dev_placeholder_key_12345'}
      options={{
        host: postHogHost,
        // Disable PostHog in development OR when no valid API key is provided
        disabled: __DEV__ || !hasValidApiKey,
      }}
    >
      <AuthProvider>
        <RootLayoutNav />
        <StatusBar style="light" />
      </AuthProvider>
    </PostHogProvider>
  );
}