"use client"

export default function Footer() {
  return (
    <footer className="py-8">
      <div className="container mx-auto px-4 text-sm text-foreground/70">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          <div>
            <div className="font-semibold">SeedVault</div>
            <div className="text-xs">Smart, non-custodial DeFi manager</div>
          </div>

          <div className="flex gap-6">
            <div className="flex flex-col gap-2">
              <div className="font-semibold">Resources</div>
              <a href="#docs" className="text-foreground/70">Documentation</a>
              <a href="#github" className="text-foreground/70">GitHub</a>
            </div>

            <div className="flex flex-col gap-2">
              <div className="font-semibold">Company</div>
              <a href="#about" className="text-foreground/70">About</a>
              <a href="#contact" className="text-foreground/70">Contact</a>
            </div>
          </div>

          <div className="flex flex-col gap-2 items-start md:items-end">
            <div className="font-semibold">Legal</div>
            <a href="#terms" className="text-foreground/70">Terms</a>
            <a href="#privacy" className="text-foreground/70">Privacy</a>
          </div>
        </div>
        <div className="mt-6 text-xs text-foreground/60">© {new Date().getFullYear()} SeedVault. All rights reserved.</div>
      </div>
    </footer>
  )
}
