import { Logger } from 'winston';
import { createLogger } from '../utils/logger';
import { SpawnedAgent } from '../factory/autonome-factory';
import { ethers } from 'ethers';

export interface HealthConfig {
  maxLoss: number;          // Maximum loss percentage before termination
  maxInactivity: number;    // Maximum hours without activity
  minROI: number;          // Minimum ROI percentage required
  checkInterval: number;    // Check interval in milliseconds
}

interface HealthStatus {
  healthy: boolean;
  reason?: string;
  metrics: {
    lastActivity: number;
    currentLoss: number;
    currentROI: number;
    uptime: number;
    successfulTrades: number;
    failedTrades: number;
  };
}

interface AgentMetrics {
  trades: {
    successful: number;
    failed: number;
    totalVolume: string;
  };
  performance: {
    roi: number;
    drawdown: number;
    volatility: number;
  };
  lastUpdate: number;
}

export class HealthMonitor {
  private logger: Logger;
  private agents: Map<string, {
    agent: SpawnedAgent;
    config: HealthConfig;
    lastActivity: number;
    metrics: AgentMetrics;
  }>;
  private provider: ethers.JsonRpcProvider;

  constructor(rpcUrl: string) {
    this.logger = createLogger('HealthMonitor');
    this.agents = new Map();
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
  }

  async monitorAgent(agent: SpawnedAgent, config: HealthConfig): Promise<void> {
    this.logger.info('Starting health monitoring', { 
      agentId: agent.id,
      config 
    });

    this.agents.set(agent.id, {
      agent,
      config,
      lastActivity: Date.now(),
      metrics: {
        trades: {
          successful: 0,
          failed: 0,
          totalVolume: '0'
        },
        performance: {
          roi: 0,
          drawdown: 0,
          volatility: 0
        },
        lastUpdate: Date.now()
      }
    });

    // Start monitoring loop
    this._startMonitoring(agent.id);
  }

  private async _startMonitoring(agentId: string): Promise<void> {
    const agentData = this.agents.get(agentId);
    if (!agentData) return;

    const interval = setInterval(async () => {
      const currentAgentData = this.agents.get(agentId);
      if (!currentAgentData) {
        clearInterval(interval);
        return;
      }

      try {
        const health = await this._checkHealth(currentAgentData);
        
        // Log health status
        this.logger.info('Health check completed', {
          agentId,
          health: health.healthy,
          metrics: health.metrics
        });

        if (!health.healthy) {
          await this.killAgent(agentId, health.reason || 'Health check failed');
          clearInterval(interval);
        }

        // Update metrics
        await this._updateMetrics(agentId);
      } catch (error) {
        this.logger.error('Error monitoring agent health', { error, agentId });
      }
    }, agentData.config.checkInterval || 60000); // Default to 1 minute if not specified
  }

  private async _checkHealth(agentData: {
    agent: SpawnedAgent;
    config: HealthConfig;
    lastActivity: number;
    metrics: AgentMetrics;
  }): Promise<HealthStatus> {
    const now = Date.now();
    const inactivityHours = (now - agentData.lastActivity) / (1000 * 60 * 60);
    
    // Check inactivity
    if (inactivityHours > agentData.config.maxInactivity) {
      return {
        healthy: false,
        reason: `Inactive for ${inactivityHours.toFixed(2)} hours`,
        metrics: {
          lastActivity: agentData.lastActivity,
          currentLoss: -agentData.metrics.performance.drawdown,
          currentROI: agentData.metrics.performance.roi,
          uptime: now - agentData.agent.deployedAt,
          successfulTrades: agentData.metrics.trades.successful,
          failedTrades: agentData.metrics.trades.failed
        }
      };
    }

    // Check ROI
    if (agentData.metrics.performance.roi < agentData.config.minROI) {
      return {
        healthy: false,
        reason: `ROI (${agentData.metrics.performance.roi}%) below minimum threshold (${agentData.config.minROI}%)`,
        metrics: {
          lastActivity: agentData.lastActivity,
          currentLoss: -agentData.metrics.performance.drawdown,
          currentROI: agentData.metrics.performance.roi,
          uptime: now - agentData.agent.deployedAt,
          successfulTrades: agentData.metrics.trades.successful,
          failedTrades: agentData.metrics.trades.failed
        }
      };
    }

    // Check maximum loss
    if (agentData.metrics.performance.drawdown > agentData.config.maxLoss) {
      return {
        healthy: false,
        reason: `Loss (${agentData.metrics.performance.drawdown}%) exceeds maximum threshold (${agentData.config.maxLoss}%)`,
        metrics: {
          lastActivity: agentData.lastActivity,
          currentLoss: -agentData.metrics.performance.drawdown,
          currentROI: agentData.metrics.performance.roi,
          uptime: now - agentData.agent.deployedAt,
          successfulTrades: agentData.metrics.trades.successful,
          failedTrades: agentData.metrics.trades.failed
        }
      };
    }

    // All checks passed
    return {
      healthy: true,
      metrics: {
        lastActivity: agentData.lastActivity,
        currentLoss: -agentData.metrics.performance.drawdown,
        currentROI: agentData.metrics.performance.roi,
        uptime: now - agentData.agent.deployedAt,
        successfulTrades: agentData.metrics.trades.successful,
        failedTrades: agentData.metrics.trades.failed
      }
    };
  }

  private async _updateMetrics(agentId: string): Promise<void> {
    const agentData = this.agents.get(agentId);
    if (!agentData) return;

    try {
      // Get current balance
      const balance = await this.provider.getBalance(agentData.agent.address);
      const currentBalance = ethers.formatEther(balance);

      // Calculate ROI
      const initialBalance = ethers.formatEther(
        ethers.parseEther(agentData.agent.config.config.capital.toString())
      );
      const roi = ((Number(currentBalance) - Number(initialBalance)) / Number(initialBalance)) * 100;

      // Update metrics
      agentData.metrics.performance.roi = roi;
      agentData.metrics.lastUpdate = Date.now();

      // Calculate drawdown if ROI is negative
      if (roi < 0) {
        agentData.metrics.performance.drawdown = Math.abs(roi);
      }

      this.agents.set(agentId, agentData);
    } catch (error) {
      this.logger.error('Error updating metrics', { error, agentId });
    }
  }

  async killAgent(agentId: string, reason: string): Promise<void> {
    const agentData = this.agents.get(agentId);
    if (!agentData) return;

    this.logger.info('Killing agent', { 
      agentId, 
      reason,
      metrics: agentData.metrics
    });
    
    try {
      // Withdraw remaining funds
      await this._withdrawFunds(agentData.agent);
      
      // Log termination
      await this._logTermination(agentData.agent, reason);
      
      // Clean up
      this.agents.delete(agentId);
    } catch (error) {
      this.logger.error('Error killing agent', { error, agentId });
      throw error;
    }
  }

  private async _withdrawFunds(agent: SpawnedAgent): Promise<void> {
    try {
      const balance = await this.provider.getBalance(agent.address);
      if (balance <= BigInt(0)) return;

      // Implement withdrawal logic here
      this.logger.info('Withdrawing funds', {
        agentId: agent.id,
        balance: ethers.formatEther(balance)
      });
    } catch (error) {
      this.logger.error('Error withdrawing funds', { error, agentId: agent.id });
    }
  }

  private async _logTermination(agent: SpawnedAgent, reason: string): Promise<void> {
    const agentData = this.agents.get(agent.id);
    if (!agentData) return;

    this.logger.info('Agent terminated', {
      agentId: agent.id,
      reason,
      lifetime: Date.now() - agent.deployedAt,
      metrics: agentData.metrics
    });
  }

  // Method to update trade metrics
  async recordTrade(agentId: string, successful: boolean, volume: string): Promise<void> {
    const agentData = this.agents.get(agentId);
    if (!agentData) return;

    if (successful) {
      agentData.metrics.trades.successful++;
    } else {
      agentData.metrics.trades.failed++;
    }

    agentData.metrics.trades.totalVolume = (
      Number(agentData.metrics.trades.totalVolume) + Number(volume)
    ).toString();

    agentData.lastActivity = Date.now();
    this.agents.set(agentId, agentData);
  }
} 