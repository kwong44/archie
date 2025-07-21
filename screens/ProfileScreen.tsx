import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { X as XIcon } from 'lucide-react-native';
import { createContextLogger } from '@/lib/logger';

const log = createContextLogger('ProfileScreen');

const TEXT_PRIMARY = '#F5F5F0';
const TEXT_SECONDARY = '#9CA3AF';
const PRIMARY_BACKGROUND = '#121820';

export default function ProfileScreen() {
  const router = useRouter();

  const handleClose = () => {
    log.info('ProfileScreen close button pressed');
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.innerContainer}>
        <View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Close profile"
            accessibilityRole="button"
          >
            <XIcon color="#9CA3AF" size={28} />
          </TouchableOpacity>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>Manage your personal information.</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.placeholder}>Profile management features are coming soon.</Text>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PRIMARY_BACKGROUND,
  },
  innerContainer: {
    flex: 1,
    paddingHorizontal: 20,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 0,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'transparent',
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
    marginTop: 12,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
      color: TEXT_SECONDARY,
      fontFamily: 'Inter-Regular',
      fontSize: 16,
  },
}); 