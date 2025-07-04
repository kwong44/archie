import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { createContextLogger } from '../lib/logger';
import { SubscriptionService } from '@/services/subscriptionService';
import { PostHogProvider } from 'posthog-react-native';
import Constants from 'expo-constants';

// Create a context-specific logger for navigation workflows
const navLogger = createContextLogger('RootLayout');

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { session, loading, onboardingCompleted } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';
    const inTabsGroup = segments[0] === '(tabs)';
    const inReframeScreen = segments[0] === 'reframe';

    navLogger.info('Navigation state evaluation', {
      hasSession: !!session,
      onboardingCompleted,
      currentGroup: segments[0],
      inAuthGroup,
      inOnboardingGroup,
      inTabsGroup,
      inReframeScreen
    });

    if (!session) {
      // User is not authenticated - redirect to auth
      if (!inAuthGroup) {
        navLogger.info('Redirecting to auth - no session');
        router.replace('/(auth)');
      }
    } else if (session && onboardingCompleted === false) {
      // User is authenticated but hasn't completed onboarding
      if (!inOnboardingGroup) {
        navLogger.info('Redirecting to onboarding - session exists but onboarding incomplete');
        router.replace('/(onboarding)/principles');
      }
    } else if (session && onboardingCompleted === true) {
      // User is authenticated and has completed onboarding
      // Allow access to reframe screen without redirecting
      if (!inTabsGroup && !inReframeScreen) {
        navLogger.info('Redirecting to main app - session exists and onboarding complete');
        router.replace('/(tabs)');
      }
    }
    // If onboardingCompleted is null, we're still checking - don't redirect yet

  }, [session, loading, onboardingCompleted, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
      <Stack.Screen name="reframe" options={{ headerShown: false }} />
      <Stack.Screen name="paywall" options={{ headerShown: false }} />
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

  /**
   * Initialize RevenueCat when the app starts
   * Uses the API key from environment variables
   */
  useEffect(() => {
    const initializeRevenueCat = async () => {
      try {
        const revenueCatApiKey = Constants.expoConfig?.extra?.revenueCatApiKey;
        
        if (revenueCatApiKey) {
          navLogger.info('Initializing RevenueCat');
          await SubscriptionService.initialize(revenueCatApiKey);
          navLogger.info('RevenueCat initialized successfully');
        } else {
          navLogger.warn('RevenueCat API key not found in environment variables');
        }
      } catch (error) {
        navLogger.error('Failed to initialize RevenueCat', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    };

    initializeRevenueCat();
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      navLogger.debug('Fonts loaded, hiding splash screen');
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

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