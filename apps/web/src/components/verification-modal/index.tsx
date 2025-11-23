"use client"

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, CheckCircle, AlertCircle, Loader2, X, Smartphone, Monitor } from 'lucide-react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { getAddress, isAddress } from 'viem';
import { countries, SelfQRcodeWrapper, SelfAppBuilder, getUniversalLink } from '@selfxyz/qrcode';
import { CONTRACT_ADDRESSES } from '../../config/contract';
import { ATTESTIFY_VAULT_ABI } from '@/abis';

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
}

export default function VerificationModal({ isOpen, onClose, onVerified }: VerificationModalProps) {
  const { address } = useAccount();
  const [step, setStep] = useState<'intro' | 'qrcode' | 'mobile' | 'success' | 'submitting' | 'error'>('intro');
  const [errorMessage, setErrorMessage] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selfApp, setSelfApp] = useState<any | null>(null);
  const [universalLink, setUniversalLink] = useState('');
  const [, setVerificationMethod] = useState<'desktop' | 'mobile'>('desktop');
  const [, _setVerificationProof] = useState<string>('');

  // Contract write for submitting proof
  const { writeContract, data: txHash, error: writeError } = useWriteContract();
  
  // Wait for transaction confirmation
  const { 
    isSuccess: isTxSuccess, 
    isError: isTxError,
    error: txError 
  } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Handle transaction errors
  useEffect(() => {
    if (isTxError || writeError) {
      console.error('❌ Transaction error:', txError || writeError);
      setErrorMessage(
        (txError?.message || writeError?.message || 'Transaction failed').substring(0, 200)
      );
      setStep('error');
    }
  }, [isTxError, txError, writeError]);

  // Initialize Self App when modal opens
  useEffect(() => {
    if (!isOpen || !address) return;

    try {
      // Validate and format addresses
      if (!isAddress(address)) {
        throw new Error('Invalid user wallet address');
      }

      const userAddress = getAddress(address);
      // IMPORTANT: endpoint must be the SelfProtocolVerification contract address, not the vault
      // The SelfProtocolVerification contract has the verifySelfProof function that Self Protocol calls
      const endpointAddress = CONTRACT_ADDRESSES.celoSepolia.selfProtocol;

      if (!endpointAddress) {
        throw new Error('Self Protocol contract address not configured. Set NEXT_PUBLIC_SELF_PROTOCOL_ADDRESS');
      }

      if (!isAddress(endpointAddress)) {
        throw new Error('Invalid Self Protocol contract address configuration');
      }

      // Use checksummed address for endpoint (Self Protocol handles address formatting internally)
      const checksummedEndpoint = getAddress(endpointAddress);

      console.log('🔍 Initializing Self App with:', {
        userId: userAddress,
        endpoint: checksummedEndpoint,
        endpointType: 'celo-staging',
        scope: process.env.NEXT_PUBLIC_SELF_SCOPE || 'attestify',
        network: 'Celo Sepolia',
        chainId: 11142220,
      });
      
      // Verify endpoint address is set correctly
      if (checksummedEndpoint.toLowerCase() !== '0x2fb9c37215410f97e0fe2906c0e940aa483decf6') {
        console.warn('⚠️ Endpoint address does not match deployed SelfProtocolVerification contract');
      }

      const app = new SelfAppBuilder({
        version: 2,
        appName: process.env.NEXT_PUBLIC_SELF_APP_NAME || 'Attestify',
        scope: process.env.NEXT_PUBLIC_SELF_SCOPE || 'attestify',
        endpoint: checksummedEndpoint, // Use checksummed address
        logoBase64: 'https://i.postimg.cc/mrmVf9hm/self.png',
        userId: userAddress,
        endpointType: 'celo-staging', // Fixed: must be 'celo-staging' for Celo Sepolia, not 'staging_celo'
        userIdType: 'hex', // 'hex' for EVM address or 'uuid' for uuidv4
        userDefinedData: `Attestify verification for ${userAddress}`,
        disclosures: {
          // Required verifications for DeFi compliance
          minimumAge: 18,
          excludedCountries: [
            countries.CUBA,
            countries.IRAN,
            countries.NORTH_KOREA,
            countries.RUSSIA,
          ],
          // Optional: Request additional information
          nationality: true,
        },
      }).build();

      console.log('✅ Self App built successfully');
      setSelfApp(app);

      // Generate universal link for mobile users
      const link = getUniversalLink(app);
      console.log('✅ Universal link generated:', link);
      setUniversalLink(link);
    } catch (error: unknown) {
      console.error('❌ Failed to initialize Self App:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to initialize verification';
      setErrorMessage(errorMsg);
      setStep('error');
    }
  }, [isOpen, address]);

  // Handle transaction success
  useEffect(() => {
    if (isTxSuccess) {
      setStep('success');
      setTimeout(() => {
        onVerified();
        setTimeout(() => onClose(), 1000);
      }, 2000);
    }
  }, [isTxSuccess, txHash, onVerified, onClose]);

  // Handle successful verification from Self Protocol
  const handleSuccessfulVerification = async (proofData?: unknown) => {
    console.log('✅ Identity verified by Self Protocol!');
    console.log('Proof data received:', proofData);
    
    setStep('submitting');
    
    try {
      // Extract proof data from Self Protocol response
      // The proofData may contain proofPayload and userContextData
      let proofPayload = '0x';
      let userContextData = '0x';
      
      if (proofData && typeof proofData === 'object') {
        const data = proofData as { proof?: string; proofPayload?: string; userContextData?: string; [key: string]: unknown };
        proofPayload = (data.proofPayload || data.proof || '0x') as string;
        userContextData = (data.userContextData || '0x') as string;
      }
      
      console.log('📤 Calling contract verifySelfProof function...');
      console.log('Contract address:', CONTRACT_ADDRESSES.celoSepolia.vault);
      console.log('Proof payload length:', proofPayload.length);
      console.log('User context data length:', userContextData.length);
      
      await writeContract({
        address: CONTRACT_ADDRESSES.celoSepolia.vault as `0x${string}`,
        abi: ATTESTIFY_VAULT_ABI,
        functionName: 'verifySelfProof',
        args: [proofPayload as `0x${string}`, userContextData as `0x${string}`],
      });
      
      console.log('✅ Contract verification call initiated!');
      
    } catch (error) {
      console.error('❌ Contract verification failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Contract verification failed';
      setErrorMessage(`Contract verification failed: ${errorMsg.substring(0, 200)}`);
      setStep('error');
    }
  };

  const handleVerificationError = (data?: { error_code?: string; reason?: string; status?: string; proof?: unknown }) => {
    console.error('❌ Self Protocol verification error:', data);
    console.error('Error details:', {
      error_code: data?.error_code,
      reason: data?.reason,
      status: data?.status,
      endpoint: CONTRACT_ADDRESSES.celoSepolia.selfProtocol,
      scope: process.env.NEXT_PUBLIC_SELF_SCOPE || 'attestify',
    });
    
    let errorMsg = 'Verification failed. Please try again.';
    
    if (data) {
      // Parse the error reason which might contain JSON
      if (data.reason) {
        try {
          // Try to parse if it's a JSON string
          const parsed = JSON.parse(data.reason);
          if (parsed.message) {
            errorMsg = parsed.message;
          } else {
            errorMsg = data.reason;
          }
        } catch {
          // If not JSON, use as-is
          errorMsg = data.reason;
        }
      } else if (data.error_code) {
        errorMsg = `Error: ${data.error_code}`;
        if (data.status) {
          errorMsg += ` (${data.status})`;
        }
      }
      
      // Check if it's a proof generation failure
      if (data.status === 'proof_generation_failed') {
        errorMsg = 'Proof generation failed. This may be due to:\n' +
          '1. Contract not properly deployed or verified\n' +
          '2. Network connectivity issues\n' +
          '3. Contract configuration mismatch\n' +
          '4. Self Protocol service temporarily unavailable\n\n' +
          `Endpoint: ${CONTRACT_ADDRESSES.celoSepolia.selfProtocol}\n` +
          `Scope: ${process.env.NEXT_PUBLIC_SELF_SCOPE || 'attestify'}`;
      } else if (data.reason?.includes('execution reverted')) {
        errorMsg = 'Contract execution reverted. The contract may not be properly configured or the proof validation is failing.';
      }
    }
    
    setErrorMessage(errorMsg.substring(0, 400)); // Limit error message length
    setStep('error');
  };

  const handleStartVerification = (method: 'desktop' | 'mobile') => {
    if (!address) {
      setErrorMessage('Please connect your wallet first');
      setStep('error');
      return;
    }
    if (!selfApp) {
      setErrorMessage('Self App not initialized. Please try again.');
      setStep('error');
      return;
    }
    setVerificationMethod(method);
    setStep(method === 'desktop' ? 'qrcode' : 'mobile');
  };

  const openSelfApp = () => {
    if (!universalLink) return;
    window.open(universalLink, '_blank');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-blue-600 p-6 text-white">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Identity Verification</h2>
                  <p className="text-sm text-white/80">Powered by Self Protocol</p>
                </div>
              </div>
              {step === 'intro' && (
                <button aria-label="close" onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          <div className="p-6">
            {step === 'intro' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Why verify?</h3>
                  <ul className="space-y-2 text-sm text-blue-800">
                    <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /><span>Access to all platform features</span></li>
                    <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /><span>Secure and privacy-preserving</span></li>
                    <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /><span>One-time verification process</span></li>
                    <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /><span>Age 18+ and compliance checks</span></li>
                  </ul>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800 font-medium mb-1">🧪 Testing Mode</p>
                  <p className="text-xs text-yellow-700">Using Self Protocol staging_celo endpoint. Contract will mark you as verified after successful verification.</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700 mb-3">Self Protocol uses zero-knowledge proofs to verify your identity without sharing personal data on-chain.</p>
                  <p className="text-xs text-gray-600 font-medium mb-2">Choose your device:</p>
                </div>

                <button onClick={() => handleStartVerification('desktop')} disabled={!selfApp} className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-blue-700 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-3">
                  <Monitor className="h-5 w-5" />
                  <div className="text-left"><div>Verify on Desktop</div><div className="text-xs opacity-90">Scan QR code with Self app</div></div>
                </button>

                <button onClick={() => handleStartVerification('mobile')} disabled={!selfApp || !universalLink} className="w-full px-6 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-3">
                  <Smartphone className="h-5 w-5" />
                  <div className="text-left"><div>Verify on Mobile</div><div className="text-xs opacity-90">Open Self app directly</div></div>
                </button>
              </motion.div>
            )}

            {step === 'qrcode' && selfApp && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-sm font-medium text-gray-900 mb-2">Scan with Self App</p>
                  <p className="text-xs text-gray-600 mb-4">Use your phone's Self app to scan this QR code</p>
                  <div className="flex justify-center">
                    <SelfQRcodeWrapper selfApp={selfApp} onSuccess={handleSuccessfulVerification} onError={handleVerificationError} size={280} darkMode={false} />
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-900 font-medium mb-2">Instructions:</p>
                  <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Open the Self app on your mobile device</li>
                    <li>Tap "Scan QR Code"</li>
                    <li>Complete the verification steps in the app</li>
                    <li>You'll be verified automatically</li>
                  </ol>
                </div>

                <button onClick={() => setStep('intro')} className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900 underline">← Back to options</button>
              </motion.div>
            )}

            {step === 'mobile' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="text-center py-6">
                  <div className="h-16 w-16 bg-gradient-to-br from-green-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Smartphone className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Open Self App</h3>
                  <p className="text-sm text-gray-600 mb-6">Complete verification directly in your Self mobile app</p>
                  <button onClick={openSelfApp} disabled={!universalLink} className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-blue-700 transition-all shadow-lg disabled:opacity-50">Open Self App</button>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-700 font-medium mb-2">What happens next:</p>
                  <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
                    <li>The Self app will open on your device</li>
                    <li>Complete the verification steps</li>
                    <li>Return here when done</li>
                  </ol>
                </div>

                <button onClick={() => setStep('intro')} className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900 underline">← Back to options</button>
              </motion.div>
            )}

            {step === 'submitting' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8">
                <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Submitting to Blockchain...</h3>
                <p className="text-sm text-gray-600">Please confirm the transaction in your wallet</p>
                <p className="text-xs text-gray-500 mt-2">This will permanently verify your identity on-chain</p>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
                <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Verification Successful!</h3>
                <p className="text-sm text-gray-600">Your identity is now verified on-chain</p>
                <p className="text-xs text-gray-500 mt-2">You won't need to verify again! ✅</p>
              </motion.div>
            )}

            {step === 'error' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="text-center py-4">
                  <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="h-10 w-10 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Verification Failed</h3>
                  <p className="text-sm text-gray-600">{errorMessage}</p>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setStep('intro')} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all">Try Again</button>
                  <button onClick={onClose} className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-all">Close</button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
