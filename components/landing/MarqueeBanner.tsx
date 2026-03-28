// components/landing/MarqueeBanner.tsx
'use client'

const items = [
  { icon: '✓', text: 'Rank 12 Recommendation' },
  { icon: '👥', text: '10,000+ Active Aspirants' },
  { icon: '"', text: '"The analytics changed how I view my prep." — Anjali S.' },
  { icon: '★', text: '4.9/5 Average Mock Score' },
  { icon: '🏆', text: '296+ Successful Ranks' },
  { icon: '📚', text: '25,000+ Curated Questions' },
]

export default function MarqueeBanner() {
  return (
    <section className="py-10 bg-[#F4F3F2] overflow-hidden border-y border-black/5">
      <style>{`
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-track { animation: marquee 40s linear infinite; }
        .marquee-track:hover { animation-play-state: paused; }
      `}</style>
      <div className="flex whitespace-nowrap marquee-track">
        {[...items, ...items].map((item, i) => (
          <div
            key={i}
            className="inline-flex items-center gap-3 bg-white px-6 py-3 rounded-full shadow-sm mx-6 shrink-0"
          >
            <span className="text-[#4A90E2] font-bold">{item.icon}</span>
            <span className="font-bold text-[#43494D] text-sm">{item.text}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
