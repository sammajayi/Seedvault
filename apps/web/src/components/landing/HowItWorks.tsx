"use client"

import { useRef } from "react"
import useInView from "@/hooks/useInView"

const steps = [
  { title: "Connect", desc: "Link your wallet in seconds." },
  { title: "Analyze", desc: "SeedVault scans risk, rewards, yield, and market patterns." },
  { title: "Grow", desc: "Launch personalized strategies with AI supervision." },
]

export default function HowItWorks() {
  const ref = useRef<HTMLElement | null>(null)
  const inView = useInView(ref)

  return (
    <section ref={ref} className="py-12" aria-labelledby="how-it-works">
      <div className="container mx-auto px-4">
        <h2 id="how-it-works" className="text-2xl font-bold mb-6">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <div
              key={s.title}
              role="article"
              aria-label={s.title}
              className={`p-6 rounded-lg border border-input bg-card/50 backdrop-blur-sm transform transition-all motion-reduce:transition-none ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
              style={{ transitionDelay: `${i * 120}ms` }}
            >
              <div className="w-10 h-10 rounded-full bg-primary/80 text-primary-foreground flex items-center justify-center mb-3">{i + 1}</div>
              <h3 className="font-semibold mb-2">{s.title}</h3>
              <p className="text-sm text-foreground/70">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
