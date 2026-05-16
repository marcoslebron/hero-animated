# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # dev server at localhost:3000
npm run build    # production build
npm run lint     # ESLint
```

No test framework is configured.

## Architecture

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript 5 · Tailwind CSS 4

**Goal:** Pixel-faithful clone of the Lambda.ai homepage — three stacked sections:
1. **Hero** — full-viewport animated canvas background, responsive heading with letter-swap animation, two CTA buttons
2. **Features** — 12-column grid, 7-col interactive accordion (4 items, item 01 locked open) + 5-col isometric illustration
3. **Hardware** — full-width horizontal accordion of 4 product cards (grayscale → color on expand)

## Key Reference Files

- **`guidelines.json`** — authoritative design system spec (colors, spacing, typography, per-section component specs, CSS variables). Read this before building any section.
- **`artifacts/source_html.html`** — original Lambda.ai source HTML for structural reference
- **`artifacts/styles_css.css`** — original CSS for animation and style reference
- **`artifacts/`** — screenshots of hero, features, and hardware sections

## Design Tokens

Defined in `globals.css` and sourced from `guidelines.json`:

| Token | Value |
|---|---|
| `--color-terminal` | `#0B0B0B` (background) |
| `--color-shell` | `#E7E6D9` (primary text) |
| `--color-neutral-300` | `#B0AFA6` (secondary text) |
| `--color-ultraviolet` | `#6236F4` (accent) |
| `--color-neutral-800` | `#262625` (dividers) |
| `--transition-snappy` | `0.1s cubic-bezier(0.6, 0, 0.4, 1)` |
| `--box-shadow-rgb` | RGB chromatic aberration (primary button) |

**Fonts** (via `@font-face`, hosted on HubSpot CDN — declarations in `artifacts/styles_css.css`):
- `Suisse Intl` — headings, accordion titles
- `Suisse Intl Mono` — body, buttons, UI
- `apkarchivr21` — pixel accent (hero heading letter-swap only)

## Layout Conventions

- Grid container: `max-width: 1398px`, `margin: auto`, `padding-inline: 15px`
- Spacing scale: `--space-xl: 160px`, `--space-md: 80px`, `--space-xs: 40px`
- Buttons: `border-radius: 0`, uppercase Suisse Intl Mono, `padding: 17px 36px`
- Path alias `@/*` resolves to project root

---

## Hero Section — Implementation Notes

### Background Animation (`components/HeroBackground.tsx`)

Lambda.ai uses **Unicorn Studio** for the WebGL background. We replicated it exactly:

1. Fetched the raw HTML from `lambda.ai` via curl to find the animation source:
   ```
   projectUrl: "https://lambda.ai/hubfs/web-static/motion/superintelligence-II-1.json"
   ```
2. Downloaded that JSON file (publicly accessible) and placed it in `/public/superintelligence-II-1.json`.
3. Identified the Unicorn Studio SDK version Lambda uses:
   ```
   https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.5.2/dist/unicornStudio.umd.js
   ```
4. `HeroBackground.tsx` dynamically loads the SDK script on first client render, then calls:
   ```ts
   window.UnicornStudio.addScene({ elementId, filePath: "/superintelligence-II-1.json", dpi, fps: 30 })
   ```
5. The container div uses a vertical mask (`linear-gradient`) to fade the animation in/out at top and bottom edges.
6. No Three.js or canvas code — the Unicorn Studio engine handles all WebGL internally.

### Letter-Swap Animation (`components/Hero.tsx`)

Three letters in the heading swap to a pixel font (`apkarchivr21`) on a cycle: **u** (Superintelligence[1]), **e** (Superintelligence[13]), **o** (Cloud[2]).

**Animation phases per letter:**
- `phase1` — white highlight background + pixel font (RGB chromatic box-shadow)
- `phase2` — pixel font only, background removed
- `idle` — normal Suisse Intl heading font

**State:** `AnimState { su, se, co }` — each letter has its own independent `LetterPhase`.

**Initial state:** all three start in `phase1` (highlighted) on first render — matching Lambda's behavior where all letters are visually active on page load.

**Timing (de-highlight sequence after load):**
| Letter | Starts going back | Fully idle |
|--------|-------------------|------------|
| `u`    | 1 s               | 5 s        |
| `e`    | 6 s               | 10 s       |
| `o`    | 11 s              | 15 s       |

Each letter is fully idle before the next begins. Loop repeats every `LOOP_MS = 18 000 ms` from each letter's initial delay.

**Rendering:** each swappable letter uses a three-node structure:
```tsx
<span relative data-variant="highlight"?>   // outer: layout anchor + phase1 bg
  <span>{char}</span>                        // regular character (hidden via :has() when pixel active)
  {phase !== "idle" && (
    <span absolute data-variant="pixel">    // pixel overlay — only mounted when active
      {char}
    </span>
  )}
</span>
```
The inner pixel span is **conditionally rendered** (not just hidden) so there is no invisible overlay doubling the character in idle state.

**CSS hooks** (in `globals.css`):
- `h1 span[data-variant="pixel"]` — applies pixel font, RGB text-shadow, `mix-blend-mode: difference`
- `h1 span[data-variant="highlight"]` — white bg, transparent text, RGB box-shadow, `mix-blend-mode: screen`
- `h1 span:has(> span[data-variant="pixel"]) > span:first-child` — hides the regular character when pixel overlay is active
