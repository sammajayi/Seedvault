"use client"

import { useState } from "react"
import { useAccount } from "wagmi"
import { useMiniApp } from "@/contexts/miniapp-context"
import { WalletConnectButton } from "@/components/connect-button"

export function ProfileMenu() {
  const { address, isConnected } = useAccount()
  const { context } = useMiniApp()
  const user = context?.user
  const displayName = user?.displayName || user?.username || null
  const pfpUrl = user?.pfpUrl || null
  const [open, setOpen] = useState(false)

  const short = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null

  if (!isConnected && !displayName) {
    return <WalletConnectButton />
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((s) => !s)}
        className="inline-flex items-center gap-3 rounded-md px-3 py-1.5 bg-background border border-input hover:shadow-[0_0_20px_rgba(0,196,154,0.12)]"
      >
        <span className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          {pfpUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pfpUrl} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="block w-3 h-3 rounded-full bg-white" />
          )}
        </span>
        <div className="hidden sm:flex flex-col items-start leading-tight">
          <span className="text-sm font-medium">{displayName ?? short}</span>
          {short && <span className="text-xs text-foreground/70 font-mono">{short}</span>}
        </div>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-card/80 backdrop-blur-md border border-input rounded-md p-2 shadow-md">
          <div className="flex flex-col gap-2">
            <a href="#" className="text-sm px-2 py-1 hover:bg-accent/10 rounded">View Profile</a>
            <a href="#" className="text-sm px-2 py-1 hover:bg-accent/10 rounded">Settings</a>
            <a href="#" className="text-sm px-2 py-1 hover:bg-accent/10 rounded">Disconnect</a>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProfileMenu
