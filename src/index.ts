import { ethers } from 'ethers';
import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { createLogger } from './utils/logger';
import { AgentSpawner } from './services/agent-spawner';
import chatRouter from './api/chat';

dotenv.config();

const logger = createLogger('App');

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/chat', chatRouter);

// Initialize services
const rpcUrl = process.env.BASE_RPC_URL || 'https://rpc.buildbear.io/vijay2ankith';
const agentSpawner = new AgentSpawner(rpcUrl, {
  minSentiment: Number(process.env.MIN_SENTIMENT) || 0.3,
  minEngagement: Number(process.env.MIN_ENGAGEMENT) || 1000,
  maxAgentsPerToken: Number(process.env.MAX_AGENTS_PER_TOKEN) || 3,
  minCapital: Number(process.env.MIN_CAPITAL) || 0.1,
  maxCapital: Number(process.env.MAX_CAPITAL) || 1.0
});

// Start monitoring
async function main() {
  try {
    // Initialize components
    await agentSpawner.init();
    logger.info('Components initialized');

    // Connect to network
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    console.log("MNEMONIC",process.env.MNEMONIC?.toString());
    const wallet = ethers.Wallet.fromPhrase(process.env.MNEMONIC?.toString() || '');
    
    logger.info('Connected to network', { 
      address: wallet.address,
      balance: ethers.formatEther(await provider.getBalance(wallet.address)),
      chainId: (await provider.getNetwork()).chainId
    });

    // Start the server
    app.listen(port, () => {
      logger.info(`Server is running on port ${port}`);
    });

    // Initial check
    await agentSpawner.checkAndSpawnAgents();
    logger.info('Initial monitoring check completed');

    // Start periodic monitoring
    const MONITORING_INTERVAL = Number(process.env.MONITORING_INTERVAL) || 5 * 60 * 1000; // Default 5 minutes
    setInterval(async () => {
      try {
        await agentSpawner.checkAndSpawnAgents();
        logger.info('Periodic monitoring check completed');
      } catch (error) {
        logger.error('Error in monitoring interval', { error });
      }
    }, MONITORING_INTERVAL);

  } catch (error) {
    logger.error('Error starting system', { error });
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error });
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled rejection', { error });
  process.exit(1);
});

// Start the system
main().catch(error => {
  logger.error('Fatal error in main process', { error });
  process.exit(1);
}); 