"use client"

import { useEffect, useRef } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useAppStore } from "@/lib/store"

/**
 * Watches the Zustand videoSource and syncs it to the URL ?source= param.
 * When the user changes source in settings, this triggers a server re-fetch.
 */
export function SourceSync() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const videoSource = useAppStore((s) => s.videoSource)
  const initialized = useRef(false)

  useEffect(() => {
    // Skip the first mount — only react to actual changes
    if (!initialized.current) {
      initialized.current = true
      return
    }

    const params = new URLSearchParams(searchParams.toString())
    if (videoSource === "eporner") {
      params.delete("source")
    } else {
      params.set("source", videoSource)
    }

    const qs = params.toString()
    const url = qs ? `${pathname}?${qs}` : pathname
    router.replace(url)
  }, [videoSource]) // intentionally only depend on videoSource

  return null
}
