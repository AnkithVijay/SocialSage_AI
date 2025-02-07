import OpenAI from 'openai';
import { Logger } from 'winston';
import { createLogger } from '../utils/logger';

export interface VeniceAnalysis {
  sentiment: number;
  confidence: number;
  reasoning: string[];
  marketCondition: 'bullish' | 'bearish' | 'neutral';
  suggestedActions: string[];
}

export class VeniceAI {
  private logger: Logger;
  private apiKey: string;
  private model: string;
  private client: OpenAI;

  constructor() {
    this.logger = createLogger('VeniceAI');
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.model = 'gpt-4-turbo-preview';
    
    if (!this.apiKey) {
      this.logger.warn('No OpenAI API key found, some features may be limited');
    }

    this.client = new OpenAI({
      apiKey: this.apiKey,
    });
  }

  async init() {
    try {
      this.logger.info('OpenAI client initialized successfully');
    } catch (error) {
      this.logger.error('Error initializing OpenAI client', { error });
    }
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      if (!this.apiKey) {
        throw new Error("API key not configured");
      }

      const response = await this.client.models.list();
      return response.data.map((model: { id: string }) => model.id);
    } catch (error) {
      this.logger.error('Error fetching OpenAI models', { error });
      throw error;
    }
  }

  private async query(prompt: string): Promise<string> {
    try {
      if (!this.apiKey) {
        throw new Error("API key not configured");
      }

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: "You are an AI trained to analyze market sentiment and trading opportunities. Provide detailed analysis with clear reasoning. Always respond in valid JSON format." },
          { role: "user", content: prompt }
        ],
        max_tokens: Number(process.env.OPENAI_MAX_TOKENS) || 500,
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      return completion.choices[0].message.content || '';
    } catch (error) {
      this.logger.error('Error querying OpenAI', { error });
      throw error;
    }
  }

  async analyzeSentimentAndMarket(
    token: string,
    tweets: { text: string; engagement: number }[],
    price?: number,
    volume?: number
  ): Promise<VeniceAnalysis> {
    try {
      const prompt = `
        Analyze the market sentiment and conditions for ${token} based on the following data:
        
        Social Media Sentiment:
        ${tweets.map(t => `- ${t.text} (Engagement: ${t.engagement})`).join('\n')}
        ${price ? `\nCurrent Price: ${price}` : ''}
        ${volume ? `\nTrading Volume: ${volume}` : ''}
        
        Provide a structured analysis in the following JSON format:
        {
          "sentiment": <number between -1 and 1>,
          "confidence": <number between 0 and 1>,
          "reasons": [<array of strings explaining key reasons>],
          "marketCondition": <"bullish" or "bearish" or "neutral">,
          "suggestedActions": [<array of strings with trading suggestions>]
        }
      `;

      const response = await this.query(prompt);
      const analysis = JSON.parse(response);

      return {
        sentiment: analysis.sentiment,
        confidence: analysis.confidence,
        reasoning: analysis.reasons || [],
        marketCondition: analysis.marketCondition,
        suggestedActions: analysis.suggestedActions || []
      };
    } catch (error) {
      this.logger.error('Error analyzing with OpenAI', { error, token });
      // Fallback to basic analysis
      return {
        sentiment: 0,
        confidence: 0.5,
        reasoning: ['Error in AI analysis, using fallback'],
        marketCondition: 'neutral',
        suggestedActions: ['Wait for more data']
      };
    }
  }

  async evaluateStrategy(
    token: string,
    sentiment: number,
    template: string,
    config: any
  ): Promise<{
    shouldExecute: boolean;
    adjustedConfig: any;
    reasoning: string[];
  }> {
    try {
      const prompt = `
        Evaluate the trading strategy for ${token} with the following parameters:
        
        Token: ${token}
        Market Sentiment: ${sentiment}
        Strategy Template: ${template}
        Configuration: ${JSON.stringify(config, null, 2)}
        
        Provide your evaluation in the following JSON format:
        {
          "shouldExecute": <boolean>,
          "adjustedConfig": <modified configuration object>,
          "reasoning": [<array of strings explaining the decision>]
        }
      `;

      const response = await this.query(prompt);
      const result = JSON.parse(response);

      return {
        shouldExecute: result.shouldExecute,
        adjustedConfig: result.adjustedConfig || config,
        reasoning: result.reasoning || []
      };
    } catch (error) {
      this.logger.error('Error evaluating strategy with OpenAI', { error, token });
      return {
        shouldExecute: false,
        adjustedConfig: config,
        reasoning: ['Error in AI evaluation, strategy execution not recommended']
      };
    }
  }
} 