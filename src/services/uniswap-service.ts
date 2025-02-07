import { ethers } from 'ethers';
import { Logger } from 'winston';
import { createLogger } from '../utils/logger';
import ISwapRouter from '@uniswap/v3-periphery/artifacts/contracts/interfaces/ISwapRouter.sol/ISwapRouter.json';
import IERC20 from '@openzeppelin/contracts/build/contracts/IERC20.json';

export interface SwapConfig {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  slippage: number;
  deadline: number;
}

export class UniswapService {
  private logger: Logger;
  private router: ethers.Contract;
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;

  // Uniswap V3 Router address on Base
  private readonly ROUTER_ADDRESS = '0x2626664c2603336E57B271c5C0b26F421741e481';
  private readonly WETH_ADDRESS = '0x4200000000000000000000000000000000000006';
  private readonly POOL_FEE = 3000; // 0.3%

  constructor(rpcUrl: string, privateKey: string) {
    this.logger = createLogger('UniswapService');
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    
    this.logger.info('Initialized wallet', {
      address: this.wallet.address,
      provider: rpcUrl
    });
    
    this.router = new ethers.Contract(
      this.ROUTER_ADDRESS,
      ISwapRouter.abi,
      this.wallet
    );
  }

  async init() {
    try {
      const network = await this.provider.getNetwork();
      const balance = await this.provider.getBalance(this.wallet.address);
      
      this.logger.info('Initialized Uniswap V3 service', {
        chainId: network.chainId,
        routerAddress: this.ROUTER_ADDRESS,
        walletAddress: this.wallet.address,
        balance: ethers.formatEther(balance)
      });
    } catch (error) {
      this.logger.error('Failed to initialize Uniswap service', { 
        error,
        walletAddress: this.wallet.address
      });
      throw error;
    }
  }

  private async getTokenContract(tokenAddress: string): Promise<ethers.Contract> {
    return new ethers.Contract(tokenAddress, IERC20.abi, this.wallet);
  }

  async checkAllowance(tokenAddress: string, amount: string): Promise<boolean> {
    const tokenContract = await this.getTokenContract(tokenAddress);
    const allowance = await tokenContract.allowance(
      this.wallet.address,
      this.ROUTER_ADDRESS
    );
    return allowance >= ethers.parseEther(amount);
  }

  async approve(tokenAddress: string, amount: string): Promise<void> {
    const tokenContract = await this.getTokenContract(tokenAddress);
    const tx = await tokenContract.approve(
      this.ROUTER_ADDRESS,
      ethers.parseEther(amount)
    );
    await tx.wait();
    this.logger.info('Approved token spending', {
      token: tokenAddress,
      amount,
      txHash: tx.hash
    });
  }

  async executeTrade(config: SwapConfig): Promise<ethers.TransactionResponse> {
    try {
      // Check allowance and approve if needed
      if (config.tokenIn !== this.WETH_ADDRESS) {
        const hasAllowance = await this.checkAllowance(config.tokenIn, config.amountIn);
        if (!hasAllowance) {
          await this.approve(config.tokenIn, config.amountIn);
        }
      }

      const amountIn = ethers.parseEther(config.amountIn);
      const minAmountOut = amountIn * BigInt(Math.floor((1 - config.slippage) * 10000)) / BigInt(10000);

      // Prepare parameters for exactInputSingle
      const params = {
        tokenIn: config.tokenIn,
        tokenOut: config.tokenOut,
        fee: this.POOL_FEE,
        recipient: this.wallet.address,
        deadline: config.deadline,
        amountIn,
        amountOutMinimum: minAmountOut,
        sqrtPriceLimitX96: 0
      };

      // Execute swap
      const tx = await this.router.exactInputSingle(
        params,
        { gasLimit: 300000 }
      );

      this.logger.info('Trade executed', {
        tokenIn: config.tokenIn,
        tokenOut: config.tokenOut,
        amountIn: config.amountIn,
        minAmountOut: ethers.formatEther(minAmountOut),
        txHash: tx.hash
      });

      return tx;
    } catch (error) {
      this.logger.error('Error executing trade', { error });
      throw error;
    }
  }

  async executeTradeWithETH(
    tokenOut: string,
    amountIn: string,
    slippage: number,
    deadline: number
  ): Promise<ethers.TransactionResponse> {
    try {
      const amountInWei = ethers.parseEther(amountIn);
      const minAmountOut = amountInWei * BigInt(Math.floor((1 - slippage) * 10000)) / BigInt(10000);

      // Prepare parameters for exactInputSingle
      const params = {
        tokenIn: this.WETH_ADDRESS,
        tokenOut: tokenOut,
        fee: this.POOL_FEE,
        recipient: this.wallet.address,
        deadline: deadline,
        amountIn: amountInWei,
        amountOutMinimum: minAmountOut,
        sqrtPriceLimitX96: 0
      };

      // Execute swap
      const tx = await this.router.exactInputSingle(
        params,
        {
          value: amountInWei,
          gasLimit: 300000
        }
      );

      this.logger.info('ETH trade executed', {
        tokenOut,
        amountIn,
        minAmountOut: ethers.formatEther(minAmountOut),
        txHash: tx.hash
      });

      return tx;
    } catch (error) {
      this.logger.error('Error executing ETH trade', { error });
      throw error;
    }
  }
} 