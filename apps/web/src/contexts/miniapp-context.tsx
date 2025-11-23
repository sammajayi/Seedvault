"use client";
// Use @farcaster/miniapp-sdk as recommended by Celo docs
// https://docs.celo.org/build-on-celo/build-with-farcaster
import { sdk } from "@farcaster/miniapp-sdk";
// Use any types for Farcaster SDK compatibility
type FrameContext = any;
type AddFrameResult = any;

// Helper function to check if we're in a Farcaster MiniApp environment
// Since isInMiniApp doesn't exist in the SDK, we check for SDK availability instead
function checkInMiniApp(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    // Check if SDK is available (indicates we're in a MiniApp environment)
    // SDK might not have actions loaded yet, so just check if sdk exists
    return !!sdk;
  } catch {
    return false;
  }
}
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import FrameWalletProvider from "./frame-wallet-context";

interface MiniAppContextType {
  isMiniAppReady: boolean;
  context: FrameContext | null;
  addMiniApp: () => Promise<AddFrameResult | null>;
}

const MiniAppContext = createContext<MiniAppContextType | undefined>(undefined);

interface MiniAppProviderProps {
  addMiniAppOnLoad?: boolean;
  children: ReactNode;
}

export function MiniAppProvider({ children, addMiniAppOnLoad }: MiniAppProviderProps): JSX.Element {
  const [context, setContext] = useState<FrameContext | null>(null);
  const [isMiniAppReady, setIsMiniAppReady] = useState(false);

  // Call ready() immediately - this is critical for Farcaster miniapps
  // According to Farcaster docs: https://miniapps.farcaster.xyz/docs/getting-started#making-your-app-display
  useEffect(() => {
    let mounted = true;
    
    const initializeSDK = async () => {
      console.log("🚀 Initializing Farcaster SDK...");
      
      // Check if we're actually in a Farcaster MiniApp environment
      const inMiniApp = checkInMiniApp();
      console.log(`📍 Environment check - inMiniApp: ${inMiniApp}`);
      
      try {
        // Check if SDK is available (might not be in non-Farcaster environments)
        if (!sdk) {
          console.warn("⚠️ Farcaster SDK object not found - running outside Farcaster client");
          if (mounted) setIsMiniAppReady(true);
          return;
        }

        // If we're in MiniApp but SDK actions aren't available, wait a bit and retry
        if (inMiniApp && !sdk.actions) {
          console.warn("⚠️ In MiniApp but SDK actions not loaded yet, waiting 100ms...");
          await new Promise(resolve => setTimeout(resolve, 100));
          
          if (!sdk.actions) {
            console.error("❌ SDK actions still not available after wait");
            if (mounted) setIsMiniAppReady(true);
            return;
          }
        }

        if (!sdk.actions) {
          console.warn("⚠️ Farcaster SDK actions not available - SDK may not be fully loaded");
          if (mounted) setIsMiniAppReady(true);
          return;
        }

        // Check if ready() method exists
        if (typeof sdk.actions.ready !== 'function') {
          console.error("❌ sdk.actions.ready is not a function. SDK:", sdk);
          if (mounted) setIsMiniAppReady(true);
          return;
        }

        console.log("📞 Calling sdk.actions.ready()...");
        
        // Call ready() FIRST to dismiss splash screen immediately
        // This must be called before anything else to hide the splash screen
        // Use Promise.race with a timeout to prevent hanging
        const readyPromise = sdk.actions.ready();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("ready() call timed out after 5 seconds")), 5000)
        );

        try {
          await Promise.race([readyPromise, timeoutPromise]);
          console.log("✅ MiniApp ready() called successfully - splash screen dismissed");
        } catch (readyErr: any) {
          // Log but don't fail - the splash screen might already be hidden
          console.warn("⚠️ ready() call warning (but continuing):", readyErr?.message || readyErr);
        }
        
        // Then get context for app state (don't let this block ready state)
        try {
          const contextValue = await sdk.context;
          if (contextValue && mounted) {
            setContext(contextValue);
            console.log("✅ SDK context retrieved");
          }
        } catch (contextErr) {
          console.warn("⚠️ Could not get SDK context (non-critical):", contextErr);
        }
      } catch (err: any) {
        console.error("❌ SDK initialization error:", err);
        console.error("Error details:", {
          message: err?.message,
          stack: err?.stack,
          sdkAvailable: !!sdk,
          actionsAvailable: !!sdk?.actions,
          readyAvailable: typeof sdk?.actions?.ready === 'function',
        });
        // Still mark as ready even if there's an error
        // This prevents the app from hanging in non-Farcaster environments
      } finally {
        if (mounted) {
          setIsMiniAppReady(true);
          console.log("✅ MiniApp marked as ready");
        }
      }
    };

    // Call immediately, don't wait for anything
    initializeSDK();

    return () => {
      mounted = false;
    };
  }, []);

  const handleAddMiniApp = useCallback(async () => {
    try {
      // @farcaster/miniapp-sdk uses addMiniApp() method
      const result = await sdk.actions.addMiniApp();
      if (result) {
        return result;
      }
      return null;
    } catch (error) {
      console.error("[error] adding miniapp", error);
      return null;
    }
  }, []);

  useEffect(() => {
    // on load, set the frame as ready
    if (isMiniAppReady && !context?.client?.added && addMiniAppOnLoad) {
      handleAddMiniApp();
    }
  }, [
    isMiniAppReady,
    context?.client?.added,
    handleAddMiniApp,
    addMiniAppOnLoad,
  ]);

  return (
    <MiniAppContext.Provider
      value={{
        isMiniAppReady,
        addMiniApp: handleAddMiniApp,
        context,
      }}
    >
      <FrameWalletProvider>{children}</FrameWalletProvider>
    </MiniAppContext.Provider>
  );
}

export function useMiniApp(): MiniAppContextType {
  const context = useContext(MiniAppContext);
  if (context === undefined) {
    throw new Error("useMiniApp must be used within a MiniAppProvider");
  }
  return context;
}
