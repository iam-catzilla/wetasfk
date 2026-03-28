"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"

function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      themes={[
        "light",
        "dark",
        "catppuccin",
        "nord",
        "ayu-dark",
        "tokyo-night",
        "dracula",
        "gruvbox-dark-soft",
        "gruvbox-dark-hard",
      ]}
      disableTransitionOnChange
      {...props}
    >
      <ThemeHotkey />
      <PrimaryColorRestore />
      {children}
    </NextThemesProvider>
  )
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

function ThemeHotkey() {
  const { resolvedTheme, setTheme } = useTheme()

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) {
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (event.key.toLowerCase() !== "]") {
        return
      }

      if (isTypingTarget(event.target)) {
        return
      }

      setTheme(resolvedTheme === "dark" ? "light" : "dark")
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [resolvedTheme, setTheme])

  return null
}

const PRIMARY_COLORS_MAP: Record<string, { light: string; dark: string }> = {
  Rose: {
    light: "oklch(0.514 0.222 16.935)",
    dark: "oklch(0.455 0.188 13.697)",
  },
  Orange: { light: "oklch(0.633 0.209 38.0)", dark: "oklch(0.633 0.209 38.0)" },
  Amber: { light: "oklch(0.735 0.175 73.0)", dark: "oklch(0.735 0.175 73.0)" },
  Green: {
    light: "oklch(0.565 0.163 152.0)",
    dark: "oklch(0.565 0.163 152.0)",
  },
  Teal: { light: "oklch(0.600 0.118 184.0)", dark: "oklch(0.600 0.118 184.0)" },
  Blue: { light: "oklch(0.546 0.224 264.0)", dark: "oklch(0.546 0.224 264.0)" },
  Violet: {
    light: "oklch(0.541 0.234 303.0)",
    dark: "oklch(0.541 0.234 303.0)",
  },
  Pink: { light: "oklch(0.592 0.234 350.0)", dark: "oklch(0.592 0.234 350.0)" },
}

function PrimaryColorRestore() {
  const { resolvedTheme } = useTheme()

  React.useEffect(() => {
    if (resolvedTheme !== "light" && resolvedTheme !== "dark") {
      // For themed themes, clear any custom primary override
      document.documentElement.style.removeProperty("--primary")
      document.documentElement.style.removeProperty("--sidebar-primary")
      document.documentElement.style.removeProperty("--ring")
      return
    }

    try {
      const saved = localStorage.getItem("wetasfk-primary-color")
      if (saved && PRIMARY_COLORS_MAP[saved]) {
        const value =
          resolvedTheme === "light"
            ? PRIMARY_COLORS_MAP[saved].light
            : PRIMARY_COLORS_MAP[saved].dark
        document.documentElement.style.setProperty("--primary", value)
        document.documentElement.style.setProperty("--sidebar-primary", value)
        document.documentElement.style.setProperty("--ring", value)
      }
    } catch {}
  }, [resolvedTheme])

  return null
}

export { ThemeProvider }
