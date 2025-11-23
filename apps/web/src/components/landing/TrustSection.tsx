"use client"

export default function TrustSection() {
  return (
    <section className="py-12">
      <div className="container mx-auto px-4 grid md:grid-cols-2 gap-6 items-start">
        <div>
          <h3 className="text-2xl font-bold mb-3">Proof of Security</h3>
          <ul className="space-y-3 text-foreground/80">
            <li>• Non-custodial by design</li>
            <li>• Transparent stats & audits</li>
            <li>• Open algorithms and verifiable actions</li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 p-4 rounded bg-card/50 border border-input">
            <div className="w-10 h-10 rounded-full bg-green-400/70 flex items-center justify-center">✓</div>
            <div>
              <div className="font-semibold">Non-custodial</div>
              <div className="text-sm text-foreground/70">You retain control of keys at all times.</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded bg-card/50 border border-input">
            <div className="w-10 h-10 rounded-full bg-blue-400/70 flex items-center justify-center">🔍</div>
            <div>
              <div className="font-semibold">Audited</div>
              <div className="text-sm text-foreground/70">Publicly verifiable audits and changelogs.</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
