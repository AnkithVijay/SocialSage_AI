import * as functions from 'firebase-functions';
import { analyzeMarketData } from '../../../src/services/analysis/marketAnalysis';

export const getMarketAnalysis = functions.https.onCall(async (data, context) => {
  // Check authentication
  if (!context?.auth?.uid) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }

  try {
    const { marketData, socialData } = data;

    // Validate input data
    if (!marketData || !socialData) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Market data and social data are required'
      );
    }

    // Call the analysis service
    const analysis = await analyzeMarketData(
      context.auth.uid,
      marketData,
      socialData
    );

    return analysis;
  } catch (error) {
    functions.logger.error('Error in getMarketAnalysis:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to generate market analysis'
    );
  }
}); 