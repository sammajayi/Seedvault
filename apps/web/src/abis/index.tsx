import VaultABI from './Vault.json';

// Contract addresses
export const CONTRACT_ADDRESSES = {
  ATTESTIFY_VAULT: "0x996137a2906206284A5EaAc5c8b13B9b1162a563" as `0x${string}`, // Fixed AttestifyVault
  CUSD_TOKEN: "0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b" as `0x${string}`, // Real Celo Sepolia cUSD
} as const;

// Self Protocol Config ID
export const SELF_PROTOCOL_CONFIG_ID = "0x986751c577aa5cfaef6f49fa2a46fa273b04e1bf78250966b8037dccf8afd399";

// Import ABI from JSON file
export const ATTESTIFY_VAULT_ABI = VaultABI.abi;

// ERC20 Token ABI (for cUSD approval and balance checks)
export const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }]
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }]
  }
] as const;

// Contract configuration
export const CONTRACT_CONFIG = {
  address: CONTRACT_ADDRESSES.ATTESTIFY_VAULT,
  abi: ATTESTIFY_VAULT_ABI,
} as const;

// cUSD Token configuration
export const CUSD_CONFIG = {
  address: CONTRACT_ADDRESSES.CUSD_TOKEN,
  abi: ERC20_ABI,
} as const;

// Strategy types enum
export const STRATEGY_TYPES = {
  CONSERVATIVE: 0,
  BALANCED: 1,
  GROWTH: 2,
} as const;

// Strategy names mapping
export const STRATEGY_NAMES = {
  [STRATEGY_TYPES.CONSERVATIVE]: 'Conservative',
  [STRATEGY_TYPES.BALANCED]: 'Balanced',
  [STRATEGY_TYPES.GROWTH]: 'Growth',
} as const;