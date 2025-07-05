/**
 * finishOAuth.ts
 * -------------------------------------------------------------
 * Helper utility to complete an OAuth flow that was initiated
 * with `skipBrowserRedirect: true`.
 *
 * 1. Parses the `result.url` returned by `WebBrowser.openAuthSessionAsync`.
 * 2. Extracts the `code` (or `provider_token` for Apple) from query params.
 * 3. Calls `supabase.auth.exchangeCodeForSession` so the client stores
 *    the access & refresh tokens locally.
 *
 * By isolating this into a single helper we avoid duplicating logic across
 * login & signup screens and we have a single place for future providers.
 */

import { supabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';
import { logger } from '@/lib/logger';
import { URL } from 'react-native-url-polyfill';

/**
 * Completes the Supabase OAuth flow.
 *
 * @param resultUrl   The deep-link URL returned by `openAuthSessionAsync`.
 * @param redirectUrl The same redirect URL that was passed to `signInWithOAuth`.
 * @throws Error      When the auth code is missing or the exchange fails.
 */
export async function finishOAuth(resultUrl: string, _redirectUrl: string): Promise<void> {
  logger.info('finishOAuth invoked', { resultUrl, redirectUrl: _redirectUrl });

  // 1️⃣ Extract query-params from the returned deep-link
  const parsed = Linking.parse(resultUrl ?? '');
  const queryParams = (parsed?.queryParams ?? {}) as Record<string, string>;

  const authCode = queryParams['code'];
  const providerToken = queryParams['provider_token']; // Apple specific

  // Additionally, Supabase mobile auth often returns tokens directly in the
  // fragment (#access_token=…) instead of query params. We'll parse them here.
  let accessToken: string | undefined;
  let refreshToken: string | undefined;

  try {
    const urlObj = new URL(resultUrl);
    if (urlObj.hash) {
      const hashParams = new URLSearchParams(urlObj.hash.replace('#', ''));
      accessToken = hashParams.get('access_token') ?? undefined;
      refreshToken = hashParams.get('refresh_token') ?? undefined;
    }
  } catch (hashParseError) {
    logger.warn('Failed to parse hash params', { error: String(hashParseError) });
  }

  if (!authCode && !providerToken && !(accessToken && refreshToken)) {
    const msg = 'No auth code, provider token, or access/refresh token found in callback URL';
    logger.error(msg, { resultUrl });
    throw new Error(msg);
  }

  // 2️⃣ Complete auth depending on what we received
  if (authCode || providerToken) {
    try {
      const codeToExchange = authCode ?? providerToken as string;
      const { data, error } = await supabase.auth.exchangeCodeForSession(codeToExchange);

      if (error) throw error;

      logger.info('OAuth session established via code exchange', {
        userId: data.user?.id,
        expiresIn: data.session?.expires_in,
      });
      return;
    } catch (error) {
      logger.error('exchangeCodeForSession failed', { error: String(error) });
      throw error;
    }
  }

  // -- Fallback: implicit flow with access_token & refresh_token
  if (accessToken && refreshToken) {
    try {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) throw error;

      logger.info('OAuth session established via setSession', {
        userId: data.user?.id,
        expiresIn: data.session?.expires_in,
      });
    } catch (error) {
      logger.error('setSession failed', { error: String(error) });
      throw error;
    }
  }
} 