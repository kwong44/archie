import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mic, MicOff } from 'lucide-react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  interpolate,
  withSequence,
  runOnJS
} from 'react-native-reanimated';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function WorkshopScreen() {
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [userName] = useState('Creator'); // In real app, get from user profile
  const recording = useRef<Audio.Recording | null>(null);
  const router = useRouter();
  
  // Animation values
  const pulseScale = useSharedValue(1);
  const orbOpacity = useSharedValue(1);
  const backgroundOpacity = useSharedValue(1);
  
  // Prompts that change throughout the day
  const prompts = [
    "Ready to build?",
    "What's on your mind?",
    "Let's check in.",
    "Time to create.",
    "How are you feeling?",
    "What needs expression?"
  ];
  const currentPrompt = prompts[Math.floor(Date.now() / (1000 * 60 * 60 * 6)) % prompts.length];

  useEffect(() => {
    // Request audio permissions
    (async () => {
      const { status } = await Audio.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();

    // Start gentle pulsing animation
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 2000 }),
        withTiming(1, { duration: 2000 })
      ),
      -1,
      false
    );
  }, []);

  const startRecording = async () => {
    if (!hasPermission) {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') return;
      setHasPermission(true);
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recording.current = newRecording;
      setIsRecording(true);

      // Animate to recording state
      backgroundOpacity.value = withTiming(0.3, { duration: 500 });
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 800 }),
          withTiming(0.95, { duration: 800 })
        ),
        -1,
        false
      );
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    if (!recording.current) return;

    try {
      await recording.current.stopAndUnloadAsync();
      const uri = recording.current.getURI();
      recording.current = null;
      setIsRecording(false);

      // Animate back to normal state
      backgroundOpacity.value = withTiming(1, { duration: 500 });
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 2000 }),
          withTiming(1, { duration: 2000 })
        ),
        -1,
        false
      );

      // Navigate to reframing screen with the recording
      // In a real app, you'd process the audio here
      setTimeout(() => {
        router.push('/reframe');
      }, 500);
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const orbAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseScale.value }],
      opacity: orbOpacity.value,
    };
  });

  const backgroundAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: backgroundOpacity.value,
    };
  });

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.backgroundElements, backgroundAnimatedStyle]}>
        <Text style={styles.greeting}>Hello, {userName}.</Text>
        <Text style={styles.prompt}>{currentPrompt}</Text>
      </Animated.View>

      <View style={styles.orbContainer}>
        <Animated.View style={[styles.orb, orbAnimatedStyle]}>
          <TouchableOpacity
            style={styles.orbButton}
            onPress={toggleRecording}
            activeOpacity={0.8}
          >
            {isRecording ? (
              <MicOff color="#121820" size={48} strokeWidth={2} />
            ) : (
              <Mic color="#121820" size={48} strokeWidth={2} />
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {isRecording && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>Listening...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121820',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundElements: {
    position: 'absolute',
    top: height * 0.15,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  greeting: {
    fontSize: 28,
    fontFamily: 'Inter-Regular',
    color: '#F5F5F0',
    marginBottom: 20,
  },
  prompt: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
  },
  orbContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orb: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#FFC300',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFC300',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  orbButton: {
    width: '100%',
    height: '100%',
    borderRadius: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingIndicator: {
    position: 'absolute',
    bottom: 120,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 195, 0, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 195, 0, 0.3)',
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFC300',
    marginRight: 8,
  },
  recordingText: {
    color: '#F5F5F0',
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
});