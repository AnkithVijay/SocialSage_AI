import { ethers } from 'ethers';
import { Logger } from 'winston';
import { createLogger } from '../utils/logger';
import { TwitterSentimentAnalyzer, MarketAnalysis } from './twitter-sentiment';
import { VeniceAI } from './venice-ai';
import { AgentFactory } from '../factory/autonome-factory';
import { Judge } from '../ai/judge';
import { UniswapService } from './uniswap-service';

// Token addresses on Base
const TOKEN_ADDRESSES: { [key: string]: string } = {
  'ETH': '0x4200000000000000000000000000000000000006', // WETH
  'USDC': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  'BASE': '0xfA980cEd6895AC314E7dE34Ef1bFAE90a5AdD21b',
  'AERO': '0x940181a94A35A4569E4529A3CDfB74e38FD98631',
};

interface SpawnConfig {
  minSentiment: number;
  minEngagement: number;
  maxAgentsPerToken: number;
  minCapital: number;
  maxCapital: number;
}

interface SystemStatus {
  tokens: Record<string, {
    sentiment: number;
    lastAnalysis: number;
    activeAgents: number;
  }>;
  totalAgents: number;
  lastAnalysis: number;
  uptime: number;
}

interface Position {
  token: string;
  amount: string;
  entryPrice: string;
  currentPrice: string;
  pnl: string;
  strategy: string;
}

interface AgentStatus {
  id: string;
  token: string;
  strategy: string;
  status: 'active' | 'terminated';
  spawnTime: number;
  lastAction: {
    type: string;
    timestamp: number;
  };
}

interface Trade {
  timestamp: number;
  token: string;
  type: 'buy' | 'sell';
  amount: string;
  price: string;
  txHash: string;
  status: 'completed' | 'pending' | 'failed';
}

export class AgentSpawner {
  private logger: Logger;
  private sentimentAnalyzer: TwitterSentimentAnalyzer;
  private veniceAI: VeniceAI;
  private agentFactory: AgentFactory;
  private judge: Judge;
  private uniswap: UniswapService;
  private activeAgents: Map<string, Set<string>>;  // token -> agent IDs
  private startTime: number;
  private tradeHistory: Trade[];
  private wallet: ethers.HDNodeWallet;
  private provider: ethers.JsonRpcProvider;
  private monitoredTokens: string[];

  constructor(
    rpcUrl: string,
    private config: SpawnConfig = {
      minSentiment: 0.3,
      minEngagement: 1000,
      maxAgentsPerToken: 3,
      minCapital: 0.1,
      maxCapital: 1.0
    }
  ) {
    this.logger = createLogger('AgentSpawner');
    this.sentimentAnalyzer = new TwitterSentimentAnalyzer();
    this.veniceAI = new VeniceAI();
    this.agentFactory = new AgentFactory(rpcUrl);
    this.judge = new Judge();

    this.startTime = Date.now();
    this.tradeHistory = [];
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = ethers.Wallet.fromPhrase(process.env.MNEMONIC || '') as ethers.HDNodeWallet;
    this.uniswap = new UniswapService(rpcUrl, this.wallet.privateKey);
    this.activeAgents = new Map();
    this.monitoredTokens = ['ETH', 'BTC', 'BASE', 'USDC', 'AERO'];
  }

  async init() {
    await this.sentimentAnalyzer.init();
    await this.veniceAI.init();
    await this.uniswap.init();
    this.logger.info('Agent spawner initialized with Venice AI and Uniswap');
  }

  private async evaluateOpportunity(token: string, analysis: MarketAnalysis) {
    const opportunity = {
      type: 'sentiment' as const,
      token,
      risk: Math.max(1, 5 - analysis.sentiment * 5), // Higher sentiment = lower risk
      confidence: analysis.confidence,
      source: 'venice-ai',
      timestamp: Date.now(),
      metadata: {
        sentiment: analysis.sentiment,
        marketCondition: analysis.marketCondition,
        reasoning: analysis.reasoning,
        suggestedActions: analysis.suggestedActions
      }
    };

    return await this.judge.evaluateOpportunity({
      strategy: 'sentiment',
      capitalRequired: this.config.minCapital,
      opportunity
    });
  }

  private async executeTrade(
    token: string,
    sentiment: number,
    amount: string,
    analysis: MarketAnalysis
  ) {
    try {
      if (!TOKEN_ADDRESSES[token]) {
        this.logger.warn('Token address not found', { token });
        return null;
      }

      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
      const slippage = 0.005; // 0.5%

      // If sentiment is positive, buy token with ETH
      if (sentiment > 0) {
        this.logger.info('Executing buy order based on positive sentiment', {
          token,
          sentiment,
          amount,
          reasoning: analysis.reasoning
        });

        const tx = await this.uniswap.executeTradeWithETH(
          TOKEN_ADDRESSES[token],
          amount,
          slippage,
          deadline
        );

        if (tx) {
          await this._recordTrade({
            timestamp: Date.now(),
            token,
            type: 'buy',
            amount,
            price: '0.0', // Implement price tracking
            txHash: tx.hash,
            status: 'completed'
          });
        }

        return tx;
      }
      // If sentiment is negative, sell token for ETH
      else if (sentiment < 0) {
        this.logger.info('Executing sell order based on negative sentiment', {
          token,
          sentiment,
          amount,
          reasoning: analysis.reasoning
        });

        const tx = await this.uniswap.executeTrade({
          tokenIn: TOKEN_ADDRESSES[token],
          tokenOut: TOKEN_ADDRESSES['ETH'],
          amountIn: amount,
          slippage,
          deadline
        });

        if (tx) {
          await this._recordTrade({
            timestamp: Date.now(),
            token,
            type: 'sell',
            amount,
            price: '0.0', // Implement price tracking
            txHash: tx.hash,
            status: 'completed'
          });
        }

        return tx;
      }

      return null;
    } catch (error) {
      this.logger.error('Error executing trade', { error, token });
      return null;
    }
  }

  private async getAgentTemplate(token: string, sentiment: number, config: any) {
    // Get AI recommendation for strategy
    const strategy = await this.veniceAI.evaluateStrategy(
      token,
      sentiment,
      'all',
      config
    );

    if (!strategy.shouldExecute) {
      return null;
    }

    // Use AI-recommended configuration
    return {
      template: sentiment > 0.7 ? 'aggressive-long' :
                sentiment > 0.3 ? 'conservative-long' :
                sentiment < -0.7 ? 'aggressive-short' :
                sentiment < -0.3 ? 'conservative-short' : 'neutral',
      config: strategy.adjustedConfig,
      reasoning: strategy.reasoning
    };
  }

  async spawnAgentsForToken(token: string) {
    try {
      // Get market analysis from Venice AI
      const analysis = await this.sentimentAnalyzer.getMarketAnalysis(token);
      if (!analysis) {
        this.logger.info('No market analysis available', { token });
        return;
      }

      // Check if we should spawn new agents
      if (Math.abs(analysis.sentiment) < this.config.minSentiment) {
        this.logger.info('Sentiment below threshold', { 
          token, 
          sentiment: analysis.sentiment,
          reasoning: analysis.reasoning
        });
        return;
      }

      // Check active agents limit
      const activeAgentIds = this.activeAgents.get(token) || new Set();
      if (activeAgentIds.size >= this.config.maxAgentsPerToken) {
        this.logger.info('Maximum agents already spawned', { token, count: activeAgentIds.size });
        return;
      }

      // Evaluate opportunity with AI insights
      const evaluation = await this.evaluateOpportunity(token, analysis);
      if (!evaluation.shouldSpawn) {
        this.logger.info('Judge rejected opportunity', { 
          token, 
          sentiment: analysis.sentiment,
          reasoning: analysis.reasoning
        });
        return;
      }

      // Execute trade based on sentiment
      const tradeAmount = evaluation.recommendedConfig.capital.toString();
      const tradeTx = await this.executeTrade(
        token,
        analysis.sentiment,
        tradeAmount,
        analysis
      );

      if (!tradeTx) {
        this.logger.warn('Trade execution failed', { token });
        return;
      }

      // Get AI-recommended strategy
      const strategy = await this.getAgentTemplate(
        token,
        analysis.sentiment,
        evaluation.recommendedConfig
      );

      if (!strategy) {
        this.logger.info('AI rejected strategy execution', { token });
        return;
      }

      // Spawn agent with AI-optimized configuration
      const agent = await this.agentFactory.spawn({
        template: strategy.template,
        config: {
          ...strategy.config,
          tradeTxHash: tradeTx.hash
        },
        funding: 'treasury'
      });

      // Track new agent
      if (!this.activeAgents.has(token)) {
        this.activeAgents.set(token, new Set());
      }
      this.activeAgents.get(token)!.add(agent.id);

      this.logger.info('Spawned new AI-driven agent with trade execution', {
        token,
        sentiment: analysis.sentiment,
        marketCondition: analysis.marketCondition,
        agentId: agent.id,
        template: strategy.template,
        tradeTxHash: tradeTx.hash,
        reasoning: strategy.reasoning
      });

      return agent;

    } catch (error) {
      this.logger.error('Error spawning agents', { error, token });
      return null;
    }
  }

  async monitorAndSpawn(tokens: string[]) {
    for (const token of tokens) {
      await this.spawnAgentsForToken(token);
    }
  }

  async getStatus(): Promise<SystemStatus> {
    const tokens: Record<string, any> = {};
    
    for (const [token, agents] of this.activeAgents.entries()) {
      const analysis = await this.sentimentAnalyzer.getMarketAnalysis(token);
      tokens[token] = {
        sentiment: analysis?.sentiment || 0,
        lastAnalysis: Date.now(),
        activeAgents: agents.size
      };
    }

    return {
      tokens,
      totalAgents: Array.from(this.activeAgents.values())
        .reduce((sum, agents) => sum + agents.size, 0),
      lastAnalysis: Date.now(),
      uptime: Date.now() - this.startTime
    };
  }

  async getActivePositions(): Promise<Position[]> {
    const positions: Position[] = [];
    
    for (const [token, agents] of this.activeAgents.entries()) {
      if (agents.size > 0) {
        // Get token price from Uniswap
        const tokenAddress = TOKEN_ADDRESSES[token];
        if (!tokenAddress) continue;

        try {
          const position: Position = {
            token,
            amount: '0.0', // Implement actual position tracking
            entryPrice: '0.0',
            currentPrice: '0.0',
            pnl: '0.0',
            strategy: 'sentiment-based'
          };
          positions.push(position);
        } catch (error) {
          this.logger.error('Error getting position', { error, token });
        }
      }
    }

    return positions;
  }

  async getActiveAgents(): Promise<AgentStatus[]> {
    const agents: AgentStatus[] = [];
    
    for (const [token, agentIds] of this.activeAgents.entries()) {
      for (const id of agentIds) {
        agents.push({
          id,
          token,
          strategy: 'sentiment-based',
          status: 'active',
          spawnTime: Date.now(), // Replace with actual spawn time tracking
          lastAction: {
            type: 'monitor',
            timestamp: Date.now()
          }
        });
      }
    }

    return agents;
  }

  async getTradeHistory(): Promise<Trade[]> {
    return this.tradeHistory.slice(-10); // Return last 10 trades
  }

  async getTokenBalances(address: string): Promise<Record<string, string>> {
    const balances: Record<string, string> = {};
    
    for (const [token, tokenAddress] of Object.entries(TOKEN_ADDRESSES)) {
      try {
        const contract = new ethers.Contract(
          tokenAddress,
          ['function balanceOf(address) view returns (uint256)'],
          this.provider
        );
        
        const balance = await contract.balanceOf(address);
        balances[token] = ethers.formatEther(balance);
      } catch (error) {
        this.logger.error('Error getting token balance', { error, token });
        balances[token] = '0.0';
      }
    }

    return balances;
  }

  // Add this method to track trades
  private async _recordTrade(trade: Trade) {
    this.tradeHistory.push(trade);
    // Keep only last 100 trades
    if (this.tradeHistory.length > 100) {
      this.tradeHistory = this.tradeHistory.slice(-100);
    }
  }

  getWalletPrivateKey(): string {
    return this.wallet.privateKey;
  }

  async checkAndSpawnAgents(): Promise<void> {
    for (const token of this.monitoredTokens) {
      try {
        // Get market analysis
        const analysis = await this.sentimentAnalyzer.getMarketAnalysis(token);
        if (!analysis) continue;

        this.logger.info('Market analysis', { token, analysis });

        // Check if we should spawn an agent
        if (analysis.sentiment >= this.config.minSentiment && analysis.confidence >= 0.7) {
          // Calculate position size based on confidence
          const positionSize = this.calculatePositionSize(analysis.confidence);

          // Execute trade
          await this.executeTrade(token, analysis.sentiment, positionSize.toString(), analysis);

          // Spawn agent to monitor position
          const agentId = await this.spawnAgent(token, analysis);
          if (agentId) {
            this.logger.info('Spawned agent', { token, agentId });
          }
        }
      } catch (error) {
        this.logger.error('Error checking token', { token, error });
      }
    }
  }

  private calculatePositionSize(confidence: number): number {
    // Scale position size between minCapital and maxCapital based on confidence
    const scale = (confidence - 0.7) / 0.3; // 0.7 to 1.0 mapped to 0 to 1
    return this.config.minCapital + (this.config.maxCapital - this.config.minCapital) * scale;
  }

  private async spawnAgent(token: string, analysis: MarketAnalysis): Promise<string | null> {
    try {
      // Check if we have too many agents for this token
      const existingAgents = this.activeAgents.get(token) || new Set();
      if (existingAgents.size >= this.config.maxAgentsPerToken) {
        this.logger.warn('Maximum agents reached for token', { token });
        return null;
      }

      // Generate unique agent ID
      const agentId = `${token}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      // Add agent to active agents
      if (!this.activeAgents.has(token)) {
        this.activeAgents.set(token, new Set());
      }
      this.activeAgents.get(token)?.add(agentId);

      this.logger.info('Agent spawned', {
        agentId,
        token,
        sentiment: analysis.sentiment,
        confidence: analysis.confidence
      });

      return agentId;
    } catch (error) {
      this.logger.error('Error spawning agent', { token, error });
      return null;
    }
  }

  async startMonitoring(): Promise<void> {
    await this.checkAndSpawnAgents();
    this.logger.info('Initial monitoring check completed');
    
    setInterval(async () => {
      try {
        await this.checkAndSpawnAgents();
      } catch (error) {
        this.logger.error('Error in monitoring interval', { error });
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }
} 