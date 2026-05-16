import "@testing-library/jest-dom"
import { vi } from "vitest"

// jsdom doesn't implement matchMedia — provide a default stub
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// jsdom doesn't implement devicePixelRatio
Object.defineProperty(window, "devicePixelRatio", { writable: true, value: 1 })
