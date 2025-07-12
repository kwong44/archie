/**
 * Test script to verify Supabase Edge Functions are working properly
 * Tests both transcribe-audio and generate-summary functions
 * 
 * Run with: node test-edge-functions.js
 */

const fs = require('fs');
const path = require('path');

// Your Supabase project URL and anon key
const SUPABASE_URL = 'https://khyzsnalrhibvbxdabqq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoeXpzbmFscmhpYnZieGRhYnFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxMzMwMzQsImV4cCI6MjA2NTcwOTAzNH0.p0ashW-IVA2ehKZFoz8ol1m7UJwOL5Z4NmvwHG8oFLs';

/**
 * Test the transcribe-audio Edge Function
 * This will fail if ELEVENLABS_API_KEY is not set
 */
async function testTranscribeFunction() {
  console.log('🎤 Testing transcribe-audio Edge Function...');
  
  try {
    // Create a minimal FormData with a fake audio file
    const formData = new FormData();
    
    // Use a test audio file if available, otherwise create a minimal blob
    let audioBlob;
    const testAudioPath = path.join(__dirname, 'test-assets', 'test-journal.m4a');
    
    if (fs.existsSync(testAudioPath)) {
      console.log('📁 Using test audio file');
      const audioBuffer = fs.readFileSync(testAudioPath);
      audioBlob = new Blob([audioBuffer], { type: 'audio/m4a' });
    } else {
      console.log('📁 Using minimal test blob');
      // Create a minimal audio blob for testing
      audioBlob = new Blob(['fake audio content'], { type: 'audio/m4a' });
    }
    
    formData.append('audio_file', audioBlob, 'test-audio.m4a');
    formData.append('language_code', 'en-US');
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/transcribe-audio`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: formData,
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Transcribe function working!');
      console.log('📝 Result:', result);
      return true;
    } else {
      console.log('❌ Transcribe function failed:', result);
      
      // Check for specific error messages
      if (result.error === 'service_unavailable') {
        console.log('💡 This likely means ELEVENLABS_API_KEY is not set!');
      }
      
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error testing transcribe function:', error.message);
    return false;
  }
}

/**
 * Test the generate-summary Edge Function  
 * This will fail if GEMINI_API_KEY is not set
 */
async function testSummaryFunction() {
  console.log('\n🤖 Testing generate-summary Edge Function...');
  
  try {
    const testData = {
      original_text: "I can't do this anymore, it's too hard",
      reframed_text: "I choose to approach this differently, I can grow through challenges",
      transformation_count: 2,
      user_principles: ["Growth mindset", "Self-compassion"]
    };
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-summary`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Summary function working!');
      console.log('📝 Result:', result);
      return true;
    } else {
      console.log('❌ Summary function failed:', result);
      
      // Check for specific error messages
      if (result.error === 'service_unavailable') {
        console.log('💡 This likely means GEMINI_API_KEY is not set!');
      }
      
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error testing summary function:', error.message);
    return false;
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚀 Testing Supabase Edge Functions...\n');
  
  // Test both functions
  const transcribeSuccess = await testTranscribeFunction();
  const summarySuccess = await testSummaryFunction();
  
  console.log('\n📊 Test Results:');
  console.log(`🎤 Transcribe: ${transcribeSuccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`🤖 Summary: ${summarySuccess ? '✅ PASS' : '❌ FAIL'}`);
  
  if (transcribeSuccess && summarySuccess) {
    console.log('\n🎉 All tests passed! Your Edge Functions are working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check your environment variables:');
    console.log('   1. Go to Supabase Dashboard → Settings → Edge Functions → Environment Variables');
    console.log('   2. Add ELEVENLABS_API_KEY if transcribe test failed');
    console.log('   3. Add GEMINI_API_KEY if summary test failed');
  }
}

// Check if we're running in Node.js
if (typeof window === 'undefined') {
  // We're in Node.js, import fetch if needed
  if (typeof fetch === 'undefined') {
    console.log('📦 Installing node-fetch...');
    try {
      const fetch = require('node-fetch');
      global.fetch = fetch;
      global.FormData = require('form-data');
      global.Blob = require('node:buffer').Blob;
    } catch (error) {
      console.error('❌ Please install node-fetch: npm install node-fetch form-data');
      process.exit(1);
    }
  }
  
  // Run the tests
  runTests().catch(console.error);
}

module.exports = { testTranscribeFunction, testSummaryFunction }; 