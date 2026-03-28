"use client"

import { useEffect, useRef } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useAppStore } from "@/lib/store"

/**
 * Watches the Zustand enabledSources and syncs to URL ?sources= param.
 * On first mount, pushes stored sources to URL if not already present.
 * When the user toggles sources in settings, this triggers a server re-fetch.
 * Debounced to avoid multiple rapid navigations during settings interaction.
 */
export function SourceSync() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const enabledSources = useAppStore((s) => s.enabledSources)
  const getEnabledList = useAppStore((s) => s.getEnabledList)
  const initialized = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

    // Debounce subsequent changes: coalesce rapid toggles into one navigation
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const latestEnabled = getEnabledList()
      const latestParams = new URLSearchParams(searchParams.toString())
      latestParams.set("sources", latestEnabled.join(","))
      // Reset to page 1 when sources change
      latestParams.delete("page")
      const qs = latestParams.toString()
      const url = qs ? `${pathname}?${qs}` : pathname
      router.replace(url)
    }, 400)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [enabledSources]) // intentionally only depend on enabledSources

  return null
}
