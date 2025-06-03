/**
 * Test AI service integration
 * This file tests the updated AI service functionality
 */

import { GeminiClient } from './ai/gemini-client';

async function testAIIntegration() {
  console.log('🧪 Testing AI service integration...\n');

  // Test configuration loading
  try {
    const client = new GeminiClient();
    console.log('✅ GeminiClient initialized successfully');
    console.log('📊 Config:', client.getConfig());
    console.log('📈 Rate limit status:', client.getRateLimitStatus());
  } catch (error) {
    console.error('❌ Failed to initialize GeminiClient:', error);
    return;
  }

  // Test connection (requires valid API key)
  if (
    process.env.GOOGLE_GENERATIVE_AI_API_KEY &&
    process.env.GOOGLE_GENERATIVE_AI_API_KEY !== 'test-api-key'
  ) {
    try {
      const client = new GeminiClient();
      console.log('\n🔗 Testing connection...');
      const connectionResult = await client.testConnection();

      if (connectionResult.success) {
        console.log('✅ Connection test successful');
        console.log('🤖 Model:', connectionResult.model);

        // Test text generation
        console.log('\n📝 Testing text generation...');
        const textResult = await client.generateText(
          'Hello, please respond with a short greeting.'
        );

        if (textResult.success) {
          console.log('✅ Text generation successful');
          console.log('💬 Response:', textResult.data);
          console.log('📊 Usage:', textResult.usage);
        } else {
          console.log('❌ Text generation failed:', textResult.error);
        }

        // Test object generation
        console.log('\n🔧 Testing object generation...');
        const schema = {
          type: 'object',
          properties: {
            greeting: { type: 'string' },
            language: { type: 'string' },
            timestamp: { type: 'string' },
          },
          required: ['greeting', 'language', 'timestamp'],
        };

        const objectResult = await client.generateObject(
          'Generate a greeting object with greeting text, language, and current timestamp',
          schema,
          'A greeting object with structured data'
        );

        if (objectResult.success) {
          console.log('✅ Object generation successful');
          console.log('🎯 Generated object:', objectResult.data);
          console.log('📊 Usage:', objectResult.usage);
        } else {
          console.log('❌ Object generation failed:', objectResult.error);
        }
      } else {
        console.log('❌ Connection test failed:', connectionResult.error);
      }
    } catch (error) {
      console.error('❌ AI integration test error:', error);
    }
  } else {
    console.log('\n⚠️  Skipping live API tests (no valid API key)');
    console.log('   Set GOOGLE_GENERATIVE_AI_API_KEY to test live functionality');
  }

  console.log('\n🎉 AI integration test completed!');
}

// Run the test
testAIIntegration().catch(console.error);
