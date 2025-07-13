/**
 * Test script for analyze-entry Edge Function
 * Tests the new AI analysis functionality for journal entries
 * 
 * Run with: node test-analyze-entry.js
 */

const fetch = require('node-fetch');

// Configuration
const SUPABASE_URL = 'https://khyzsnalrhibvbxdabqq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtoeXpzbmFscmhpYnZieGRhYnFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ0NTgxMjQsImV4cCI6MjA0MDAzNDEyNH0.nP4KXVVWVJJyJbYcPEYdRfLCXKqRNJCG3HzJWs3vWI8';

// Test data
const testUserId = 'test-user-123';
const testSessionId = 'test-session-456';

/**
 * Test the analyze-entry endpoint
 */
async function testAnalyzeEntry() {
  console.log('🧪 Testing analyze-entry Edge Function...\n');
  
  try {
    // Test 1: Basic connectivity
    console.log('1️⃣ Testing basic connectivity...');
    const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-entry`, {
      method: 'OPTIONS',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      console.log('✅ Edge Function is accessible\n');
    } else {
      console.log('❌ Edge Function not accessible:', response.status, response.statusText);
      return;
    }
    
    // Test 2: Function deployment check
    console.log('2️⃣ Testing function deployment...');
    const deployTest = await fetch(`${SUPABASE_URL}/functions/v1/analyze-entry`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        journal_session_id: testSessionId
      })
    });
    
    console.log('Status:', deployTest.status);
    console.log('Status Text:', deployTest.statusText);
    
    if (deployTest.status === 401) {
      console.log('✅ Function is deployed and properly authenticating');
    } else if (deployTest.status === 404) {
      console.log('❌ Function not found - needs deployment');
    } else {
      console.log('🔍 Function responded with status:', deployTest.status);
    }
    
    // Test 3: Environment variables check
    console.log('\n3️⃣ Environment variables needed:');
    console.log('- SUPABASE_URL: Should be set automatically');
    console.log('- SUPABASE_ANON_KEY: Should be set automatically');
    console.log('- GEMINI_API_KEY: ⚠️ NEEDS TO BE SET IN SUPABASE DASHBOARD');
    console.log('- ELEVENLABS_API_KEY: ⚠️ NEEDS TO BE SET IN SUPABASE DASHBOARD');
    
    console.log('\n🔧 To set environment variables:');
    console.log('1. Go to Supabase Dashboard → Project Settings');
    console.log('2. Navigate to Edge Functions → Environment Variables');
    console.log('3. Add both GEMINI_API_KEY and ELEVENLABS_API_KEY');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

/**
 * Test the complete AI backend health
 */
async function testCompleteBackend() {
  console.log('\n🏥 Testing complete AI backend health...\n');
  
  const functions = [
    'transcribe-audio',
    'generate-summary', 
    'analyze-entry'
  ];
  
  for (const func of functions) {
    try {
      console.log(`Testing ${func}...`);
      const response = await fetch(`${SUPABASE_URL}/functions/v1/${func}`, {
        method: 'OPTIONS',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      
      if (response.ok) {
        console.log(`✅ ${func} is active`);
      } else {
        console.log(`❌ ${func} error: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${func} failed: ${error.message}`);
    }
  }
}

/**
 * Show deployment instructions
 */
function showDeploymentInstructions() {
  console.log('\n📋 DEPLOYMENT INSTRUCTIONS:\n');
  console.log('1. Deploy the Edge Function:');
  console.log('   supabase functions deploy analyze-entry');
  console.log('');
  console.log('2. Set environment variables in Supabase Dashboard:');
  console.log('   - GEMINI_API_KEY=your_gemini_key');
  console.log('   - ELEVENLABS_API_KEY=your_elevenlabs_key');
  console.log('');
  console.log('3. Test the frontend by:');
  console.log('   - Recording a journal entry in the Workshop');
  console.log('   - Going to the Entries tab');
  console.log('   - Tapping "Analyze" on any entry');
  console.log('');
  console.log('4. Monitor logs in Supabase Dashboard:');
  console.log('   - Go to Edge Functions → Logs');
  console.log('   - Watch for any errors during analysis');
}

// Run tests
async function runTests() {
  await testAnalyzeEntry();
  await testCompleteBackend();
  showDeploymentInstructions();
}

runTests().catch(console.error); 