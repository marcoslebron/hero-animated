# AGENTS.md — Test Agent Instructions

This file tells an AI agent how to verify the Hero section of this project is working correctly.

## Project Context

Next.js 16 (App Router) · React 19 · TypeScript 5 · Tailwind CSS 4.
The dev server runs at **http://localhost:3000** (may fall back to 3001 if 3000 is occupied).
No test framework is configured — verification is done via TypeScript, ESLint, and static analysis.

## Components Under Test

| File | What it does |
|---|---|
| `components/HeroBackground.tsx` | Loads Unicorn Studio SDK, initializes WebGL animation from `/public/superintelligence-II-1.json` |
| `components/Hero.tsx` | Heading with per-letter pixel-font swap animation (u, e, o), two CTA buttons |
| `app/globals.css` | CSS hooks for `data-variant="pixel"` and `data-variant="highlight"` |
| `public/superintelligence-II-1.json` | Unicorn Studio animation data — must exist |

## Test Checklist

### 0. Unit tests
```bash
npm test
```
Runs all files in `__tests__/` via Vitest + jsdom + @testing-library/react.
Expected: **all tests pass**, zero failures.

Files:
- `__tests__/Hero.test.tsx` — animation config invariants, per-letter phase transitions at each timer checkpoint, loop re-highlight, reduced-motion suppression, CTA links
- `__tests__/HeroBackground.test.tsx` — `addScene` called with correct args, `destroy` on unmount, reduced-motion suppression, DOM structure, SDK script injection

### 1. TypeScript
```bash
npx tsc --noEmit
```
Expected: **no output** (zero errors).

### 2. ESLint
```bash
npm run lint
```
Expected: no errors. Warnings about `react-hooks/exhaustive-deps` on HeroBackground are acceptable (intentional suppression).

### 3. Static file check
Verify the animation JSON exists and is valid JSON:
```bash
node -e "require('./public/superintelligence-II-1.json'); console.log('OK')"
```
Expected: prints `OK`.

### 4. Component structure — Hero.tsx
Read `components/Hero.tsx` and verify:
- `useState` initial value is `{ su: "phase1", se: "phase1", co: "phase1" }` (all highlighted on load)
- `LETTERS` array has delays `1_000`, `6_000`, `11_000` (wait — check the actual file for current values) with gaps that ensure each letter is fully idle before the next starts
- Each letter's full animation takes 4 s (phase2 at +2 s, idle at +4 s from when `animate()` fires)
- The inner pixel span is **conditionally rendered**: `{innerVariant && <span ...>}` — NOT always in the DOM
- `LOOP_MS` is large enough that no two letters' cycles overlap (verify: `delays[2] + 4000 < delays[0] + LOOP_MS`)

### 5. Component structure — HeroBackground.tsx
Read `components/HeroBackground.tsx` and verify:
- No Three.js or `@react-three/fiber` imports
- Unicorn Studio SDK loaded from `cdn.jsdelivr.net` (v1.5.2)
- `addScene` called with `filePath: "/superintelligence-II-1.json"`
- Cleanup: `sceneRef.current?.destroy()` called on unmount
- Container div has `pointer-events-none` and the vertical mask gradient

### 6. CSS hooks — globals.css
Read `app/globals.css` and verify all three rules exist:
- `h1 span[data-variant="pixel"]` — pixel font + RGB text-shadow + `mix-blend-mode: difference`
- `h1 span[data-variant="highlight"]` — white bg + transparent text + `mix-blend-mode: screen`
- `h1 span:has(> span[data-variant="pixel"]) > span:first-child` — `visibility: hidden`

### 7. No-overlap invariant (math check)
Given the delays array `[d0, d1, d2]` and `LOOP_MS`:
- Letter N is idle at `delays[N] + 4000` ms
- Letter N+1 starts at `delays[N+1]` ms
- **Pass condition:** `delays[N+1] >= delays[N] + 4000` for all consecutive pairs
- Also verify: `delays[2] + 4000 < delays[0] + LOOP_MS` (o finishes before u re-highlights)

### 8. Package check
```bash
node -e "const p = require('./package.json'); const d = {...p.dependencies,...p.devDependencies}; ['three','@react-three/fiber','@react-three/drei'].forEach(k => { if(d[k]) throw new Error(k+' should have been removed') }); console.log('OK — no Three.js deps')"
```
Expected: `OK — no Three.js deps`

## What to Report

For each check: **PASS** or **FAIL** with a brief reason.
If any check fails, include the relevant file path and line number.
Do not start the dev server — all checks are static.
