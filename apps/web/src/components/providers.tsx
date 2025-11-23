"use client";

import { useEffect } from "react";
import { MiniAppProvider } from "@/contexts/miniapp-context";
import FrameWalletProvider from "@/contexts/frame-wallet-context";
import dynamic from "next/dynamic";
import { fixLocalStorageEntries } from "@/lib/fix-localstorage";

const ErudaProvider = dynamic(
  () => import("../components/Eruda").then((c) => c.ErudaProvider),
  { ssr: false }
);

export default function Providers({ children }: { children: React.ReactNode }) {
  // Fix localStorage entries before embedded wallets library initializes
  useEffect(() => {
    fixLocalStorageEntries();
  }, []);

  return (
    <ErudaProvider>
      <FrameWalletProvider>
        <MiniAppProvider addMiniAppOnLoad={true}>{children}</MiniAppProvider>
      </FrameWalletProvider>
    </ErudaProvider>
  );
}
