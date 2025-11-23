import { BrianSDK } from '@brian-ai/sdk';

// Initialize Brian AI SDK
export const brianAI = new BrianSDK({
  apiKey: process.env.NEXT_PUBLIC_BRIAN_API_KEY || '',
});

export interface TransactionIntent {
  action: 'deposit' | 'withdraw' | 'swap' | 'transfer' | 'unknown';
  amount?: string;
  token?: string;
  data?: unknown;
}

export interface AgentMessage {
  sender: 'user' | 'brian';
  content: string;
}

export interface AgentResponse {
  result: Array<{
    solver: string;
    action: string;
    type: 'write' | 'read';
    data?: {
      description: string;
      steps?: Array<{
        chainId: number;
        blockNumber: number;
        from: string;
        to: string;
        value: string;
        data: string;
        gasLimit: string;
      }>;
      fromChainId?: number;
      fromAmount?: string;
      fromToken?: {
        address: string;
        chainId: number;
        symbol: string;
        decimals: number;
        name: string;
        coinKey: string;
        logoURI: string;
        priceUSD: string;
      };
      toChainId?: number;
      toAmount?: string;
      toToken?: {
        address: string;
        chainId: number;
        symbol: string;
        decimals: number;
        name: string;
        coinKey: string;
        logoURI: string;
        priceUSD: string;
      };
    };
    extractedParams?: {
      action: string;
      chain?: string;
      token1?: string;
      token2?: string;
      address?: string;
      amount?: string;
    };
    conversationHistory?: AgentMessage[];
  }>;
}

/**
 * Extract transaction intent from natural language using Brian's transaction API
 */
export async function extractIntent(
  prompt: string
): Promise<TransactionIntent | null> {
  try {
    if (!process.env.NEXT_PUBLIC_BRIAN_API_KEY) {
      console.warn('Brian AI API key not configured');
      return null;
    }

    // Use Brian's transaction API for proper intent extraction
    const response = await fetch('https://api.brianknows.org/api/v0/transaction', {
      method: 'POST',
      headers: {
        'x-brian-api-key': process.env.NEXT_PUBLIC_BRIAN_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        address: '0x0000000000000000000000000000000000000000', // Placeholder address for intent extraction
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Transaction API error:', response.status, errorText);
      throw new Error(`Transaction API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    // Handle the actual return type from Brian API
    const resultData = result as {
      transactions?: Array<{
        function_name?: string;
      }>;
    };
    
    // Extract action from Brian's response
    let action: 'deposit' | 'withdraw' | 'swap' | 'transfer' | 'unknown' = 'unknown';
    
    if (resultData.transactions && resultData.transactions.length > 0) {
      const tx = resultData.transactions[0];
      // Check if it's a deposit or withdraw action
      if (tx.function_name?.includes('deposit') || prompt.toLowerCase().includes('deposit')) {
        action = 'deposit';
      } else if (tx.function_name?.includes('withdraw') || prompt.toLowerCase().includes('withdraw')) {
        action = 'withdraw';
      }
    }
    
    return {
      action,
      amount: extractAmountFromPrompt(prompt),
      token: 'cUSD', // Default to cUSD for Attestify
      data: resultData,
    };
  } catch (error) {
    console.error('Brian AI extract error:', error);
    return null;
  }
}

/**
 * Extract amount from natural language prompt
 */
function extractAmountFromPrompt(prompt: string): string | undefined {
  // Look for common amount patterns
  const amountPatterns = [
    /(\d+(?:\.\d+)?)\s*cusd/i,
    /(\d+(?:\.\d+)?)\s*dollars?/i,
    /(\d+(?:\.\d+)?)\s*usd/i,
    /(\d+(?:\.\d+)?)\s*c\s*usd/i,
    /(\d+(?:\.\d+)?)\s*$/i, // Just a number at the end
  ];
  
  for (const pattern of amountPatterns) {
    const match = prompt.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return undefined;
}

/**
 * Get AI-powered recommendations based on user's portfolio
 */
export async function getRecommendation(
  userAddress: string,
  context: {
    vaultBalance: string;
    currentAPY: string;
    strategy: string;
    earnings: string;
  }
): Promise<string> {
  try {
    if (!process.env.NEXT_PUBLIC_BRIAN_API_KEY) {
      return "Brian AI is not configured. Please add your API key to use AI recommendations.";
    }

    const prompt = `
      I'm using a DeFi yield vault on Celo called Attestify. Here's my current situation:
      - Vault Balance: ${context.vaultBalance} cUSD
      - Current APY: ${context.currentAPY}%
      - Strategy: ${context.strategy}
      - Total Earnings: ${context.earnings} cUSD
      
      What strategies would you recommend to optimize my yield? Should I change my allocation?
    `;

    const response = await fetch('https://api.brianknows.org/api/v0/knowledge', {
      method: 'POST',
      headers: {
        'x-brian-api-key': process.env.NEXT_PUBLIC_BRIAN_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        kb: 'celo',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Knowledge API error:', response.status, errorText);
      throw new Error(`Knowledge API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return result.result?.answer || 'Unable to generate recommendations at this time.';
  } catch (error) {
    console.error('Brian AI ask error:', error);
    return 'Unable to generate recommendations. Please try again later.';
  }
}

/**
 * Explain what a transaction will do before execution
 */
export async function explainTransaction(
  action: string,
  amount: string,
  token: string = 'cUSD'
): Promise<string> {
  try {
    if (!process.env.NEXT_PUBLIC_BRIAN_API_KEY) {
      return `This will ${action} ${amount} ${token}.`;
    }

    const prompt = `Explain in simple terms what happens when I ${action} ${amount} ${token} to/from the Attestify vault on Celo. Keep it brief and clear.`;

    const response = await fetch('https://api.brianknows.org/api/v0/knowledge', {
      method: 'POST',
      headers: {
        'x-brian-api-key': process.env.NEXT_PUBLIC_BRIAN_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        kb: 'celo',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Knowledge API error:', response.status, errorText);
      throw new Error(`Knowledge API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return result.result?.answer || `This will ${action} ${amount} ${token}.`;
  } catch (error) {
    console.error('Brian AI explain error:', error);
    return `This will ${action} ${amount} ${token}.`;
  }
}

/**
 * Analyze user's DeFi strategy and provide insights
 */
export async function analyzeStrategy(
  userAddress: string,
  strategyType: 'Conservative' | 'Balanced' | 'Growth',
  context: {
    timeInVault: string;
    totalDeposited: string;
    totalEarnings: string;
    currentAPY: string;
  }
): Promise<string> {
  try {
    if (!process.env.NEXT_PUBLIC_BRIAN_API_KEY) {
      return `Your ${strategyType} strategy has been active for ${context.timeInVault}.`;
    }

    const prompt = `
      Analyze my DeFi investment strategy:
      - Strategy: ${strategyType}
      - Time in vault: ${context.timeInVault}
      - Total deposited: ${context.totalDeposited} cUSD
      - Total earnings: ${context.totalEarnings} cUSD
      - Current APY: ${context.currentAPY}%
      
      Is this strategy performing well? Should I consider switching?
    `;

    const response = await fetch('https://api.brianknows.org/api/v0/knowledge', {
      method: 'POST',
      headers: {
        'x-brian-api-key': process.env.NEXT_PUBLIC_BRIAN_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        kb: 'celo',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Knowledge API error:', response.status, errorText);
      throw new Error(`Knowledge API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return result.result?.answer || 'Strategy analysis unavailable.';
  } catch (error) {
    console.error('Brian AI strategy analysis error:', error);
    return 'Unable to analyze strategy at this time.';
  }
}

/**
 * Get market insights for Celo DeFi
 */
export async function getMarketInsights(): Promise<string> {
  try {
    if (!process.env.NEXT_PUBLIC_BRIAN_API_KEY) {
      return "Market insights require Brian AI API key configuration.";
    }

    const prompt = `What are the current best yield opportunities for cUSD stablecoins on Celo? What's the market sentiment?`;

    const response = await fetch('https://api.brianknows.org/api/v0/knowledge', {
      method: 'POST',
      headers: {
        'x-brian-api-key': process.env.NEXT_PUBLIC_BRIAN_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        kb: 'celo',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Knowledge API error:', response.status, errorText);
      throw new Error(`Knowledge API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return result.result?.answer || 'Market insights unavailable.';
  } catch (error) {
    console.error('Brian AI market insights error:', error);
    return 'Unable to fetch market insights.';
  }
}

/**
 * Answer general DeFi questions using Brian's dedicated knowledge API
 */
export async function askQuestion(
  question: string,
  userAddress: string,
  context?: string
): Promise<string> {
  try {
    if (!process.env.NEXT_PUBLIC_BRIAN_API_KEY) {
      return "Please configure Brian AI API key to use the AI assistant.";
    }

    // Format prompt according to Brian's guidelines
    const fullPrompt = context 
      ? `${context}\n\nUser question: ${question}`
      : question;

    // Use Brian's knowledge API endpoint
    const response = await fetch('https://api.brianknows.org/api/v0/knowledge', {
      method: 'POST',
      headers: {
        'x-brian-api-key': process.env.NEXT_PUBLIC_BRIAN_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: fullPrompt,
        kb: 'celo', // Use Celo knowledge base
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Knowledge API error:', response.status, errorText);
      throw new Error(`Knowledge API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return result.result?.answer || 'I apologize, but I couldn\'t process your question. Please try rephrasing.';
  } catch (error) {
    console.error('Brian AI knowledge error:', error);
    return 'I encountered an error processing your question. Please try again.';
  }
}

/**
 * Get DeFi knowledge with context sources
 */
export async function getDeFiKnowledge(
  question: string,
  knowledgeBase: string = 'celo'
): Promise<{
  answer: string;
  sources?: Array<{
    title: string;
    description: string;
    source: string;
  }>;
}> {
  try {
    if (!process.env.NEXT_PUBLIC_BRIAN_API_KEY) {
      return {
        answer: "Please configure Brian AI API key to use the knowledge base.",
      };
    }

    const response = await fetch('https://api.brianknows.org/api/v0/knowledge', {
      method: 'POST',
      headers: {
        'x-brian-api-key': process.env.NEXT_PUBLIC_BRIAN_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: question,
        kb: knowledgeBase,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Knowledge API error:', response.status, errorText);
      throw new Error(`Knowledge API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const context = result.result?.context || [];
    
    return {
      answer: result.result?.answer || 'No answer available.',
      sources: context.map((item: { metadata?: { title?: string; description?: string; source?: string } }) => ({
        title: item.metadata?.title || 'Unknown',
        description: item.metadata?.description || '',
        source: item.metadata?.source || '',
      })),
    };
  } catch (error) {
    console.error('DeFi knowledge error:', error);
    return {
      answer: 'I encountered an error accessing the knowledge base. Please try again.',
    };
  }
}

/**
 * Use Brian Agent API for conversational AI assistance
 * This combines transaction and knowledge capabilities with conversation history
 */
export async function useBrianAgent(
  prompt: string,
  userAddress: string,
  conversationHistory: AgentMessage[] = []
): Promise<AgentResponse | null> {
  try {
    if (!process.env.NEXT_PUBLIC_BRIAN_API_KEY) {
      console.warn('Brian AI API key not configured');
      return null;
    }

    // Use Brian's Agent API for conversational assistance
    const response = await fetch('https://api.brianknows.org/api/v0/agent', {
      method: 'POST',
      headers: {
        'x-brian-api-key': process.env.NEXT_PUBLIC_BRIAN_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        address: userAddress,
        chainId: '11142220', // Celo Sepolia testnet
        messages: conversationHistory,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Brian Agent API error:', response.status, errorText);
      throw new Error(`Brian Agent API error: ${response.status} - ${errorText}`);
    }

    const result: AgentResponse = await response.json();
    return result;
  } catch (error) {
    console.error('Brian Agent API error:', error);
    return null;
  }
}

/**
 * Process Brian Agent response for Attestify vault context
 */
export function processAgentResponse(
  agentResponse: AgentResponse | null,
  vaultContext: {
    vaultBalance: string;
    currentAPY: string;
    currentStrategy: string;
    earnings: string;
    minDeposit?: string;
    maxDeposit?: string;
  }
): {
  response: string;
  actionable?: {
    type: 'deposit' | 'withdraw' | 'strategy';
    amount?: string;
    strategy?: number;
  };
} {
  if (!agentResponse || !agentResponse.result || agentResponse.result.length === 0) {
    return {
      response: "I couldn't process your request. Please try rephrasing your question.",
    };
  }

  const result = agentResponse.result[0];
  
  // Handle transaction responses
  if (result.type === 'write' && result.data?.steps) {
    const extractedParams = result.extractedParams;
    
    if (extractedParams?.action === 'deposit' && extractedParams.amount) {
      return {
        response: `💰 I can help you deposit ${extractedParams.amount} cUSD into the Attestify vault.\n\n**Transaction Details:**\n• Amount: ${extractedParams.amount} cUSD\n• Protocol: Attestify Vault\n• Network: Celo Sepolia\n• APY: ${vaultContext.currentAPY}%\n• Strategy: ${vaultContext.currentStrategy}\n• Min Deposit: ${vaultContext.minDeposit || '1.00'} cUSD\n• Max Deposit: ${vaultContext.maxDeposit || '10,000.00'} cUSD\n\n**What happens:**\n1. Approve vault to spend your cUSD\n2. Deposit funds into vault\n3. Start earning yield immediately\n4. Funds deployed to Mock Aave\n\nWould you like to proceed with this deposit?`,
        actionable: {
          type: 'deposit',
          amount: extractedParams.amount,
        },
      };
    }
    
    if (extractedParams?.action === 'withdraw' && extractedParams.amount) {
      return {
        response: `💸 I can help you withdraw ${extractedParams.amount} cUSD from the Attestify vault.\n\n**Transaction Details:**\n• Amount: ${extractedParams.amount} cUSD\n• Protocol: Attestify Vault\n• Network: Celo Sepolia\n• Current Balance: ${vaultContext.vaultBalance} cUSD\n\n**What happens:**\n1. Withdraw funds from vault\n2. Transfer cUSD to your wallet\n3. Includes principal + earnings\n4. Instant processing\n\nWould you like to proceed with this withdrawal?`,
        actionable: {
          type: 'withdraw',
          amount: extractedParams.amount,
        },
      };
    }
  }
  
  // Handle knowledge/informational responses
  if (result.type === 'read' || result.data?.description) {
    let response = result.data?.description || 'I understand your request.';
    
    // Add Attestify context to financial advice
    if (response.toLowerCase().includes('yield') || 
        response.toLowerCase().includes('apy') || 
        response.toLowerCase().includes('earning')) {
      response += `\n\n**Your Attestify Vault:**\n• Current Balance: ${vaultContext.vaultBalance} cUSD\n• APY: ${vaultContext.currentAPY}%\n• Strategy: ${vaultContext.currentStrategy}\n• Total Earnings: ${vaultContext.earnings} cUSD`;
    }
    
    return { response };
  }
  
  // Default response
  return {
    response: result.data?.description || 'I understand your request. How can I help you with your Attestify vault?',
  };
}

/**
 * Check if Brian AI is properly configured
 */
export function isBrianAIConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_BRIAN_API_KEY;
}
