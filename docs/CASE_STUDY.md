# Case Study: Replicating Lambda.ai's Hero Section with AI

## Overview

Lambda.ai's homepage opens with a striking, cinematic hero: a reactive WebGL particle field behind a massive heading where three letters pulse in and out of a retro pixel font, each one independently timed in a chromatic-aberration highlight. The goal of this project was to produce a pixel-faithful clone of that section — same animation engine, same letter-swap timing, same design tokens — using Next.js 16 and React 19.

What makes this non-trivial is that none of the moving parts are standard. The background animation is powered by Unicorn Studio, a proprietary WebGL engine not listed in any public dependency graph. The letter-swap uses `mix-blend-mode` layering and a custom pixel typeface loaded from a HubSpot CDN. The design system exists only as minified CSS. Reconstructing the implementation required reverse-engineering the live site — and AI was the primary tool for doing that.

---

## The Challenge

Three compounding unknowns:

- **Animation engine:** Lambda.ai's background is not Canvas, Three.js, or any well-known WebGL library. No public documentation exists for what powers it.
- **Letter-swap mechanics:** The effect involves three independent state machines, two blend modes layered on the same element, a custom font loaded from a third-party CDN, and precise millisecond timing to match the original cadence.
- **Design tokens:** Colors, spacing, and typography are embedded in 14,000 lines of minified production CSS. There is no public design system or Figma file.

---

## AI as Reverse-Engineering Partner

### Identifying the Animation Engine

The first blocker was the WebGL background. Inspecting the network tab showed a large JSON payload and a script from a CDN I didn't recognize. I shared the raw HTML source with Claude and asked it to identify every external script and what it was doing.

Claude spotted `unicornStudio` in the script body, traced it to `hiunicornstudio/unicornstudio.js` on jsDelivr, and identified the exact version Lambda uses: `v1.5.2`. It also located the `projectUrl` property pointing to the animation data file:

```
https://lambda.ai/hubfs/web-static/motion/superintelligence-II-1.json
```

Both files are publicly accessible. Claude drafted the download commands, and the JSON went into `/public/` directly.

### Building HeroBackground

With the engine identified, Claude authored `components/HeroBackground.tsx` from scratch. The key decisions it made:

- Dynamically inject the Unicorn Studio SDK script on first client render rather than bundling it — keeps it out of the Next.js module graph and avoids SSR issues.
- Generate a unique `elementId` per mount with `Math.random()` so React strict mode's double-invoke doesn't cause a collision.
- Apply a vertical `linear-gradient` mask (transparent → opaque → opaque → transparent) to fade the animation into the section at both edges, matching Lambda's visual treatment.
- Respect `prefers-reduced-motion`: skip the entire SDK load if the user has requested reduced motion.

The result is 76 lines, zero WebGL code — all rendering is handled internally by the Unicorn Studio engine.

### Extracting Design Tokens

I shared the minified `styles_css.css` file with Claude and asked it to pull out all CSS custom properties, `@font-face` declarations, and spacing values. Claude produced a structured JSON object — `guidelines.json` — that became the authoritative design system for the project:

```json
{
  "colors": {
    "terminal": "#0B0B0B",
    "shell": "#E7E6D9",
    "ultraviolet": "#6236F4"
  },
  "spacing": {
    "xl": "160px",
    "md": "80px",
    "xs": "40px"
  }
}
```

These tokens were wired into `globals.css` as CSS custom properties and consumed directly in Tailwind utility classes and inline styles throughout the components.

---

## Building the Letter-Swap Animation

This was the most technically involved part of the project. The effect looks simple — three letters briefly glow in a pixel font — but the implementation involves three independent timers, two CSS blend modes, and a careful render structure to avoid layout artifacts.

### Identifying the Swap Targets

Lambda's heading reads "The Superintelligence Cloud". Claude analyzed the heading character-by-character and identified the three swap positions:

| Key | Word | Index | Character |
|-----|------|-------|-----------|
| `su` | Superintelligence | 1 | **u** |
| `se` | Superintelligence | 13 | **e** |
| `co` | Cloud | 2 | **o** |

### The State Machine

Each letter cycles through three phases independently:

```typescript
type LetterPhase = "idle" | "phase1" | "phase2"

interface AnimState {
  su: LetterPhase  // Superintelligence[1]
  se: LetterPhase  // Superintelligence[13]
  co: LetterPhase  // Cloud[2]
}
```

- **`phase1`** — pixel font active + white highlight background + RGB chromatic box-shadow (`mix-blend-mode: screen`)
- **`phase2`** — pixel font only, background removed
- **`idle`** — standard Suisse Intl heading font

All three letters start in `phase1` on mount — matching Lambda's behavior where all letters are visually active on page load. They then de-highlight sequentially:

| Letter | Starts de-highlighting | Fully idle |
|--------|----------------------|------------|
| `u` | 1 s after load | 5 s |
| `e` | 6 s after load | 10 s |
| `o` | 11 s after load | 15 s |

Each letter is fully idle before the next begins. The loop repeats every 18 seconds from each letter's initial delay, so they stay in sync across cycles.

### The 3-Node Render Structure

Each swappable character uses a three-node span structure:

```tsx
<span
  className="inline-flex relative"
  data-variant={phase === "phase1" ? "highlight" : undefined}
>
  <span>{char}</span>                   {/* regular character */}
  {phase !== "idle" && (
    <span
      className="absolute inset-0"
      data-variant="pixel"
      aria-hidden="true"
    >
      {char}
    </span>
  )}
</span>
```

The pixel span is **conditionally rendered**, not CSS-hidden. This matters: if it were hidden with `display: none` or `opacity: 0`, the element would still exist in the DOM, potentially doubling the character in screen readers. Conditional rendering means the idle state is a single text node — clean and accessible.

### CSS Hooks

Three attribute selectors drive the visual effect entirely from CSS:

```css
/* Pixel font + RGB text-shadow + blend mode */
h1 span[data-variant="pixel"] {
  font-family: 'apkarchivr21';
  text-shadow: -2px 0 red, 2px 0 cyan;
  mix-blend-mode: difference;
}

/* White highlight background + RGB box-shadow + blend mode */
h1 span[data-variant="highlight"] {
  background: white;
  color: transparent;
  box-shadow: var(--box-shadow-rgb);
  mix-blend-mode: screen;
}

/* Hide the base character when the pixel overlay is active */
h1 span:has(> span[data-variant="pixel"]) > span:first-child {
  visibility: hidden;
}
```

The `:has()` selector on the last rule is the key: it hides the regular character only when a pixel sibling exists, without the component needing to track that state explicitly.

---

## What Required Iteration

### Blend Mode Stacking

The initial implementation placed both blend modes on the same element. In practice, `mix-blend-mode: screen` (for the highlight) and `mix-blend-mode: difference` (for the pixel text) interact differently depending on stacking context. Getting them to layer correctly against the dark background and the WebGL canvas underneath required testing in the browser — Claude's first suggestion worked on white backgrounds but not against the animated canvas. The fix was separating the highlight onto the outer span and the pixel effect onto the inner absolute span, creating distinct stacking contexts.

### Timer Architecture

The first timing implementation used nested `setTimeout` chains — one per phase transition per letter. This worked for the initial sequence but broke on loop re-entry because clearing refs across nested closures is error-prone. Claude refactored to `setTimeout` for the initial delay + `setInterval` for the loop, with all handles collected into flat arrays for clean cleanup on unmount.

### Font Loading Race Condition

The `apkarchivr21` pixel font is loaded via `@font-face` from the HubSpot CDN. On first render, if the font hasn't loaded before the initial `phase1` state is set, the letter briefly flashes in Suisse Intl before snapping to the pixel font. The fix was ensuring the `@font-face` declaration is in `globals.css` (loaded unconditionally on every page) rather than being lazy-loaded.

---

## Results

- **Live demo:** [your-vercel-url.vercel.app]
- **Components:** 2 (`Hero.tsx`, `HeroBackground.tsx`)
- **Total TypeScript:** ~250 lines across both components
- **Zero custom WebGL:** all GPU rendering handled by Unicorn Studio
- **Accessibility:** `prefers-reduced-motion` respected at both the JS layer (animation skipped) and the HTML layer (static heading rendered via `motion-reduce:block`)

The final result is visually indistinguishable from the Lambda.ai production hero on a side-by-side screenshot comparison.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, TypeScript 5 |
| Styling | Tailwind CSS 4, CSS custom properties |
| Animation engine | Unicorn Studio SDK v1.5.2 (WebGL) |
| Fonts | Suisse Intl, Suisse Intl Mono, apkarchivr21 (HubSpot CDN) |
| Testing | Vitest 4 + Testing Library |
| CI/CD | GitHub Actions |
| Hosting | Vercel (free Hobby tier) |
