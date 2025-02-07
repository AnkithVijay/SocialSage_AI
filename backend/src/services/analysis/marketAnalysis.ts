import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { bedrockClient, MODELS, PROMPTS, formatPrompt } from '../../config/aws';
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

interface MarketData {
  price: number;
  volume: number;
  timestamp: number;
  // Add other relevant market data fields
}

interface SocialData {
  posts: Array<{
    content: string;
    sentiment: number;
    platform: string;
  }>;
  overallSentiment: number;
  // Add other relevant social data fields
}

interface AnalysisResult {
  marketTrends: string[];
  sentimentImpact: string;
  opportunities: string[];
  risks: string[];
  recommendedActions: string[];
  timestamp: FirebaseFirestore.Timestamp;
}

export async function analyzeMarketData(
  userId: string,
  marketData: MarketData,
  socialData: SocialData
): Promise<AnalysisResult> {
  try {
    // Format the data for the prompt
    const formattedMarketData = JSON.stringify(marketData, null, 2);
    const formattedSocialData = JSON.stringify(socialData, null, 2);

    // Prepare the prompt
    const prompt = formatPrompt(PROMPTS.MARKET_ANALYSIS, {
      marketData: formattedMarketData,
      socialData: formattedSocialData,
    });

    // Call Bedrock
    const response = await bedrockClient.send(
      new InvokeModelCommand({
        modelId: MODELS.ANALYSIS,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          prompt,
          max_tokens: 2048,
          temperature: 0.7,
          top_p: 0.9,
        }),
      })
    );

    // Parse the response
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const analysis = responseBody.completion;

    // Parse the analysis into structured data
    const result: AnalysisResult = {
      marketTrends: extractSection(analysis, 'Market Trends'),
      sentimentImpact: extractSection(analysis, 'Social Sentiment Impact').join('\n'),
      opportunities: extractSection(analysis, 'Key Opportunities'),
      risks: extractSection(analysis, 'Potential Risks'),
      recommendedActions: extractSection(analysis, 'Recommended Actions'),
      timestamp: admin.firestore.Timestamp.now(),
    };

    // Store the analysis in Firestore
    await db.collection('users').doc(userId).collection('analyses').add(result);

    return result;
  } catch (error) {
    functions.logger.error('Error in market analysis:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to analyze market data'
    );
  }
}

// Helper function to extract sections from the analysis text
function extractSection(text: string, sectionTitle: string): string[] {
  const sectionRegex = new RegExp(
    `${sectionTitle}:?\\s*([\\s\\S]*?)(?=\\n\\s*\\d+\\.\\s|$)`,
    'i'
  );
  const match = text.match(sectionRegex);
  if (!match) return [];

  return match[1]
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.match(/^\d+\./));
} 