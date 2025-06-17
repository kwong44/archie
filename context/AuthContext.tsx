import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

// Define the shape of the context
interface AuthContextType {
  session: Session | null;
  loading: boolean;
  onboardingCompleted: boolean | null;
  checkOnboardingStatus: () => Promise<void>;
}

// Create the authentication context
const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
  onboardingCompleted: null,
  checkOnboardingStatus: async () => {},
});

// Custom hook to use the AuthContext
export const useAuth = () => {
  return useContext(AuthContext);
};

// AuthProvider component to wrap the application
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  /**
   * Checks if the current user has completed the onboarding process
   * Queries the user_profiles table for onboarding_completed status
   */
  const checkOnboardingStatus = async () => {
    if (!session?.user) {
      setOnboardingCompleted(null);
      return;
    }

    try {
      console.log('🔍 Checking onboarding status for user:', session.user.id);
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('onboarding_completed')
        .eq('user_id', session.user.id)
        .single();

      if (error) {
        console.error('❌ Failed to check onboarding status:', error);
        // If the profile doesn't exist, onboarding is not completed
        setOnboardingCompleted(false);
        return;
      }

      const completed = data?.onboarding_completed || false;
      console.log('✅ Onboarding status:', completed ? 'completed' : 'pending');
      setOnboardingCompleted(completed);

    } catch (error) {
      console.error('❌ Error checking onboarding status:', error);
      setOnboardingCompleted(false);
    }
  };

  useEffect(() => {
    // Fetch the initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for changes in authentication state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session) {
          // When user signs in, check their onboarding status
          checkOnboardingStatus();
        } else {
          // When user signs out, reset onboarding status
          setOnboardingCompleted(null);
        }
      }
    );

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Check onboarding status when session changes
  useEffect(() => {
    if (session) {
      checkOnboardingStatus();
    }
  }, [session]);

  const value = {
    session,
    loading,
    onboardingCompleted,
    checkOnboardingStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}; 