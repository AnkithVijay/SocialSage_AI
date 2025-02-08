import * as dotenv from 'dotenv';
import { TwitterApi } from 'twitter-api-v2';
import { Logger } from 'winston';
import { createLogger } from '../utils/logger';
import { VeniceAI, VeniceAnalysis } from './venice-ai';

export interface TweetSentiment {
  text: string;
  sentiment: number;
  engagement: number;
  timestamp: number;
}

export interface MarketAnalysis extends VeniceAnalysis {
  tweets: TweetSentiment[];
  totalEngagement: number;
  timestamp: number;
}

export class TwitterSentimentAnalyzer {
  private logger: Logger;
  private twitterClient: TwitterApi | null;
  private veniceAI: VeniceAI;
  private useMockData: boolean;
  private mockTweets: Record<string, any>;

  constructor() {
    this.logger = createLogger('TwitterSentiment');
    this.veniceAI = new VeniceAI();
    this.twitterClient = null;
    this.mockTweets = {};
    this.useMockData = !process.env.TWITTER_API_KEY || !process.env.TWITTER_API_SECRET;

    if (!this.useMockData) {
      this.twitterClient = new TwitterApi({
        appKey: process.env.TWITTER_API_KEY!,
        appSecret: process.env.TWITTER_API_SECRET!,
      });
    } else {
      this.logger.warn('No Twitter API credentials found, using mock data');
      // Initialize mock data
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
  }

  async init() {
    try {
      if (!this.useMockData) {
        // Test Twitter API connection
        await this.twitterClient!.v2.search('test');
        this.logger.info('Twitter API connection successful');
      } else {
        this.logger.info('Using mock Twitter data with Venice AI analysis');
      }
      return true;
    } catch (error) {
      this.logger.error('Error initializing analyzer', { error });
      throw error;
    }
  }

  private getTweetEngagement(tweet: any): number {
    if (this.useMockData) {
      return tweet.retweets + tweet.likes;
    }
    // For real tweets
    return (tweet.public_metrics?.retweet_count || 0) +
           (tweet.public_metrics?.like_count || 0) +
           (tweet.public_metrics?.reply_count || 0);
  }

  async searchTweets(symbol: string): Promise<any[]> {
    if (this.useMockData || !this.twitterClient) {
      return this.mockTweets[symbol] || [];
    }

    try {
      // Search for tweets about the token
      const query = `${symbol} (crypto OR trading OR blockchain) -is:retweet lang:en`;
      const tweets = await this.twitterClient.v2.search(query, {
        'tweet.fields': ['created_at', 'public_metrics'],
        max_results: 100,
        sort_order: 'recency'
      });

      return tweets.data.data || [];
    } catch (error) {
      this.logger.error('Error searching tweets', { error, symbol });
      // Fallback to mock data
      this.logger.info('Falling back to mock data');
      return this.mockTweets[symbol] || [];
    }
  }

  async analyzeSentiment(symbol: string): Promise<TweetSentiment[]> {
    try {
      this.logger.info('Analyzing sentiment with Venice AI', { symbol });

      // Get tweets
      const tweets = await this.searchTweets(symbol);

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
        sentiment: analysis.sentiment,
        engagement: this.getTweetEngagement(tweet),
        timestamp: this.useMockData ? 
          tweet.timestamp : 
          new Date(tweet.created_at).getTime()
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

  async getAverageSentiment(symbol: string): Promise<number | null> {
    const analysis = await this.getMarketAnalysis(symbol);
    return analysis ? analysis.sentiment : null;
  }
} 