"use client"

import { useEffect, useRef } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useAppStore } from "@/lib/store"

/**
 * Watches the Zustand enabledSources and syncs to URL ?sources= param.
 * On first mount, pushes stored sources to URL if not already present.
 * When the user toggles sources in settings, this triggers a server re-fetch.
 */
export function SourceSync() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const enabledSources = useAppStore((s) => s.enabledSources)
  const getEnabledList = useAppStore((s) => s.getEnabledList)
  const initialized = useRef(false)

  useEffect(() => {
    const enabled = getEnabledList()
    const params = new URLSearchParams(searchParams.toString())
    const currentSources = params.get("sources")

    // On first mount: sync stored sources to URL if URL has no sources param
    if (!initialized.current) {
      initialized.current = true
      if (!currentSources && enabled.length > 0) {
        params.set("sources", enabled.join(","))
        const qs = params.toString()
        const url = qs ? `${pathname}?${qs}` : pathname
        router.replace(url)
      }
      return
    }

    // Subsequent changes: update URL from store
    params.set("sources", enabled.join(","))
    const qs = params.toString()
    const url = qs ? `${pathname}?${qs}` : pathname
    router.replace(url)
  }, [enabledSources]) // intentionally only depend on enabledSources

  return null
}
