// components/landing/MarqueeBanner.tsx
'use client'

function IconStar() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="#f59e0b" stroke="none">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}
function IconUsers() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4A90E2" strokeWidth="2.2" strokeLinecap="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
function IconTrophy() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
    </svg>
  )
}
function IconBook() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4A90E2" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  )
}
function IconQuote() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="#4A90E2" opacity="0.7">
      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
    </svg>
  )
}
function IconCheck() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4A90E2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

const items = [
  { icon: <IconTrophy />, text: 'Rank 12 Recommendation' },
  { icon: <IconUsers />, text: '10,000+ Active Aspirants' },
  { icon: <IconQuote />, text: '"The analytics changed how I view my prep." — Anjali S.' },
  { icon: <IconStar />, text: '4.9/5 Average Mock Score' },
  { icon: <IconTrophy />, text: '296+ Successful Ranks' },
  { icon: <IconBook />, text: '25,000+ Curated Questions' },
  { icon: <IconCheck />, text: 'IAS · IPS · IFS Ranks' },
]

export default function MarqueeBanner() {
  return (
    <section className="py-8 bg-white overflow-hidden border-y border-black/[0.04]">
      <style>{`
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .marquee-track { animation: marquee 44s linear infinite; }
        .marquee-track:hover { animation-play-state: paused; }
      `}</style>
      <div className="flex whitespace-nowrap marquee-track select-none">
        {[...items, ...items].map((item, i) => (
          <div
            key={i}
            className="inline-flex items-center gap-2.5 bg-[#F8F8FA] px-5 py-2.5 rounded-full mx-3 shrink-0 border border-black/[0.04]"
          >
            {item.icon}
            <span className="font-bold text-[#43494D] text-sm">{item.text}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
