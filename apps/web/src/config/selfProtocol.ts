/**
 * Self Protocol Configuration
 * 
 * Self Protocol provides privacy-preserving identity verification using zero-knowledge proofs.
 * Learn more: https://docs.self.id
 */

import { SELF_PROTOCOL_CONFIG_ID } from '@/abis';

// Self Protocol API endpoints
export const SELF_PROTOCOL_CONFIG = {
  // Verification URL (production)
  verificationUrl: 'https://app.self.id/verify',
  
  // Config ID from the smart contract
  configId: SELF_PROTOCOL_CONFIG_ID,
  
  // Chain ID for Celo Sepolia testnet
  chainId: 11142220,
  
  // Message event types from Self Protocol
  events: {
    success: 'SELF_VERIFICATION_SUCCESS',
    error: 'SELF_VERIFICATION_ERROR',
    cancelled: 'SELF_VERIFICATION_CANCELLED',
  },
  
  // Trusted origins for postMessage communication
  trustedOrigins: [
    'https://app.self.id',
    'https://self.id',
  ],
  
  // Popup window dimensions
  popup: {
    width: 500,
    height: 700,
    features: 'scrollbars=yes,resizable=yes',
  },
} as const;

/**
 * Build Self Protocol verification URL
 */
export function buildVerificationUrl(walletAddress: string): string {
  const params = new URLSearchParams({
    configId: SELF_PROTOCOL_CONFIG.configId,
    address: walletAddress,
    chainId: SELF_PROTOCOL_CONFIG.chainId.toString(),
  });
  
  return `${SELF_PROTOCOL_CONFIG.verificationUrl}?${params.toString()}`;
}

/**
 * Validate if message origin is from Self Protocol
 */
export function isValidSelfProtocolOrigin(origin: string): boolean {
  return SELF_PROTOCOL_CONFIG.trustedOrigins.some(trusted => 
    origin.includes(trusted.replace('https://', ''))
  );
}

/**
 * Format popup window features string
 */
export function getPopupFeatures(): string {
  const { width, height, features } = SELF_PROTOCOL_CONFIG.popup;
  return `width=${width},height=${height},${features}`;
}
