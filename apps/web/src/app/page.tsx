"use client";
import { useMiniApp } from "@/contexts/miniapp-context"
import { sdk } from "@farcaster/miniapp-sdk"
import { useState, useEffect } from "react"
import { useAccount, useConnect } from "wagmi"

import Hero from "@/components/landing/Hero"
import ValueBar from "@/components/landing/ValueBar"
import HowItWorks from "@/components/landing/HowItWorks"
import DashboardPreview from "@/components/landing/DashboardPreview"
import TrustSection from "@/components/landing/TrustSection"
import UseCasesSlider from "@/components/landing/UseCasesSlider"
import Footer from "@/components/landing/Footer"
import { WalletConnectButton } from "@/components/connect-button"

export default function Home() {
  const { context, isMiniAppReady } = useMiniApp()
  const [isAddingMiniApp, setIsAddingMiniApp] = useState(false)
  const [addMiniAppMessage, setAddMiniAppMessage] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const LOCAL_KEY = "seedvault_miniapp_accepted"
  
  // Wallet connection hooks
  const { address, isConnected, isConnecting } = useAccount()
  const { connect, connectors } = useConnect()
  
  // Auto-connect wallet when miniapp is ready
  useEffect(() => {
    if (isMiniAppReady && !isConnected && !isConnecting && connectors.length > 0) {
      const farcasterConnector = connectors.find((c) => c.id === "farcaster")
      if (farcasterConnector) {
        connect({ connector: farcasterConnector })
      }
    }
  }, [isMiniAppReady, isConnected, isConnecting, connectors, connect])

  // Show Add Miniapp modal on landing until user accepts
  useEffect(() => {
    try {
      const accepted = localStorage.getItem(LOCAL_KEY)
      if (accepted !== "true") {
        setShowAddModal(true)
      }
    } catch (e) {
      setShowAddModal(true)
    }
  }, [])

  if (!isMiniAppReady) {
    return (
      <main className="flex-1">
        <section className="flex items-center justify-center min-h-screen">
          <div className="w-full max-w-md mx-auto p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-foreground/70">Loading...</p>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="flex-1">
      <Hero />

      {/* Add Miniapp Modal (auto-shows until accepted) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddModal(false)} />
          <div className="relative z-10 w-full max-w-lg p-6 bg-card/90 backdrop-blur-md border border-input rounded-2xl">
            <h3 className="text-xl font-semibold mb-3">Add SeedVault Miniapp</h3>
            <p className="text-sm text-foreground/70 mb-6">SeedVault enhances your DeFi experience inside Farcaster — add it to get AI-driven automation and insights.</p>
            <div className="flex items-center gap-3">
              <button
                onClick={async () => {
                  if (isAddingMiniApp) return
                  setIsAddingMiniApp(true)
                  setAddMiniAppMessage(null)
                  try {
                    const result = await sdk.actions.addMiniApp()
                        if ((result as any)?.added) {
                      setAddMiniAppMessage("✅ Miniapp added successfully!")
                      try { localStorage.setItem(LOCAL_KEY, "true") } catch {}
                      setShowAddModal(false)
                    } else {
                      setAddMiniAppMessage("ℹ️ Miniapp was not added (user declined or already exists)")
                    }
                  } catch (error: any) {
                    console.error("Add miniapp error:", error)
                    setAddMiniAppMessage("❌ Failed to add miniapp. Please try again.")
                  } finally {
                    setIsAddingMiniApp(false)
                  }
                }}
                className="bg-primary text-primary-foreground px-4 py-2 rounded font-semibold"
              >
                {isAddingMiniApp ? 'Adding...' : 'Add Miniapp'}
              </button>

              <button
                onClick={() => setShowAddModal(false)}
                className="border border-input px-4 py-2 rounded"
              >
                Not now
              </button>
            </div>

            {addMiniAppMessage && <p className="mt-4 text-sm text-foreground/70">{addMiniAppMessage}</p>}
          </div>
        </div>
      )}

      {/* Add Miniapp CTA (kept from previous page for functionality) */}
      <section className="container mx-auto px-4 py-6">
        <div className="max-w-md mx-auto">
          <button
            onClick={async () => {
              if (isAddingMiniApp) return

              setIsAddingMiniApp(true)
              setAddMiniAppMessage(null)

              try {
                const result = await sdk.actions.addMiniApp()
                    if ((result as any)?.added) {
                  setAddMiniAppMessage("✅ Miniapp added successfully!")
                } else {
                  setAddMiniAppMessage("ℹ️ Miniapp was not added (user declined or already exists)")
                }
              } catch (error: any) {
                console.error("Add miniapp error:", error)
                if (error?.message?.includes("domain")) {
                  setAddMiniAppMessage("⚠️ This miniapp can only be added from its official domain")
                } else {
                  setAddMiniAppMessage("❌ Failed to add miniapp. Please try again.")
                }
              } finally {
                setIsAddingMiniApp(false)
              }
            }}
            disabled={isAddingMiniApp}
            className="w-full bg-primary hover:brightness-105 text-primary-foreground font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
          >
            {isAddingMiniApp ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Adding...
              </>
            ) : (
              <>
                <span>📱</span>
                Add Miniapp
              </>
            )}
          </button>

          {addMiniAppMessage && (
            <div className="mt-3 p-3 bg-card/30 backdrop-blur-sm rounded-lg">
              <p className="text-sm text-foreground/70">{addMiniAppMessage}</p>
            </div>
          )}
        </div>
      </section>

      <ValueBar />
      <HowItWorks />
      <DashboardPreview />
      <TrustSection />
      <UseCasesSlider />
      
      <Footer />
    </main>
  )
}

