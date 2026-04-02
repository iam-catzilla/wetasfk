"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  IconX,
  IconChevronLeft,
  IconChevronRight,
  IconLock,
} from "@tabler/icons-react"

// All images in /public/meow/originals — spaces encoded for safe use in src
const IMAGES = [
  "/meow/originals/img%20(1).png",
  "/meow/originals/img%20(2).jpg",
  "/meow/originals/img%20(2).png",
  "/meow/originals/img%20(3).jpg",
  "/meow/originals/img%20(3).png",
  "/meow/originals/img%20(4).png",
  "/meow/originals/img%20(5).jpg",
  "/meow/originals/img%20(5).png",
  "/meow/originals/img%20(6).jpg",
  "/meow/originals/img%20(6).png",
  "/meow/originals/img%20(7).jpg",
  "/meow/originals/img%20(7).png",
  "/meow/originals/img%20(8).jpg",
]

export default function OriginalsPage() {
  const router = useRouter()
  const [checked, setChecked] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [pw, setPw] = useState("")
  const [error, setError] = useState(false)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Check sessionStorage on mount (skip modal if already unlocked this session)
  useEffect(() => {
    const ok = sessionStorage.getItem("originals_pw") === "ok"
    setUnlocked(ok)
    setChecked(true)
  }, [])

  // Focus the password input when the gate is shown
  useEffect(() => {
    if (checked && !unlocked) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [checked, unlocked])

  // Keyboard navigation for lightbox (functional state updates — no deps needed)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight")
        setLightbox((i) =>
          i !== null ? Math.min(i + 1, IMAGES.length - 1) : null
        )
      if (e.key === "ArrowLeft")
        setLightbox((i) => (i !== null ? Math.max(i - 1, 0) : null))
      if (e.key === "Escape") setLightbox(null)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pw === "meow") {
      sessionStorage.setItem("originals_pw", "ok")
      setUnlocked(true)
    } else {
      setError(true)
      setTimeout(() => router.push("/"), 700)
    }
  }

  // Don't flash anything while checking sessionStorage
  if (!checked) return null

  return (
    <>
      {/* ── Password gate ───────────────────────────────────────── */}
      {!unlocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <form
            onSubmit={handleSubmit}
            className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-border/60 bg-card p-6 shadow-xl"
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <IconLock className="size-5 text-primary" />
                <h2 className="font-heading text-lg font-semibold">
                  Private Area
                </h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Enter the password to view this page
              </p>
            </div>

            <input
              ref={inputRef}
              type="password"
              value={pw}
              onChange={(e) => {
                setPw(e.target.value)
                setError(false)
              }}
              placeholder="Password"
              autoComplete="off"
              className="h-11 rounded-xl border border-border/60 bg-muted/50 px-4 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
            />

            {error && (
              <p className="text-sm font-medium text-destructive">
                Wrong password. Redirecting…
              </p>
            )}

            <button
              type="submit"
              className="h-11 rounded-xl bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Unlock
            </button>
          </form>
        </div>
      )}

      {/* ── Gallery ─────────────────────────────────────────────── */}
      {unlocked && (
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight">
              Originals
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {IMAGES.length} photos
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {IMAGES.map((src, i) => (
              <button
                key={src}
                onClick={() => setLightbox(i)}
                className="group relative overflow-hidden rounded-xl bg-muted focus:ring-2 focus:ring-primary/50 focus:outline-none"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`Photo ${i + 1}`}
                  className="aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Lightbox ────────────────────────────────────────────── */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/92"
          onClick={() => setLightbox(null)}
        >
          {/* Counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm text-white backdrop-blur-sm">
            {lightbox + 1} / {IMAGES.length}
          </div>

          {/* Close */}
          <button
            className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            onClick={() => setLightbox(null)}
          >
            <IconX className="size-5" />
          </button>

          {/* Prev */}
          {lightbox > 0 && (
            <button
              className="absolute left-4 flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation()
                setLightbox(lightbox - 1)
              }}
            >
              <IconChevronLeft className="size-6" />
            </button>
          )}

          {/* Next */}
          {lightbox < IMAGES.length - 1 && (
            <button
              className="absolute right-4 flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation()
                setLightbox(lightbox + 1)
              }}
            >
              <IconChevronRight className="size-6" />
            </button>
          )}

          {/* Image — stop propagation so clicking image doesn't close */}
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <div
            className="flex max-h-[90vh] max-w-[90vw] items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={IMAGES[lightbox]}
              alt={`Photo ${lightbox + 1}`}
              className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            />
          </div>
        </div>
      )}
    </>
  )
}
