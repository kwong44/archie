import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '../context/AuthContext';

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

    console.log('🗺️ Navigation state:', {
      hasSession: !!session,
      onboardingCompleted,
      currentGroup: segments[0],
      inAuthGroup,
      inOnboardingGroup,
      inTabsGroup
    });

    if (!session) {
      // User is not authenticated - redirect to auth
      if (!inAuthGroup) {
        console.log('🔄 Redirecting to auth - no session');
        router.replace('/(auth)');
      }
    } else if (session && onboardingCompleted === false) {
      // User is authenticated but hasn't completed onboarding
      if (!inOnboardingGroup) {
        console.log('🔄 Redirecting to onboarding - session exists but onboarding incomplete');
        router.replace('/(onboarding)/principles');
      }
    } else if (session && onboardingCompleted === true) {
      // User is authenticated and has completed onboarding
      if (!inTabsGroup) {
        console.log('🔄 Redirecting to main app - session exists and onboarding complete');
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
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}


export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AuthProvider>
      <RootLayoutNav />
      <StatusBar style="light" />
    </AuthProvider>
  );
}