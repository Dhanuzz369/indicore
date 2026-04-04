// components/landing/Footer.tsx
'use client'

const productLinks = ['Mock Tests', 'Analytics Dashboard', 'Flashcards']
const resourceLinks = ['Study Planner', 'UPSC Guide', 'Success Stories', 'Knowledge Base']

export default function Footer() {
  return (
    <footer className="bg-white border-t border-stone-200 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-6 md:px-8 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-16">
        {/* Brand */}
        <div>
          <div className="text-2xl font-black text-[#1A1C1C] mb-5">Indicore</div>
          <p className="text-[#43494D] leading-relaxed text-sm">
            Crafting premium learning experiences for the modern scholar.
            Precise. Focused. Authoritative.
          </p>
        </div>

        {/* Product */}
        <div>
          <h4 className="font-black text-xs uppercase tracking-[0.2em] mb-6 text-[#1A1C1C]">Product</h4>
          <ul className="space-y-3">
            {productLinks.map((l) => (
              <li key={l}>
                <a href="#" className="text-[#43494D] hover:text-[#4A90E2] transition-colors text-sm">
                  {l}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Resources */}
        <div>
          <h4 className="font-black text-xs uppercase tracking-[0.2em] mb-6 text-[#1A1C1C]">Resources</h4>
          <ul className="space-y-3">
            {resourceLinks.map((l) => (
              <li key={l}>
                <a href="#" className="text-[#43494D] hover:text-[#4A90E2] transition-colors text-sm">
                  {l}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Connect */}
        <div>
          <h4 className="font-black text-xs uppercase tracking-[0.2em] mb-6 text-[#1A1C1C]">Connect</h4>
          <div className="flex gap-3">
            {['↗', '🔔', '✉'].map((icon, i) => (
              <a
                key={i}
                href="#"
                className="w-10 h-10 rounded-full bg-[#F4F3F2] flex items-center justify-center text-[#43494D] hover:bg-[#4A90E2] hover:text-white transition-all text-sm"
              >
                {icon}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="max-w-7xl mx-auto px-6 md:px-8 flex flex-col md:flex-row items-center justify-between pt-8 border-t border-stone-200 gap-4">
        <p className="text-[#43494D] text-xs font-bold uppercase tracking-widest">
          © 2025 Indicore. Crafted for the Modern Scholar.
        </p>
        <div className="flex gap-8">
          <a href="#" className="text-xs font-bold text-[#43494D] uppercase tracking-widest hover:text-[#1A1C1C]">Privacy</a>
          <a href="#" className="text-xs font-bold text-[#43494D] uppercase tracking-widest hover:text-[#1A1C1C]">Terms</a>
        </div>
      </div>
    </footer>
  )
}
