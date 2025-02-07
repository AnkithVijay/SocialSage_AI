import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { fromNodeProviderChain } from '@aws-sdk/credential-provider-node';

// AWS Region where Bedrock is available
const REGION = process.env.AWS_REGION || 'us-east-1';

// Initialize the Bedrock client
export const bedrockClient = new BedrockRuntimeClient({
  region: REGION,
  credentials: fromNodeProviderChain(),
});

// Model IDs for different tasks
export const MODELS = {
  // Claude 3 Sonnet for main analysis
  ANALYSIS: 'anthropic.claude-3-sonnet-20240229-v1:0',
  // Claude 2.1 for lighter tasks
  SENTIMENT: 'anthropic.claude-v2:1',
} as const;

// Prompt templates
export const PROMPTS = {
  MARKET_ANALYSIS: `You are an expert financial analyst. Analyze the following market data and social sentiment:
Market Data: {{marketData}}
Social Sentiment: {{socialData}}

Provide a comprehensive analysis including:
1. Market Trends
2. Social Sentiment Impact
3. Key Opportunities
4. Potential Risks
5. Recommended Actions

Format your response in a clear, structured manner.`,

  SENTIMENT_ANALYSIS: `Analyze the sentiment of the following social media content:
Content: {{content}}

Provide:
1. Overall sentiment score (-1 to 1)
2. Key themes
3. Notable mentions
4. Confidence level

Keep the response concise and focused on actionable insights.`,
} as const;

// Helper function to format prompts with data
export function formatPrompt(template: string, data: Record<string, string>): string {
  return Object.entries(data).reduce(
    (prompt, [key, value]) => prompt.replace(`{{${key}}}`, value),
    template
  );
} 