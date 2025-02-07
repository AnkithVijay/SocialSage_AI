import * as dotenv from 'dotenv';
dotenv.config();

import { Logger } from 'winston';
import { createLogger } from '../utils/logger';
import { VeniceAI, VeniceAnalysis } from './venice-ai';

export interface TweetSentiment {
  text: string;
  sentiment: number;
  engagement: number;
  timestamp: number;
}

interface MockTweet {
  text: string;
  retweets: number;
  likes: number;
  timestamp: number;
}

export interface MarketAnalysis extends VeniceAnalysis {
  tweets: TweetSentiment[];
  totalEngagement: number;
  timestamp: number;
}

export class TwitterSentimentAnalyzer {
  private logger: Logger;
  private mockTweets: Record<string, MockTweet[]>;
  private veniceAI: VeniceAI;

  constructor() {
    this.logger = createLogger('TwitterSentiment');
    this.veniceAI = new VeniceAI();
    // Initialize mock tweet database
    this.mockTweets = {
      'ETH': [
        {
          text: "Super bullish on $ETH with these L2 developments! Base chain looking strong 🚀",
          retweets: 150,
          likes: 450,
          timestamp: Date.now() - 3600000
        },
        {
          text: "ETH/USD breaking key resistance. Technical analysis suggests more upside #DeFi",
          retweets: 80,
          likes: 320,
          timestamp: Date.now() - 7200000
        },
        {
          text: "Feeling bearish on ETH short term, but long term thesis unchanged",
          retweets: 45,
          likes: 180,
          timestamp: Date.now() - 1800000
        },
        {
          text: "ETH gas fees dropping with L2 adoption. Massive bullish signal for ecosystem growth! 📈",
          retweets: 320,
          likes: 890,
          timestamp: Date.now() - 900000
        }
      ],
      'BTC': [
        {
          text: "Bitcoin ETF inflows remain strong! Bullish momentum continues 📈",
          retweets: 250,
          likes: 800,
          timestamp: Date.now() - 2700000
        },
        {
          text: "BTC showing weakness at resistance. Might retest support levels",
          retweets: 120,
          likes: 350,
          timestamp: Date.now() - 5400000
        },
        {
          text: "Institutional adoption of BTC accelerating. Multiple new ETF products launching 🚀",
          retweets: 430,
          likes: 1200,
          timestamp: Date.now() - 1200000
        },
        {
          text: "Bitcoin mining difficulty hits ATH. Network security stronger than ever! 💪",
          retweets: 280,
          likes: 920,
          timestamp: Date.now() - 3000000
        }
      ],
      'BASE': [
        {
          text: "Base chain TVL hitting new highs! DeFi ecosystem expanding rapidly 🌱",
          retweets: 180,
          likes: 520,
          timestamp: Date.now() - 3600000
        },
        {
          text: "Incredible to see Base chain adoption growing. Bullish on the ecosystem! 🚀",
          retweets: 210,
          likes: 640,
          timestamp: Date.now() - 7200000
        },
        {
          text: "New yield farming opportunities on Base looking juicy. APYs through the roof! 📈",
          retweets: 150,
          likes: 480,
          timestamp: Date.now() - 2400000
        },
        {
          text: "Major protocol launching on Base next week. Expecting massive liquidity influx 💰",
          retweets: 290,
          likes: 850,
          timestamp: Date.now() - 1500000
        }
      ],
      'USDC': [
        {
          text: "USDC reserves fully backed and audited. Stablecoin confidence growing 💪",
          retweets: 180,
          likes: 560,
          timestamp: Date.now() - 4500000
        },
        {
          text: "USDC-ETH pools showing strong yields on Base. Low IL risk, high returns! 📈",
          retweets: 130,
          likes: 420,
          timestamp: Date.now() - 3200000
        }
      ],
      'AERO': [
        {
          text: "Aerodrome TVL exploding on Base! New pools offering insane APYs 🚀",
          retweets: 220,
          likes: 680,
          timestamp: Date.now() - 2800000
        },
        {
          text: "Aerodrome governance proposal passed. Major protocol upgrades incoming! 🌟",
          retweets: 160,
          likes: 490,
          timestamp: Date.now() - 1800000
        },
        {
          text: "$AERO tokenomics looking strong. Emissions schedule perfectly balanced.",
          retweets: 140,
          likes: 380,
          timestamp: Date.now() - 900000
        }
      ]
    };
  }

  async init() {
    try {
      this.logger.info('Using mock Twitter data with Venice AI analysis');
      return true;
    } catch (error) {
      this.logger.error('Error initializing analyzer', { error });
      throw error;
    }
  }

  private getTweetEngagement(tweet: MockTweet): number {
    return tweet.retweets + tweet.likes;
  }

  async analyzeSentiment(symbol: string): Promise<TweetSentiment[]> {
    try {
      this.logger.info('Analyzing sentiment with Venice AI', { symbol });

      const symbolUpper = symbol.toUpperCase();
      const tweets = this.mockTweets[symbolUpper] || [];

      // Convert tweets to format needed for Venice AI
      const tweetData = tweets.map(tweet => ({
        text: tweet.text,
        engagement: this.getTweetEngagement(tweet)
      }));

      // Get AI analysis
      const analysis = await this.veniceAI.analyzeSentimentAndMarket(
        symbol,
        tweetData
      );

      // Process tweets with AI insights
      return tweets.map(tweet => ({
        text: tweet.text,
        sentiment: analysis.sentiment, // Use AI-determined sentiment
        engagement: this.getTweetEngagement(tweet),
        timestamp: tweet.timestamp
      }));

    } catch (error) {
      this.logger.error('Error analyzing sentiment', { error, symbol });
      return [];
    }
  }

  async getMarketAnalysis(symbol: string): Promise<MarketAnalysis | null> {
    try {
      const tweets = await this.analyzeSentiment(symbol);
      
      if (tweets.length === 0) return null;

      const tweetData = tweets.map(t => ({
        text: t.text,
        engagement: t.engagement
      }));

      const analysis = await this.veniceAI.analyzeSentimentAndMarket(
        symbol,
        tweetData
      );

      const totalEngagement = tweets.reduce((sum, t) => sum + t.engagement, 0);

      const result: MarketAnalysis = {
        ...analysis,
        tweets,
        totalEngagement,
        timestamp: Date.now()
      };

      this.logger.info('Market analysis completed', {
        symbol,
        sentiment: result.sentiment,
        confidence: result.confidence,
        marketCondition: result.marketCondition,
        suggestedActions: result.suggestedActions.length
      });

      return result;
    } catch (error) {
      this.logger.error('Error getting market analysis', { error, symbol });
      return null;
    }
  }

  // Keep this for backward compatibility
  async getAverageSentiment(symbol: string): Promise<number | null> {
    const analysis = await this.getMarketAnalysis(symbol);
    return analysis ? analysis.sentiment : null;
  }
} 