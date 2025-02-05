import * as dotenv from 'dotenv';
import * as admin from 'firebase-admin';
import { analyzeMarketData } from '../../../src/services/analysis/marketAnalysis';

// Load environment variables
dotenv.config();

// Initialize Firebase Admin for testing
admin.initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

// Sample test data
const testMarketData = {
  price: 45000.50,
  volume: 1250000,
  timestamp: Date.now(),
  symbol: "BTC/USD",
  change24h: 2.5,
  marketCap: 850000000000
};

const testSocialData = {
  posts: [
    {
      content: "Bitcoin looking very bullish today! Major institutional adoption news coming. #BTC",
      sentiment: 0.8,
      platform: "twitter"
    },
    {
      content: "Market showing strong support at current levels. Technical analysis suggests upward trend.",
      sentiment: 0.6,
      platform: "reddit"
    },
    {
      content: "Concerned about regulatory news affecting crypto markets. Proceed with caution.",
      sentiment: -0.3,
      platform: "twitter"
    }
  ],
  overallSentiment: 0.37
};

async function runTest() {
  try {
    console.log('Starting market analysis test...');
    console.log('\nTest Data:', {
      market: testMarketData,
      social: testSocialData
    });

    const result = await analyzeMarketData(
      'test-user-id',
      testMarketData,
      testSocialData
    );

    console.log('\nAnalysis Result:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Test failed:', error);
    console.error('Error details:', error instanceof Error ? error.message : error);
  }
}

// Run the test
runTest(); 