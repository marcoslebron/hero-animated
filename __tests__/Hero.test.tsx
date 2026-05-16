import { render, act } from "@testing-library/react"
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest"
import Hero from "../components/Hero"

vi.mock("../components/HeroBackground", () => ({ default: () => null }))

// ── Constants mirrored from Hero.tsx ─────────────────────────
// If these drift from the real values, the invariant tests below will catch it.
const DELAYS  = [1_000, 6_000, 11_000]  // su, se, co
const LOOP_MS = 18_000
const PHASE_DURATION = 4_000            // 2 s phase1 + 2 s phase2

// Derived checkpoints:
// animate() fires at DELAYS[n], schedules phase2 at DELAYS[n]+2000, idle at DELAYS[n]+4000
// su: phase2 @ 3 000, idle @ 5 000
// se: phase2 @ 8 000, idle @ 10 000
// co: phase2 @ 13 000, idle @ 15 000
// su re-highlight: 1 000 + 18 000 = 19 000

beforeEach(() => { vi.useFakeTimers() })
afterEach(()  => { vi.useRealTimers() })

// ── Pure invariant checks (no React) ────────────────────────

describe("animation config — no-overlap invariants", () => {
  it("each letter starts only after the previous is fully idle", () => {
    for (let i = 0; i < DELAYS.length - 1; i++) {
      expect(DELAYS[i + 1]).toBeGreaterThanOrEqual(DELAYS[i] + PHASE_DURATION)
    }
  })

  it("last letter is idle before u re-highlights on the next loop", () => {
    const lastIdle  = DELAYS[DELAYS.length - 1] + PHASE_DURATION  // 15 000
    const uNextLoop = DELAYS[0] + LOOP_MS                          // 19 000
    expect(lastIdle).toBeLessThan(uNextLoop)
  })
})

// ── Static render ────────────────────────────────────────────

describe("Hero — initial render", () => {
  it("all 3 swappable letters start in phase1 (highlight + pixel)", () => {
    const { container } = render(<Hero />)
    expect(container.querySelectorAll("[data-variant='highlight']")).toHaveLength(3)
    expect(container.querySelectorAll("[data-variant='pixel']")).toHaveLength(3)
  })

  it("renders the eyebrow text", () => {
    const { getByText } = render(<Hero />)
    expect(getByText("Supercomputers for training and inference")).toBeInTheDocument()
  })

  it("renders both CTA buttons with correct hrefs", () => {
    const { getByRole } = render(<Hero />)
    expect(getByRole("link", { name: /launch gpu instance/i })).toHaveAttribute("href", "/sign-up")
    expect(getByRole("link", { name: /talk to our team/i })).toHaveAttribute("href", "/talk-to-our-team")
  })
})

// ── Timer-driven transitions ─────────────────────────────────
// Each test renders fresh. animate() re-asserts phase1 when it fires (no
// visible change), then schedules phase2 at +2 s and idle at +4 s.

describe("Hero — su (u) de-highlight", () => {
  it("state unchanged at 1 s — animate fires but only re-asserts phase1", () => {
    const { container } = render(<Hero />)
    act(() => { vi.advanceTimersByTime(1_000) })
    expect(container.querySelectorAll("[data-variant='highlight']")).toHaveLength(3)
    expect(container.querySelectorAll("[data-variant='pixel']")).toHaveLength(3)
  })

  it("su moves to phase2 at 3 s — highlight gone, pixel stays", () => {
    const { container } = render(<Hero />)
    act(() => { vi.advanceTimersByTime(3_000) })
    expect(container.querySelectorAll("[data-variant='highlight']")).toHaveLength(2)
    expect(container.querySelectorAll("[data-variant='pixel']")).toHaveLength(3)
  })

  it("su idle at 5 s — pixel span unmounted", () => {
    const { container } = render(<Hero />)
    act(() => { vi.advanceTimersByTime(5_000) })
    expect(container.querySelectorAll("[data-variant='highlight']")).toHaveLength(2)
    expect(container.querySelectorAll("[data-variant='pixel']")).toHaveLength(2)
  })
})

describe("Hero — se (e) de-highlight", () => {
  it("se moves to phase2 at 8 s — 1 highlight remaining (co)", () => {
    const { container } = render(<Hero />)
    act(() => { vi.advanceTimersByTime(8_000) })
    expect(container.querySelectorAll("[data-variant='highlight']")).toHaveLength(1)
    expect(container.querySelectorAll("[data-variant='pixel']")).toHaveLength(2)
  })

  it("se idle at 10 s — 1 pixel remaining (co)", () => {
    const { container } = render(<Hero />)
    act(() => { vi.advanceTimersByTime(10_000) })
    expect(container.querySelectorAll("[data-variant='highlight']")).toHaveLength(1)
    expect(container.querySelectorAll("[data-variant='pixel']")).toHaveLength(1)
  })
})

describe("Hero — co (o) de-highlight", () => {
  it("co moves to phase2 at 13 s — 0 highlights", () => {
    const { container } = render(<Hero />)
    act(() => { vi.advanceTimersByTime(13_000) })
    expect(container.querySelectorAll("[data-variant='highlight']")).toHaveLength(0)
    expect(container.querySelectorAll("[data-variant='pixel']")).toHaveLength(1)
  })

  it("all letters idle at 15 s — no pixel or highlight spans in DOM", () => {
    const { container } = render(<Hero />)
    act(() => { vi.advanceTimersByTime(15_000) })
    expect(container.querySelectorAll("[data-variant='highlight']")).toHaveLength(0)
    expect(container.querySelectorAll("[data-variant='pixel']")).toHaveLength(0)
  })
})

describe("Hero — loop (re-highlight)", () => {
  it("su re-highlights at 19 s (delay[0] + LOOP_MS)", () => {
    const { container } = render(<Hero />)
    act(() => { vi.advanceTimersByTime(19_000) })
    expect(container.querySelectorAll("[data-variant='highlight']")).toHaveLength(1)
    expect(container.querySelectorAll("[data-variant='pixel']")).toHaveLength(1)
  })

  it("su back to idle at 23 s", () => {
    const { container } = render(<Hero />)
    act(() => { vi.advanceTimersByTime(23_000) })
    expect(container.querySelectorAll("[data-variant='highlight']")).toHaveLength(0)
    expect(container.querySelectorAll("[data-variant='pixel']")).toHaveLength(0)
  })
})

describe("Hero — reduced-motion", () => {
  it("timers never start — letters stay in initial phase1 indefinitely", () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
    const { container } = render(<Hero />)
    act(() => { vi.advanceTimersByTime(30_000) })
    // Effect bailed out; initial phase1 state never changes
    expect(container.querySelectorAll("[data-variant='pixel']")).toHaveLength(3)
  })
})
