"use client"

import { useEffect, useState } from "react"
import HeroBackground from "./HeroBackground"

// ── Font-swap config ────────────────────────────────────────
// "Superintelligence": S(0)u(1)p(2)e(3)r(4)i(5)n(6)t(7)e(8)l(9)l(10)i(11)g(12)e(13)n(14)c(15)e(16)
// "Cloud":             C(0)l(1)o(2)u(3)d(4)
// Swap targets: Super[1]=u, Super[13]=e, Cloud[2]=o

const SUPER = "Superintelligence"
const CLOUD = "Cloud"

const SUPER_SWAP = new Set([1, 13])
const CLOUD_SWAP = new Set([2])

// ── Per-letter animation state ───────────────────────────────
// All three letters start highlighted (phase1).
// Each independently de-highlights at its own delay, then re-highlights
// every LOOP_MS — matching Lambda's FontSwap timing (1 s / 4 s / 7 s).
//
// phase1: white highlight bg + pixel font
// phase2: pixel font only (bg removed)
// idle:   normal heading font

type LetterPhase = "idle" | "phase1" | "phase2"

interface AnimState {
  su: LetterPhase  // Superintelligence[1] = 'u'
  se: LetterPhase  // Superintelligence[13] = 'e'
  co: LetterPhase  // Cloud[2] = 'o'
}

const LOOP_MS = 18_000

const LETTERS: { key: keyof AnimState; delay: number }[] = [
  { key: "su", delay: 1_000 },   // idle at  5 s
  { key: "se", delay: 6_000 },   // starts 1 s after u idle; idle at 10 s
  { key: "co", delay: 11_000 },  // starts 1 s after e idle; idle at 15 s
]

// ── Component ───────────────────────────────────────────────

export default function Hero() {
  // Start all highlighted — each letter de-highlights at its own delay after mount
  const [anim, setAnim] = useState<AnimState>({ su: "phase1", se: "phase1", co: "phase1" })

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const timeouts: ReturnType<typeof setTimeout>[] = []
    const intervals: ReturnType<typeof setInterval>[] = []

    for (const { key, delay } of LETTERS) {
      const animate = () => {
        setAnim(prev => ({ ...prev, [key]: "phase1" }))
        timeouts.push(setTimeout(() => setAnim(prev => ({ ...prev, [key]: "phase2" })), 2_000))
        timeouts.push(setTimeout(() => setAnim(prev => ({ ...prev, [key]: "idle"   })), 4_000))
      }

      // First fire: at `delay` ms, animate() re-asserts phase1 (no visible change
      // since we start there) then schedules phase2 → idle for this letter.
      // Subsequent fires repeat every LOOP_MS.
      timeouts.push(setTimeout(() => {
        animate()
        intervals.push(setInterval(animate, LOOP_MS))
      }, delay))
    }

    return () => {
      timeouts.forEach(clearTimeout)
      intervals.forEach(clearInterval)
    }
  }, [])

  // ── Per-letter phase lookup ───────────────────────────────
  function letterPhase(word: "super" | "cloud", index: number): LetterPhase {
    if (word === "super") {
      if (index === 1)  return anim.su
      if (index === 13) return anim.se
    }
    if (word === "cloud" && index === 2) return anim.co
    return "idle"
  }

  // ── Per-letter renderer ───────────────────────────────────
  function renderChar(char: string, i: number, isSwappable: boolean, phase: LetterPhase) {
    if (!isSwappable) return <span key={i}>{char}</span>

    const outerVariant = phase === "phase1" ? "highlight" : undefined
    const innerVariant = phase !== "idle"   ? "pixel"     : undefined

    return (
      <span
        key={i}
        className="inline-flex flex-row justify-center items-center whitespace-nowrap relative"
        data-variant={outerVariant}
      >
        <span>{char}</span>
        {innerVariant && (
          <span
            className="absolute inset-0 flex items-center justify-center"
            data-variant={innerVariant}
            aria-hidden="true"
          >
            {char}
          </span>
        )}
      </span>
    )
  }

  // ── JSX ───────────────────────────────────────────────────

  return (
    <section
      id="section-home-hero"
      className="homeHero pt-xl pb-xl module-comp overflow-hidden"
    >

      <HeroBackground />

      <p className="relative z-[1] inline-block text-center text-[var(--color-shell)] font-sans font-semibold leading-[120%] mb-5 max-w-[98%] text-base md:text-[clamp(1.25rem,2.5vw,1.5rem)] md:max-w-[80%]">
        Supercomputers for training and inference
      </p>

      {/* Reduced-motion heading — static, no JS */}
      <h1 className="h1-large hidden motion-reduce:block relative z-[1]">
        <span>The Superintelligence <br /> Cloud</span>
      </h1>

      {/* Animated heading */}
      <h1 className="h1-large block motion-reduce:hidden relative z-[1]">
        <span className="sr-only">The Superintelligence Cloud</span>
        <span aria-hidden="true">
          {"The "}
          <span className="whitespace-nowrap">
            {SUPER.split("").map((char, i) =>
              renderChar(char, i, SUPER_SWAP.has(i), letterPhase("super", i))
            )}
          </span>
          <br />
          {CLOUD.split("").map((char, i) =>
            renderChar(char, i, CLOUD_SWAP.has(i), letterPhase("cloud", i))
          )}
        </span>
      </h1>

      <div className="container relative z-[1]">
        <div className="flex flex-wrap flex-row gap-[18px] items-start justify-center mt-[50px]">

          <a
            href="/sign-up"
            aria-label="Launch GPU instance"
            className="inline-flex px-9 py-[17px] rounded-none bg-[var(--color-shell)] text-[var(--color-terminal)] font-mono text-sm font-normal leading-relaxed tracking-[0.05em] uppercase no-underline justify-center text-center items-center gap-[10px] [box-shadow:var(--box-shadow-rgb)] [transition:box-shadow_var(--transition-snappy),color_var(--transition-snappy),background_var(--transition-snappy)] hover:[box-shadow:none] border-0 cursor-pointer"
          >
            Launch GPU instance
          </a>

          <a
            href="/talk-to-our-team"
            aria-label="Talk to our team"
            className="inline-flex px-9 py-[17px] rounded-none bg-[var(--color-ultraviolet)] text-[var(--color-shell)] font-mono text-sm font-normal leading-relaxed tracking-[0.05em] uppercase no-underline justify-center text-center items-center gap-[10px] [transition:background_var(--transition-snappy)] hover:bg-[var(--color-ultraviolet-400)] border-0 cursor-pointer"
          >
            Talk to our team
          </a>

        </div>
      </div>

    </section>
  )
}
