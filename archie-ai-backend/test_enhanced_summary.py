#!/usr/bin/env python3
"""
Test script for enhanced AI summary generation with user principles
Tests the Gemini prompt improvements we just implemented
"""
import os
import asyncio
import httpx
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def test_enhanced_summary():
    """Test the enhanced AI summary with user principles"""
    
    # Test data that mimics what the frontend would send
    test_data = {
        "original_text": "I'm feeling really anxious about this presentation tomorrow. I'm worried I'm going to mess up and everyone will think I'm incompetent.",
        "reframed_text": "I'm feeling excited about this presentation opportunity tomorrow. I'm prepared to share my expertise and everyone will see my capabilities.", 
        "transformation_count": 3,
        "user_principles": [
            "I am the author of my own story.",
            "I choose courage over comfort.", 
            "My focus determines my reality."
        ]
    }
    
    try:
        print("🧪 Testing enhanced AI summary generation...")
        print(f"📝 Original text: {test_data['original_text'][:50]}...")
        print(f"✨ Reframed text: {test_data['reframed_text'][:50]}...")
        print(f"🎯 Principles: {', '.join(test_data['user_principles'])}")
        print(f"🔄 Transformations: {test_data['transformation_count']}")
        print()
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://localhost:8000/api/ai/summarize",
                json=test_data,
                headers={
                    "Authorization": "Bearer dummy_token_for_testing",
                    "Content-Type": "application/json"
                },
                timeout=30.0
            )
            
            if response.status_code == 200:
                result = response.json()
                print("✅ Enhanced AI Summary Generated Successfully!")
                print(f"📖 Summary: {result['summary']}")
                print(f"🎨 Tone: {result['tone']}")
                print(f"⏱️  Processing time: {result['processing_time_ms']}ms")
                print()
                print("🎉 The enhanced prompt with user principles is working!")
                
            else:
                print(f"❌ API Error: {response.status_code}")
                print(f"Response: {response.text}")
                
    except Exception as e:
        print(f"❌ Test failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_enhanced_summary()) 