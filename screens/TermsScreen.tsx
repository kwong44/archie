import React from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { X as XIcon } from 'lucide-react-native';
import { createContextLogger } from '@/lib/logger';

// ---------------------------------------------------------------------------
// Constants & Logger
// ---------------------------------------------------------------------------
const log = createContextLogger('TermsScreen');

const TERMS_URL =
  'https://raw.githubusercontent.com/kwong44/Archie-support/main/Terms-Of-Service.md';

const TEXT_PRIMARY = '#F5F5F0';
const TEXT_SECONDARY = '#9CA3AF';
const PRIMARY_BACKGROUND = '#121820';

/**
 * TermsScreen renders the hosted Terms of Service inside a WebView.
 * Loading and error states are handled with a simple indicator and logs.
 */
export default function TermsScreen() {
  const router = useRouter();

  const handleClose = () => {
    log.info('TermsScreen close button pressed');
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel="Close terms"
          accessibilityRole="button"
        >
          <XIcon color="#9CA3AF" size={28} />
        </TouchableOpacity>

        <Text style={styles.title}>Terms of Service</Text>
        <Text style={styles.subtitle}>Legal stuff, clear and transparent.</Text>
      </View>

      {/* Content */}
      <View style={styles.webviewContainer}>
        <WebView
          source={{ uri: TERMS_URL }}
          originWhitelist={["*"]}
          style={styles.webview}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#FFC300" />
              <Text style={styles.loadingText}>Loading…</Text>
            </View>
          )}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            log.error('WebView error loading terms of service', {
              url: TERMS_URL,
              message: nativeEvent.description,
            });
          }}
        />
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PRIMARY_BACKGROUND,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  title: {
    color: TEXT_PRIMARY,
    fontFamily: 'Inter-Bold',
    fontSize: 32,
    textAlign: 'center',
    marginTop: 16,
  },
  subtitle: {
    color: TEXT_SECONDARY,
    marginTop: 8,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
  },
  webviewContainer: {
    flex: 1,
    borderTopWidth: 1,
    borderColor: '#374151',
  },
  webview: {
    backgroundColor: PRIMARY_BACKGROUND,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: TEXT_SECONDARY,
    fontFamily: 'Inter-Regular',
    marginTop: 8,
  },
}); 