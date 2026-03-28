# Indicore Landing Page — Design Spec
**Date:** 2026-03-28
**Status:** Approved

---

## Overview

Replace the current minimal `app/page.tsx` with a full marketing landing page for `https://indicore-seven.vercel.app/`. The page is integrated into the existing Next.js 15 app, uses the blue color scheme (`#4A90E2`) from the prototype, and features a Three.js particle constellation hero with framer-motion scroll animations throughout.

---

## Tech Stack

| Tool | Role | Source |
|---|---|---|
| `three` + `@types/three` | Hero particle canvas (WebGL) | npm install (new) |
| `framer-motion` | All scroll animations, stagger, counters, tilts | Already installed |
| Tailwind CSS v4 | Layout and styling | Already installed |
| `next/dynamic` | SSR-safe Three.js loading | Built-in |

No GSAP. framer-motion covers all animation needs outside the Three.js canvas.

---

## Color Scheme

| Token | Value | Use |
|---|---|---|
| Primary | `#4A90E2` | Buttons, accents, borders, particle dots |
| Primary light | `#C5D8F1` | Backgrounds, gradients |
| Primary faint | `#4A90E2/10` | Stats strip background, card tints |
| Surface | `#FAFAFA` | Page background |
| On-surface | `#1A1C1C` | Body text |
| On-surface-variant | `#43494D` | Subtext, labels |

---

## File Structure

```
app/
  page.tsx                      ← Assembles all landing sections
components/
  landing/
    HeroCanvas.tsx              ← Three.js particle constellation (dynamic, ssr: false)
    HeroSection.tsx             ← Headline stagger, CTAs, badge
    NavBar.tsx                  ← Glass nav, scroll-aware opacity/shadow transition
    MarqueeBanner.tsx           ← Infinite-scroll social proof strip
    FeaturesSection.tsx         ← Accordion left + 3D tilt dashboard right
    ProcessSection.tsx          ← 3-step cards with scroll stagger
    StatsSection.tsx            ← Animated counter roll-up
    BentoSection.tsx            ← Analytics bento grid with bar chart animation
    TestimonialsSection.tsx     ← Staggered testimonial cards
    CtaBanner.tsx               ← Gradient banner with floating blobs
    Footer.tsx                  ← Static footer, no animations
```

---

## Section Specifications

### NavBar
- Sticky top, z-50
- Initial state: fully transparent, no shadow
- On scroll > 80px: transition to `bg-white/80 backdrop-blur-xl` with subtle bottom shadow
- Implemented via `framer-motion` `useScroll` + `useTransform` on `backgroundColor` and `boxShadow`
- Links: Features, Analytics, Testimonials, Pricing (scroll to anchors)
- Right: Login → `/login`, Get Started → `/signup`
- Mobile: hamburger menu (simple show/hide, no animation required)

### HeroSection + HeroCanvas
**HeroCanvas (Three.js):**
- Full-viewport canvas, `position: absolute`, behind content
- ~800 particles, blue (`#4A90E2`), size 1.5–3px, varying opacity 0.3–1.0
- Z-depth simulated: particles spread across z: -200 to +200
- Lines drawn between particles within 120px distance, opacity proportional to distance
- Mouse parallax: camera shifts ±15px on X/Y tracking cursor position, eased with lerp (0.05 factor per frame)
- Load animation: all particles fade in from opacity 0 over 2s
- Resize handler: camera aspect + renderer size update on window resize
- Loaded via `next/dynamic({ ssr: false })`

**HeroSection content:**
- "Prep Reimagined" badge: fade in first (delay 0s)
- Headline words split and stagger: `y: 60 → 0, opacity: 0 → 1`, stagger 0.08s per word (framer-motion)
- Subtext: fade+slide in after headline completes
- Two CTAs fade+slide up last:
  - Primary: "Start Your Trial" → `/signup`, blue fill, hover glow pulse
  - Secondary: "View the App" → `/login`, light gray fill

### MarqueeBanner
- CSS `animation: scroll 40s linear infinite` (from prototype)
- Duplicated content for seamless loop
- Content: Rank 12 recommendation, 10K+ aspirants, testimonial quote, 4.9/5 score

### FeaturesSection
- Two-column grid (lg), single column (mobile)
- **Left — Feature accordion:**
  - Three feature items: Deep Performance Dials, Adaptive Flashcards, Focus-Mode Dashboards
  - Click to expand: framer-motion `AnimatePresence` + `height: 0 → auto` animation
  - Active item: left blue border (`#4A90E2`), elevated shadow, full opacity
  - Inactive items: no border, 60% opacity heading, no body text
  - Default open: item 1
- **Right — Mock dashboard:**
  - White card with `box-shadow` glow
  - CSS 3D perspective tilt on hover: tracks mouse X/Y via framer-motion `useMotionValue` + `useTransform`, max ±12° rotation
  - Inside: circular score dial (SVG stroke-dashoffset animates 0% → 82% on scroll enter), subject list rows
  - Entire card section animates in from `x: 60, opacity: 0` on scroll enter

### ProcessSection
- Section enters with heading fade-in
- Three cards stagger in from `y: 40, opacity: 0` with 0.15s delay between each, triggered by `useInView`
- Ghost number (`01`, `02`, `03`) scales `1 → 1.05` on card hover
- Step 03: bottom blue border accent
- Cards hover: `y: -4` lift transition

### StatsSection
- Background: `#4A90E2/10` tint with `border-y border-[#4A90E2]/20`
- Four stats: 296+, 10K+, 82%, 25K+
- On scroll enter (`useInView`, `once: true`): numbers count up from 0 to final value over 1.5s using framer-motion `useMotionValue` + `animate`
- Labels in uppercase tracking-widest

### BentoSection
- 12-column grid, auto-rows 240px
- Cards stagger in from `y: 30, opacity: 0` on scroll enter, 0.1s between each
- **Large card (col-span-8, row-span-2):** bar chart bars animate height from 0 upward on scroll enter (framer-motion, not CSS hover), each bar with 0.1s stagger
- **Small cards (col-span-4):** hover lifts `y: -4`, timer and streak stats
- **Full-width bottom card:** Guess-Factor analyzer, "Unlock Premium Insights" button with hover color swap

### TestimonialsSection
- Background: `#F4F3F2` light gray
- Three cards stagger in from `y: 50, opacity: 0`, 0.15s delay each
- Hover: `y: -8` lift, subtle blue border glow `border-[#4A90E2]/30`
- Quote icon floats above card top-left with soft drop shadow
- Avatars use `next/image` with circular clip

### CtaBanner
- Rounded-3xl card, full gradient `from-[#4A90E2] to-[#C5D8F1]`
- Two blurred blob shapes behind text: framer-motion `animate` with `x/y` drift, `repeat: Infinity, repeatType: "mirror"`, 8s duration — creates a slow living-gradient feel
- Headline: same word-stagger as hero, triggered on scroll enter
- CTA: "Start Practising Now" → `/signup`, white button, scale+glow on hover

### Footer
- White background, `border-t border-stone-200`
- Four columns: Indicore brand, Product links, Resources links, Social icons
- No animations — intentionally static
- Bottom bar: copyright + Privacy/Terms links
- All nav links are `href="#"` placeholders (real routes not in scope)

---

## Animation Principles

- All scroll animations use `viewport: { once: true }` — fire once on enter, never replay
- `LazyMotion` + `domAnimation` feature set loaded in `app/page.tsx` to minimise bundle
- Three.js canvas uses `requestAnimationFrame` loop, cancelled on component unmount via `useEffect` cleanup
- No animation on reduced-motion: wrap all framer-motion variants with `useReducedMotion()` check — if true, skip transforms, keep opacity only

---

## Performance Constraints

- `HeroCanvas` lazy-loaded via `next/dynamic` — does not block initial render
- Three.js geometry and material created once, disposed on unmount
- Particle line drawing uses a single `BufferGeometry` updated per frame — no per-frame object creation
- `framer-motion` `LazyMotion` ensures only used animation features are bundled

---

## Routing

| Button | Route |
|---|---|
| Get Started / Start Your Trial / Start Practising Now | `/signup` |
| Login | `/login` |
| View the App | `/login` |
| Nav: Features, Analytics, Testimonials, Pricing | `#features`, `#analytics`, `#testimonials`, `#pricing` (scroll anchors) |

---

## Out of Scope

- Pricing section content (placeholder only)
- Real testimonial photos (prototype images used as-is)
- Dark mode variant
- Mobile hamburger menu animation
