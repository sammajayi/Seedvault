"use client"

export default function UseCasesSlider() {
  const items = [
    { title: "Beginner Investors", text: "AI helps you avoid common mistakes." },
    { title: "Busy Professionals", text: "Automated strategies working 24/7." },
    { title: "Advanced DeFi users", text: "Advanced insights, predictions & on-chain analytics." },
  ]

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-bold mb-6">Who benefits</h2>
        <div className="overflow-x-auto no-scrollbar -mx-4 px-4">
          <div className="flex gap-4">
            {items.map((it) => (
              <div key={it.title} className="min-w-[260px] p-4 bg-card/60 border border-input rounded-lg">
                <h4 className="font-semibold mb-2">{it.title}</h4>
                <p className="text-sm text-foreground/70">{it.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
