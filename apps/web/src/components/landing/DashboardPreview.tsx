"use client"

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const data = [
  { name: 'Jan', value: 120 },
  { name: 'Feb', value: 110 },
  { name: 'Mar', value: 105 },
  { name: 'Apr', value: 90 },
  { name: 'May', value: 80 },
  { name: 'Jun', value: 65 },
  { name: 'Jul', value: 50 },
  { name: 'Aug', value: 48 },
  { name: 'Sep', value: 42 },
  { name: 'Oct', value: 38 },
  { name: 'Nov', value: 32 },
  { name: 'Dec', value: 28 },
]

export default function DashboardPreview() {
  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <div className="rounded-2xl bg-card/60 backdrop-blur-md border border-input p-6 relative overflow-hidden shadow-lg">
          <div className="absolute inset-0 pointer-events-none" />
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <div className="h-48 sm:h-56 md:h-48 rounded-lg mb-4 bg-background/0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorDown" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF6B6B" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="#FF6B6B" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.06} />
                    <XAxis dataKey="name" tick={{ fill: 'var(--foreground)' }} />
                    <YAxis tick={{ fill: 'var(--foreground)' }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="value" stroke="#FF6B6B" fillOpacity={1} fill="url(#colorDown)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-background/50 rounded shadow-sm">Portfolio</div>
                <div className="p-4 bg-background/50 rounded shadow-sm">Predictions</div>
              </div>
            </div>
            <div className="w-80 p-4 bg-background/30 rounded-lg shadow-sm">Stats</div>
          </div>
          <p className="mt-4 text-sm text-foreground/70">Your entire crypto ecosystem — managed intelligently.</p>
        </div>
      </div>
    </section>
  )
}
