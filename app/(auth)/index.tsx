import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, Sparkles } from 'lucide-react-native';

/**
 * OnboardingScreen Component
 * The main landing page that introduces users to The Architect app
 * Follows the dark theme design system with proper typography and spacing
 */
export default function OnboardingScreen() {
  const router = useRouter();
  const { session } = useAuth();

  // Redirect authenticated users
  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  const handleGetStarted = () => {
    console.log('🚀 User clicked Get Started - navigating to login');
    router.push('/(auth)/login' as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Sparkles color="#FFC300" size={48} strokeWidth={1.5} />
          </View>
          
          <Text style={styles.title}>Archie</Text>
          <Text style={styles.subtitle}>
            Become the architect of your reality by transforming your language
          </Text>
        </View>

        {/* Features Section */}
        <View style={styles.featuresContainer}>
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>🎙️</Text>
            <Text style={styles.featureText}>Voice-powered journaling</Text>
          </View>
          
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>✨</Text>
            <Text style={styles.featureText}>AI-guided reframing</Text>
          </View>
          
          <View style={styles.feature}>
            <Text style={styles.featureIcon}>📈</Text>
            <Text style={styles.featureText}>Track your transformation</Text>
          </View>
        </View>

        {/* CTA Section */}
        <View style={styles.ctaContainer}>
          <TouchableOpacity 
            style={styles.getStartedButton} 
            onPress={handleGetStarted}
            activeOpacity={0.8}
          >
            <Text style={styles.getStartedButtonText}>Get Started</Text>
            <ArrowRight color="#121820" size={20} strokeWidth={2} />
          </TouchableOpacity>
          
          <Text style={styles.helpText}>
            Join thousands transforming their mindset daily
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121820', // Primary background
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1F2937', // Component background
    borderWidth: 1,
    borderColor: '#374151', // Border color
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#F5F5F0', // Primary text
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF', // Secondary text
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 20,
  },
  featuresContainer: {
    gap: 24,
    marginVertical: 40,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937', // Component background
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#374151', // Border color
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  featureText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#F5F5F0', // Primary text
    flex: 1,
  },
  ctaContainer: {
    alignItems: 'center',
    gap: 16,
  },
  getStartedButton: {
    backgroundColor: '#FFC300', // Primary accent
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    gap: 8,
  },
  getStartedButtonText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#121820', // Primary background for contrast
  },
  helpText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280', // Tertiary text
    textAlign: 'center',
  },
}); 