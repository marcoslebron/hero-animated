import { render, act } from "@testing-library/react"
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest"
import HeroBackground from "../components/HeroBackground"

const mockDestroy = vi.fn()
const mockAddScene = vi.fn().mockResolvedValue({ destroy: mockDestroy })

beforeEach(() => {
  // Pre-populate the SDK so the component skips dynamic script loading
  Object.defineProperty(window, "UnicornStudio", {
    writable: true,
    configurable: true,
    value: { addScene: mockAddScene },
  })
  mockAddScene.mockClear()
  mockDestroy.mockClear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("HeroBackground — addScene", () => {
  it("calls addScene with the local animation JSON path", async () => {
    await act(async () => {
      render(<HeroBackground />)
    })
    expect(mockAddScene).toHaveBeenCalledOnce()
    expect(mockAddScene).toHaveBeenCalledWith(
      expect.objectContaining({ filePath: "/superintelligence-II-1.json" })
    )
  })

  it("passes dpi capped at 1.5", async () => {
    window.devicePixelRatio = 3
    await act(async () => {
      render(<HeroBackground />)
    })
    expect(mockAddScene).toHaveBeenCalledWith(
      expect.objectContaining({ dpi: 1.5 })
    )
  })

  it("passes fps: 30", async () => {
    await act(async () => {
      render(<HeroBackground />)
    })
    expect(mockAddScene).toHaveBeenCalledWith(
      expect.objectContaining({ fps: 30 })
    )
  })

  it("sets lazyLoad: false", async () => {
    await act(async () => {
      render(<HeroBackground />)
    })
    expect(mockAddScene).toHaveBeenCalledWith(
      expect.objectContaining({ lazyLoad: false })
    )
  })
})

describe("HeroBackground — cleanup", () => {
  it("calls destroy() when the component unmounts", async () => {
    let unmount!: () => void
    await act(async () => {
      const result = render(<HeroBackground />)
      unmount = result.unmount
    })
    act(() => { unmount() })
    expect(mockDestroy).toHaveBeenCalledOnce()
  })

  it("does not call addScene when prefers-reduced-motion is set", async () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
    await act(async () => {
      render(<HeroBackground />)
    })
    expect(mockAddScene).not.toHaveBeenCalled()
  })
})

describe("HeroBackground — DOM structure", () => {
  it("renders a container with pointer-events-none", () => {
    const { container } = render(<HeroBackground />)
    expect(container.querySelector(".pointer-events-none")).not.toBeNull()
  })

  it("container is aria-hidden", () => {
    const { container } = render(<HeroBackground />)
    const outer = container.querySelector("[aria-hidden='true']")
    expect(outer).not.toBeNull()
  })
})