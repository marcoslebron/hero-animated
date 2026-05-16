"use client"

import { useEffect, useRef } from "react"

const UNICORN_SDK = "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.5.2/dist/unicornStudio.umd.js"
const ANIMATION_JSON = "/superintelligence-II-1.json"

declare global {
  interface Window {
    UnicornStudio?: {
      addScene: (params: Record<string, unknown>) => Promise<{ destroy: () => void }>
    }
  }
}

export default function HeroBackground() {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<{ destroy: () => void } | null>(null)

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const el = containerRef.current
    if (!el) return

    const elementId = `unicorn-hero-${Math.random().toString(36).slice(2, 9)}`
    el.id = elementId

    const init = async () => {
      if (!window.UnicornStudio) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script")
          script.src = UNICORN_SDK
          script.onload = () => resolve()
          script.onerror = reject
          document.head.appendChild(script)
        })
      }

      if (!window.UnicornStudio?.addScene) return

      sceneRef.current = await window.UnicornStudio.addScene({
        elementId,
        filePath: ANIMATION_JSON,
        scale: 1,
        dpi: Math.min(window.devicePixelRatio, 1.5),
        fps: 30,
        lazyLoad: false,
      })
    }

    init().catch(console.error)

    return () => {
      sceneRef.current?.destroy()
      sceneRef.current = null
    }
  }, [])

  return (
    <div
      aria-hidden="true"
      className="absolute top-0 left-1/2 -translate-x-1/2 h-full pointer-events-none z-[0]"
      style={{
        width: "100vw",
        maskImage: "linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)",
      }}
    >
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  )
}
