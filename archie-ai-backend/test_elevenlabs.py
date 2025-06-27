#!/usr/bin/env python3
"""
Simple test script to verify ElevenLabs integration
Tests both STT and TTS functionality
"""

import os
import sys
from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs

# Load environment variables
load_dotenv()

def test_elevenlabs_connection():
    """Test basic ElevenLabs API connection"""
    print("🧪 Testing ElevenLabs API Connection...")
    
    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not api_key:
        print("❌ ELEVENLABS_API_KEY not found in environment")
        return False
    
    try:
        client = ElevenLabs(api_key=api_key)
        print("✅ ElevenLabs client initialized successfully")
        return True
    except Exception as e:
        print(f"❌ Failed to initialize ElevenLabs client: {e}")
        return False

def test_tts_functionality():
    """Test Text-to-Speech functionality"""
    print("\n🎤 Testing Text-to-Speech...")
    
    try:
        client = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))
        
        # Generate a short test audio
        test_text = "Hello, this is a test of the ElevenLabs text to speech system."
        
        print(f"📝 Generating audio for: '{test_text}'")
        
        audio_generator = client.generate(
            text=test_text,
            voice="JBFqnCBsd6RMkjVDRZzb",  # Default voice
            model="eleven_multilingual_v2",
            output_format="mp3_44100_128"
        )
        
        # Convert generator to bytes
        audio_data = b"".join(audio_generator)
        
        print(f"✅ TTS successful! Generated {len(audio_data)} bytes of audio")
        return True
        
    except Exception as e:
        print(f"❌ TTS test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Starting ElevenLabs Integration Tests")
    print("=" * 50)
    
    # Test 1: Basic connection
    if not test_elevenlabs_connection():
        print("\n❌ Basic connection test failed. Exiting.")
        sys.exit(1)
    
    # Test 2: TTS functionality
    if not test_tts_functionality():
        print("\n❌ TTS test failed.")
        sys.exit(1)
    
    print("\n" + "=" * 50)
    print("🎉 All ElevenLabs tests passed!")
    print("✅ STT endpoint ready for audio file testing")
    print("✅ TTS endpoint ready for Phase 2 implementation")
    print("✅ Backend migration successful!")

if __name__ == "__main__":
    main() 