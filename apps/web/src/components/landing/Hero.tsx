"use client"

import Link from "next/link"
import DashboardPreview from "./DashboardPreview"

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-20 pb-12">
      <div className="container mx-auto px-4 flex flex-col-reverse lg:flex-row items-center gap-10">
        {/* Left: Copy */}
        <div className="w-full lg:w-1/2">
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 text-foreground leading-tight">Smarter DeFi Starts Here</h1>
          <p className="text-base sm:text-lg text-foreground/80 mb-6 max-w-xl">
            SeedVault uses AI-driven optimization to help you grow, protect, and manage your wealth with ease.
          </p>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Link href="/dashboard" className="inline-flex items-center gap-2 bg-primary hover:brightness-105 text-primary-foreground font-semibold px-6 py-3 rounded shadow-md transition">
              Earn Now
            </Link>
            <Link href="#learn" className="inline-flex items-center gap-2 border border-input px-4 py-2 rounded text-foreground/90">
              Learn how it works
            </Link>
          </div>

          <div className="mt-6 text-sm text-foreground/70 max-w-lg">
            Join early adopters using automated strategies, on-chain analytics, and an assistant that helps you act with confidence.
          </div>
        </div>

        {/* Right: Visual - visible on large screens */}
        <div className="w-full lg:w-1/2 flex items-center justify-center">
          <div className="hidden lg:block w-full max-w-lg rounded-2xl bg-card/60 backdrop-blur-md border border-input p-4 shadow-2xl">
            <div className="relative rounded-xl overflow-hidden">
              <div className="absolute -inset-1 blur-3xl opacity-30 bg-[radial-gradient(circle_at_top_left,rgba(74,252,180,0.12),transparent 30%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent)]" />
              <div className="relative z-10">
                <DashboardPreview />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
