import { Logger } from 'winston';
import { createLogger } from '../utils/logger';
import { AgentSpawner } from './agent-spawner';
import { UniswapService } from './uniswap-service';
import { ethers } from 'ethers';

export interface ChatResponse {
  message: string;
  data?: any;
  error?: string;
}

export class ChatInterface {
  private logger: Logger;
  private spawner: AgentSpawner;
  private uniswap: UniswapService;
  private provider: ethers.JsonRpcProvider;

  constructor(
    rpcUrl: string,
    spawner: AgentSpawner,
    uniswap: UniswapService
  ) {
    this.logger = createLogger('ChatInterface');
    this.spawner = spawner;
    this.uniswap = uniswap;
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
  }

  async handleCommand(command: string): Promise<ChatResponse> {
    try {
      const [action, ...args] = command.toLowerCase().split(' ');

      switch (action) {
        case 'status':
          return await this.getSystemStatus();
        case 'positions':
          return await this.getActivePositions();
        case 'agents':
          return await this.getActiveAgents();
        case 'trades':
          return await this.getTradeHistory();
        case 'balance':
          return await this.getWalletBalance();
        case 'help':
          return this.getHelp();
        default:
          return {
            message: 'Unknown command',
            error: `Command '${action}' not recognized. Type 'help' for available commands.`
          };
      }
    } catch (error) {
      this.logger.error('Error handling chat command', { error, command });
      return {
        message: 'Error executing command',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async getSystemStatus(): Promise<ChatResponse> {
    const status = await this.spawner.getStatus();
    return {
      message: 'System Status',
      data: {
        status: 'active',
        monitoredTokens: Object.keys(status.tokens),
        activeAgents: status.totalAgents,
        lastAnalysis: status.lastAnalysis,
        uptime: status.uptime
      }
    };
  }

  private async getActivePositions(): Promise<ChatResponse> {
    const positions = await this.spawner.getActivePositions();
    return {
      message: 'Active Positions',
      data: positions.map(pos => ({
        token: pos.token,
        amount: pos.amount,
        entryPrice: pos.entryPrice,
        currentPrice: pos.currentPrice,
        pnl: pos.pnl,
        strategy: pos.strategy
      }))
    };
  }

  private async getActiveAgents(): Promise<ChatResponse> {
    const agents = await this.spawner.getActiveAgents();
    return {
      message: 'Active Agents',
      data: agents.map(agent => ({
        id: agent.id,
        token: agent.token,
        strategy: agent.strategy,
        status: agent.status,
        spawnTime: agent.spawnTime,
        lastAction: agent.lastAction
      }))
    };
  }

  private async getTradeHistory(): Promise<ChatResponse> {
    const trades = await this.spawner.getTradeHistory();
    return {
      message: 'Recent Trades',
      data: trades.map(trade => ({
        timestamp: trade.timestamp,
        token: trade.token,
        type: trade.type,
        amount: trade.amount,
        price: trade.price,
        txHash: trade.txHash,
        status: trade.status
      }))
    };
  }

  private async getWalletBalance(): Promise<ChatResponse> {
    const wallet = new ethers.Wallet(
      ethers.Wallet.fromPhrase(process.env.MNEMONIC || '').privateKey,
      this.provider
    );
    
    const ethBalance = await this.provider.getBalance(wallet.address);
    
    return {
      message: 'Wallet Balance',
      data: {
        address: wallet.address,
        eth: ethers.formatEther(ethBalance),
        tokens: await this.spawner.getTokenBalances(wallet.address)
      }
    };
  }

  private getHelp(): ChatResponse {
    return {
      message: 'Available Commands',
      data: {
        status: 'Show overall system status',
        positions: 'List all active trading positions',
        agents: 'List all active monitoring agents',
        trades: 'Show recent trade history',
        balance: 'Show wallet balances',
        help: 'Show this help message'
      }
    };
  }
} 