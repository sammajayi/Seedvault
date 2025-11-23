'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { Bot, Send, Loader2, TrendingUp, Target, DollarSign, AlertCircle, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { 
  getDeFiKnowledge,
  isBrianAIConfigured,
  processAgentResponse,
  AgentMessage
} from '../../services/BrianAI';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actionable?: {
    type: 'deposit' | 'withdraw' | 'strategy';
    amount?: string;
    strategy?: number;
  };
}

interface AIChatProps {
  vaultBalance: string;
  currentAPY: string;
  currentStrategy: string;
  earnings: string;
  minDeposit?: string;
  maxDeposit?: string;
  onDeposit?: (amount: string) => void;
  onWithdraw?: (amount: string) => void;
  onStrategyChange?: (strategy: number) => void;
}

export default function AIChat({ 
  vaultBalance, 
  currentAPY,
  currentStrategy,
  earnings,
  minDeposit,
  maxDeposit,
  onDeposit,
  onWithdraw,
  onStrategyChange
}: AIChatProps) {
  const { address } = useAccount();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with welcome message
  useEffect(() => {
    const welcomeMessage: Message = {
      role: 'assistant',
      content: isBrianAIConfigured() 
        ? `Hi! I'm your AI DeFi assistant powered by Attestify AI. 🤖\n\nI can help you:\n• Manage your vault (deposits & withdrawals)\n• Analyze your investment strategy\n• Get market insights and recommendations\n• Answer DeFi questions\n\nWhat would you like to know?`
        : `Hi! I'm your AI DeFi assistant powered by Attestify AI. ⚠️\n\nBrian AI is not configured yet. To enable AI features:\n1. Get an API key from https://brianknows.org\n2. Add NEXT_PUBLIC_BRIAN_API_KEY to your .env.local\n\nFor now, I can provide basic information about your vault.`,
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  }, []);

  // Handle Brian Agent API call
  const callBrianAgent = async (prompt: string, conversationHistory: AgentMessage[]) => {
    if (!isBrianAIConfigured() || !address) return null;
    
    try {
      const response = await fetch('https://api.brianknows.org/api/v0/agent', {
        method: 'POST',
        headers: {
          'x-brian-api-key': process.env.NEXT_PUBLIC_BRIAN_API_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          address,
          chainId: '11142220', // Celo Sepolia testnet
          messages: conversationHistory,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Brian Agent API error:', response.status, errorText);
        throw new Error(`Brian Agent API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Brian Agent API error:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !address || isLoading) return;

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      let response = '';
      let actionable: Message['actionable'] = undefined;

      // Convert message history to Brian Agent format
      const conversationHistory: AgentMessage[] = messages.map(msg => ({
        sender: msg.role === 'user' ? 'user' : 'brian',
        content: msg.content,
      }));

      // Try Brian Agent API first for conversational assistance
      if (isBrianAIConfigured()) {
        try {
          const agentResponse = await callBrianAgent(currentInput, conversationHistory);
          
          if (agentResponse) {
            const processedResponse = processAgentResponse(agentResponse, {
              vaultBalance,
              currentAPY,
              currentStrategy,
              earnings,
              minDeposit,
              maxDeposit,
            });
            
            response = processedResponse.response;
            actionable = processedResponse.actionable;
          } else {
            throw new Error('Agent API failed');
          }
        } catch (agentError) {
          console.log('Brian Agent API error, falling back to local responses:', agentError);
          // Fall back to local responses
          response = await handleLocalResponse(currentInput);
        }
      } else {
        // Use local responses when Brian AI is not configured
        response = await handleLocalResponse(currentInput);
      }

      // Add AI response
      const assistantMessage: Message = {
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        actionable,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI Chat error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: '❌ Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle local responses as fallback
  const handleLocalResponse = async (currentInput: string): Promise<string> => {
    const inputLower = currentInput.toLowerCase();
    
    // Portfolio queries - expanded patterns
    if (inputLower.includes('balance') || 
        inputLower.includes('how much') ||
        inputLower.includes('what\'s my') ||
        inputLower.includes('my balance')) {
      const earningsNum = parseFloat(earnings);
      return `📊 Your Attestify Portfolio:\n\n• Vault Balance: ${vaultBalance} cUSD\n• Total Earnings: ${earningsNum > 0.01 ? earningsNum.toFixed(2) : earningsNum.toFixed(6)} cUSD\n• Current APY: ${currentAPY}%\n• Strategy: ${currentStrategy}\n\nYou're earning approximately $${(parseFloat(vaultBalance) * parseFloat(currentAPY) / 100 / 365).toFixed(6)} per day!`;
    }
    // Performance queries - expanded patterns
    else if (inputLower.includes('performance') || 
             inputLower.includes('earning') ||
             inputLower.includes('how\'s my vault') ||
             inputLower.includes('how is my vault') ||
             inputLower.includes('vault going') ||
             inputLower.includes('vault doing') ||
             inputLower.includes('how am i doing') ||
             inputLower.includes('how\'s it going')) {
      const vaultBalanceNum = parseFloat(vaultBalance);
      const earningsNum = parseFloat(earnings);
      const originalDeposit = vaultBalanceNum - earningsNum;
      const roi = originalDeposit > 0 ? ((earningsNum / originalDeposit) * 100).toFixed(6) : '0.000000';
      
      return `📈 Your Performance:\n\n• Total Earnings: ${earningsNum > 0.01 ? earningsNum.toFixed(2) : earningsNum.toFixed(6)} cUSD\n• ROI: ${roi}%\n• Current APY: ${currentAPY}%\n• Strategy: ${currentStrategy}\n• Original Deposit: ${originalDeposit.toFixed(2)} cUSD\n\n${earningsNum > 0 ? '✅ You\'re earning yield! Your money is working for you!' : '⏳ Your earnings are accumulating. Give it some time!'}`;
    }
    // Risk queries
    else if (currentInput.toLowerCase().includes('risk') || currentInput.toLowerCase().includes('safe')) {
      return `🛡️ Risk Analysis:\n\n**Your Current Strategy: ${currentStrategy}**\n\n• **Smart Contract Risk**: Audited vault contract\n• **Protocol Risk**: Mock Aave integration for testing\n• **Liquidity Risk**: ${currentStrategy === 'Conservative' ? 'Very Low' : currentStrategy === 'Balanced' ? 'Low' : 'Medium'} (${currentStrategy === 'Conservative' ? '100%' : currentStrategy === 'Balanced' ? '90%' : '80%'} deployed)\n• **Market Risk**: Stablecoin (cUSD) minimizes volatility\n\n✅ Overall: Your funds are relatively safe, earning stable yields on Celo Sepolia testnet.`;
    }
    // Withdrawal queries
    else if (currentInput.toLowerCase().includes('withdraw') || currentInput.toLowerCase().includes('how can i withdraw')) {
      return `💸 Withdrawal Process:\n\n1. **Enter Amount**: Specify how much cUSD to withdraw\n2. **Quick Options**: Use 25%, 50%, 75%, or MAX buttons\n3. **Review**: Check withdrawal summary\n4. **Confirm**: Click withdraw button\n\n**Current Balance**: ${vaultBalance} cUSD\n**Available**: You can withdraw your full balance including earnings\n\n💡 **Tip**: Use the MAX button to withdraw everything!`;
    }
    // Deposit queries
    else if (currentInput.toLowerCase().includes('deposit') || currentInput.toLowerCase().includes('how can i deposit')) {
      return `💰 Deposit Process:\n\n1. **Enter Amount**: Specify cUSD amount to deposit\n2. **Approve**: Allow vault to spend your cUSD\n3. **Deposit**: Funds go to Mock Aave for yield\n4. **Earn**: Start earning ${currentAPY}% APY immediately\n\n**Minimum**: ${minDeposit || '1.00'} cUSD\n**Maximum**: ${maxDeposit || '10,000.00'} cUSD\n**Current APY**: ${currentAPY}%\n**Strategy**: ${currentStrategy}\n\n💡 **Tip**: The more you deposit, the more you earn!`;
    }
    // DeFi knowledge queries - try Brian Knowledge API
    else if (currentInput.toLowerCase().includes('what is') || 
             currentInput.toLowerCase().includes('explain') ||
             currentInput.toLowerCase().includes('how does') ||
             currentInput.toLowerCase().includes('defi') ||
             currentInput.toLowerCase().includes('yield') ||
             currentInput.toLowerCase().includes('aave') ||
             currentInput.toLowerCase().includes('uniswap')) {
      
      if (isBrianAIConfigured()) {
        try {
          const knowledgeResponse = await getDeFiKnowledge(currentInput, 'celo');
          let response = knowledgeResponse.answer;
          
          // Add Attestify context if relevant
          if (response.toLowerCase().includes('yield') || 
              response.toLowerCase().includes('apy') || 
              response.toLowerCase().includes('earning')) {
            response += `\n\n**Your Attestify Vault:**\n• Current Balance: ${vaultBalance} cUSD\n• APY: ${currentAPY}%\n• Strategy: ${currentStrategy}\n• Total Earnings: ${earnings} cUSD`;
          }
          
          // Add sources if available
          if (knowledgeResponse.sources && knowledgeResponse.sources.length > 0) {
            response += `\n\n**Sources:**\n`;
            knowledgeResponse.sources.slice(0, 3).forEach(source => {
              response += `• ${source.title}: ${source.source}\n`;
            });
          }
          
          return response;
        } catch (error) {
          console.log('Knowledge API error, using fallback:', error);
        }
      }
      
      // Fallback for DeFi questions
      return `🤖 I can help explain DeFi concepts! Here's what I know about your question:\n\n**DeFi Basics:**\n• DeFi = Decentralized Finance\n• Uses smart contracts instead of banks\n• You control your own funds\n• Earn yield through protocols like Aave\n\n**Your Attestify Experience:**\n• You're already using DeFi! 🎉\n• Your cUSD earns yield through Mock Aave\n• Current APY: ${currentAPY}%\n• Strategy: ${currentStrategy}\n\n**Want to learn more?** Ask me about:\n• Yield farming\n• Liquidity pools\n• Smart contracts\n• Risk management\n\nWhat specific DeFi topic interests you? 🚀`;
    }
    // Default fallback
    else {
      return `🤖 I'm your Attestify AI assistant! I can help you with:\n\n**Vault Management:**\n• Check your balance and earnings\n• Deposit or withdraw funds\n• Analyze your performance\n• Assess risks\n\n**Financial Advice:**\n• Strategy recommendations\n• Yield optimization tips\n• DeFi education\n\n**Quick Actions:**\n• Click the buttons below for instant help\n• Ask me anything about your vault!\n\nWhat would you like to know? 🚀`;
    }
  };

  const handleQuickAction = (query: string) => {
    setInput(query);
  };

  const executeAction = (action: Message['actionable']) => {
    if (!action) return;

    switch (action.type) {
      case 'deposit':
        if (action.amount && onDeposit) {
          onDeposit(action.amount);
          addMessage('assistant', `✅ Initiating deposit of ${action.amount} cUSD...`);
        }
        break;
      case 'withdraw':
        if (action.amount && onWithdraw) {
          onWithdraw(action.amount);
          addMessage('assistant', `✅ Initiating withdrawal of ${action.amount} cUSD...`);
        }
        break;
      case 'strategy':
        if (action.strategy !== undefined && onStrategyChange) {
          onStrategyChange(action.strategy);
          addMessage('assistant', `✅ Changing strategy...`);
        }
        break;
    }
  };

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    const message: Message = {
      role,
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, message]);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-4 ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.role === 'assistant' && (
              <div className="h-10 w-10 bg-gradient-to-br from-green-600 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                <Bot className="h-5 w-5 text-white" />
              </div>
            )}
            <div className="flex flex-col max-w-2xl">
              <div
                className={`rounded-2xl p-6 shadow-sm ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-green-600 to-blue-600 text-white'
                    : 'bg-white border border-gray-200'
                }`}
              >
                <p className={`text-sm whitespace-pre-wrap leading-relaxed ${
                  message.role === 'user' ? 'text-white' : 'text-gray-900'
                }`}>
                  {message.content}
                </p>
                <span className={`text-xs mt-3 block ${
                  message.role === 'user' ? 'text-white/70' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>
              
              {/* Actionable buttons */}
              {message.actionable && (
                <button
                  onClick={() => executeAction(message.actionable)}
                  className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all shadow-md"
                >
                  ✓ Execute Action
                </button>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-4">
            <div className="h-10 w-10 bg-gradient-to-br from-green-600 to-blue-600 rounded-full flex items-center justify-center shadow-md">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <Loader2 className="h-5 w-5 animate-spin text-gray-600" />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 border-t border-gray-200 bg-white">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything about your vault..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 placeholder-gray-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
          aria-label='submit-button'
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-blue-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
        
        {/* Quick Actions */}
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-gray-600">Quick Actions:</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleQuickAction('What\'s my current balance?')}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-900 rounded-xl text-sm font-medium hover:bg-gray-50 hover:border-green-300 transition-all"
            >
              <DollarSign className="h-4 w-4 inline mr-1" />
              Balance
            </button>
            <button
              onClick={() => handleQuickAction('How is my performance?')}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-900 rounded-xl text-sm font-medium hover:bg-gray-50 hover:border-blue-300 transition-all"
            >
              <TrendingUp className="h-4 w-4 inline mr-1" />
              Performance
            </button>
            <button
              onClick={() => handleQuickAction('Should I change my strategy?')}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-900 rounded-xl text-sm font-medium hover:bg-gray-50 hover:border-purple-300 transition-all"
            >
              <Target className="h-4 w-4 inline mr-1" />
              Strategy
            </button>
            <button
              onClick={() => handleQuickAction('What are the risks?')}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-900 rounded-xl text-sm font-medium hover:bg-gray-50 hover:border-orange-300 transition-all"
            >
              <AlertCircle className="h-4 w-4 inline mr-1" />
              Risks
            </button>
            <button
              onClick={() => handleQuickAction('How can I withdraw?')}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-900 rounded-xl text-sm font-medium hover:bg-gray-50 hover:border-red-300 transition-all"
            >
              <ArrowDownLeft className="h-4 w-4 inline mr-1" />
              Withdraw
            </button>
            <button
              onClick={() => handleQuickAction('How can I deposit?')}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-900 rounded-xl text-sm font-medium hover:bg-gray-50 hover:border-green-300 transition-all"
            >
              <ArrowUpRight className="h-4 w-4 inline mr-1" />
              Deposit
            </button>
          </div>
        </div>

        {!isBrianAIConfigured() && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-800">
              ⚠️ <strong>Brian AI not configured.</strong> Add your API key to enable advanced AI features.
              <br />
              <span className="text-yellow-700">
                Get your API key from https://brianknows.org and add NEXT_PUBLIC_BRIAN_API_KEY to your .env.local
              </span>
            </p>
          </div>
        )}
        
        {isBrianAIConfigured() && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-xs text-green-800">
              ✅ <strong>AI Enabled:</strong> Brian AI is active and ready to help with DeFi questions and vault management.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
