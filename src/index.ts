import { ethers } from 'ethers';
import { Scout } from './scout';
import { Judge } from './ai/judge';
import { AgentFactory } from './factory/autonome-factory';
import { HealthMonitor } from './health/killswitch';
import { AgentSpawner } from './services/agent-spawner';
import { createLogger } from './utils/logger';
import * as dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import chatRouter from './api/chat';

dotenv.config();

const logger = createLogger('App');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/chat', chatRouter);

// Start the server
app.listen(port, () => {
  logger.info(`Server is running on port ${port}`);
});

// Initialize agent spawner and start monitoring
const rpcUrl = process.env.BASE_RPC_URL || 'https://rpc.buildbear.io/vijay2ankith';
const agentSpawner = new AgentSpawner(rpcUrl);

// Start monitoring
async function main() {
  try {
    // Initial check
    await agentSpawner.checkAndSpawnAgents();
    logger.info('Initial monitoring check completed');

    // Start periodic monitoring
    const MONITORING_INTERVAL = 5 * 60 * 1000; // 5 minutes
    setInterval(async () => {
      try {
        await agentSpawner.checkAndSpawnAgents();
        logger.info('Periodic monitoring check completed');
      } catch (error) {
        logger.error('Error in monitoring interval', { error });
      }
    }, MONITORING_INTERVAL);
  } catch (error) {
    logger.error('Error starting monitoring', { error });
    process.exit(1);
  }
}

main().catch(error => {
  logger.error('Unhandled error in main', { error });
  process.exit(1);
});

async function mainOld() {
  try {
    // Initialize provider and wallet
    const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
    const wallet = ethers.Wallet.fromPhrase(process.env.MNEMONIC!, provider);
    
    logger.info('Connected to network', { 
      chainId: await provider.getNetwork().then(n => n.chainId),
      address: wallet.address,
      balance: ethers.formatEther(await provider.getBalance(wallet.address))
    });

    // Initialize components
    const agentSpawner = new AgentSpawner(process.env.BASE_RPC_URL!, {
      minSentiment: 0.3,
      minEngagement: 500,
      maxAgentsPerToken: 3,
      minCapital: 0.1,
      maxCapital: 1.0
    });

    // Initialize spawner
    await agentSpawner.init();
    logger.info('Components initialized');

    // Initial spawn check
    logger.info('Starting initial agent spawn check', { tokens: MONITORED_TOKENS });
    await agentSpawner.monitorAndSpawn(MONITORED_TOKENS);

    // Set up periodic monitoring
    setInterval(async () => {
      logger.info('Running periodic agent spawn check');
      await agentSpawner.monitorAndSpawn(MONITORED_TOKENS);
    }, 5 * 60 * 1000); // Check every 5 minutes

  } catch (error) {
    logger.error('Error in main process', { error });
  }
}

// Run the main function
mainOld().catch(error => {
  logger.error('Unhandled error', { error });
  process.exit(1);
});

// Tokens to monitor
const MONITORED_TOKENS = ['ETH', 'BTC', 'BASE', 'USDC', 'AERO'];

// Start monitoring
agentSpawner.startMonitoring(); 