import express, { Request, Response, Router } from 'express';
import { ChatInterface } from '../services/chat-interface';
import { AgentSpawner } from '../services/agent-spawner';
import { UniswapService } from '../services/uniswap-service';

const router: Router = express.Router();

// Initialize services
const RPC_URL = process.env.BASE_RPC_URL || 'https://rpc.buildbear.io/vijay2ankith';
const agentSpawner = new AgentSpawner(RPC_URL);
const uniswapService = new UniswapService(RPC_URL, agentSpawner.getWalletPrivateKey());
const chatInterface = new ChatInterface(RPC_URL, agentSpawner, uniswapService);

interface CommandRequest {
  command: string;
}

// Chat endpoint
router.post('/command', async (req: Request, res: Response): Promise<void> => {
  try {
    const { command } = req.body;

    if (!command || typeof command !== 'string') {
      res.status(400).json({
        message: 'Invalid request',
        error: 'Command is required and must be a string'
      });
      return;
    }

    const response = await chatInterface.handleCommand(command);
    res.json(response);
  } catch (error) {
    console.error('Error handling chat command:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Health check endpoint
router.get('/health', (_req: Request, res: Response): void => {
  res.json({ status: 'ok' });
});

export default router; 