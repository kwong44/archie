import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { createContextLogger } from '../lib/logger';

// Create a context-specific logger for authentication workflows
const authLogger = createContextLogger('AuthContext');

// Define the shape of the context
interface AuthContextType {
  session: Session | null;
  loading: boolean;
  onboardingCompleted: boolean | null;
  checkOnboardingStatus: () => Promise<void>;
  clearSession: () => Promise<void>;
}

// Create the authentication context
const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
  onboardingCompleted: null,
  checkOnboardingStatus: async () => {},
  clearSession: async () => {},
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
   * Handles cases where session exists but user record doesn't (orphaned session)
   */
  const checkOnboardingStatus = async () => {
    if (!session?.user) {
      authLogger.debug('No session found, setting onboarding status to null');
      setOnboardingCompleted(null);
      return;
    }

    try {
      authLogger.info('Checking onboarding status for user', { userId: session.user.id });
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('onboarding_completed')
        .eq('user_id', session.user.id)
        .single();

      if (error) {
        authLogger.error('Failed to check onboarding status', { 
          userId: session.user.id, 
          error: error.message,
          code: error.code 
        });
        
        // Handle the specific case where no rows are returned (PGRST116)
        // This happens when the session exists but the user record was deleted
        if (error.code === 'PGRST116') {
          authLogger.warn('Orphaned session detected (user record not found), signing out user', {
            userId: session.user.id
          });
          
          try {
            await supabase.auth.signOut();
          } catch (signOutError) {
            authLogger.error('Error during sign out process', {
              userId: session.user.id,
              error: signOutError instanceof Error ? signOutError.message : 'Unknown signout error'
            });
            // Manually reset session state if signOut fails
            setSession(null);
          }
          
          setOnboardingCompleted(null);
          return;
        }
        
        // For other errors, default to onboarding not completed
        authLogger.warn('Other database error, defaulting to onboarding incomplete', {
          userId: session.user.id,
          errorCode: error.code
        });
        setOnboardingCompleted(false);
        return;
      }

      const completed = data?.onboarding_completed || false;
      authLogger.info('Onboarding status determined', { 
        userId: session.user.id,
        onboardingCompleted: completed 
      });
      setOnboardingCompleted(completed);

    } catch (error) {
      authLogger.error('Unexpected error checking onboarding status', { 
        userId: session?.user?.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      setOnboardingCompleted(false);
    }
  };

  useEffect(() => {
    // Fetch the initial session
    authLogger.debug('Fetching initial session');
    supabase.auth.getSession().then(({ data: { session } }) => {
      authLogger.info('Initial session fetched', { hasSession: !!session });
      setSession(session);
      setLoading(false);
    });

    // Listen for changes in authentication state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        authLogger.info('Auth state changed', { 
          event, 
          hasSession: !!session,
          userId: session?.user?.id 
        });
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
      authLogger.debug('Cleaning up auth state subscription');
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
    clearSession: async () => {
      authLogger.info('Clearing session manually');
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        authLogger.error('Error during manual sign out', {
          error: signOutError instanceof Error ? signOutError.message : 'Unknown signout error'
        });
        // Manually reset session state if signOut fails
        setSession(null);
        setOnboardingCompleted(null);
      }
    },
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}; 