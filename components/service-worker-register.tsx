"use client"

import { useEffect } from "react"

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      return
    }

    if (!("serviceWorker" in navigator)) {
      return
    }

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("Failed to register service worker", error)
      })
    }

    window.addEventListener("load", register, { once: true })

    return () => {
      window.removeEventListener("load", register)
    }
  }, [])

  return null
}
