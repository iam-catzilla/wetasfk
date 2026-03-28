"use client"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { useAppStore } from "@/lib/store"
import { IconAdjustments, IconPalette, IconCheck } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import type { VideoSource } from "@/lib/types"

type Section = "preferences" | "appearance"

const SOURCE_INFO: Record<
  VideoSource,
  { label: string; description: string; defaultOn: boolean }
> = {
  eporner: {
    label: "Eporner",
    description: "Free HD videos via Eporner API",
    defaultOn: true,
  },
  sxyporn: {
    label: "SxyPrn",
    description: "Alternative source with direct video playback",
    defaultOn: true,
  },
  hqporner: {
    label: "HQPorner",
    description: "Curated HD content aggregator",
    defaultOn: true,
  },
  xnxx: {
    label: "XNXX",
    description: "One of the largest video archives",
    defaultOn: false,
  },
  motherless: {
    label: "Motherless",
    description: "User-uploaded amateur content",
    defaultOn: false,
  },
  pornhoarder: {
    label: "PornHoarder",
    description: "Multi-source video aggregator",
    defaultOn: false,
  },
  "7mmtv": {
    label: "7mmtv",
    description: "JAV streaming — censored, uncensored, amateur",
    defaultOn: false,
  },
  javmost: {
    label: "JavMost",
    description: "Free JAV online — censored & uncensored",
    defaultOn: false,
  },
}

const SECTIONS: {
  id: Section
  label: string
  icon: typeof IconAdjustments
  description: string
}[] = [
  {
    id: "preferences",
    label: "Preferences",
    icon: IconAdjustments,
    description: "Configure video sources and other settings",
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: IconPalette,
    description: "Choose themes and customize the look",
  },
]

interface ThemeDef {
  id: string
  name: string
  colors: {
    bg: string
    surface: string
    text: string
    primary: string
    accent: string
    muted: string
  }
}

const THEMES: ThemeDef[] = [
  {
    id: "light",
    name: "Light",
    colors: {
      bg: "#ffffff",
      surface: "#f4f4f5",
      text: "#18181b",
      primary: "#e11d48",
      accent: "#e4e4e7",
      muted: "#a1a1aa",
    },
  },
  {
    id: "dark",
    name: "Dark",
    colors: {
      bg: "#18181b",
      surface: "#27272a",
      text: "#fafafa",
      primary: "#e11d48",
      accent: "#3f3f46",
      muted: "#a1a1aa",
    },
  },
  {
    id: "catppuccin",
    name: "Catppuccin",
    colors: {
      bg: "#1e1e2e",
      surface: "#313244",
      text: "#cdd6f4",
      primary: "#cba6f7",
      accent: "#45475a",
      muted: "#a6adc8",
    },
  },
  {
    id: "nord",
    name: "Nord",
    colors: {
      bg: "#2e3440",
      surface: "#3b4252",
      text: "#eceff4",
      primary: "#88c0d0",
      accent: "#434c5e",
      muted: "#d8dee9",
    },
  },
  {
    id: "ayu-dark",
    name: "Ayu Dark",
    colors: {
      bg: "#0b0e14",
      surface: "#1f2430",
      text: "#bfbdb6",
      primary: "#e6b450",
      accent: "#1a1f29",
      muted: "#565b66",
    },
  },
  {
    id: "tokyo-night",
    name: "Tokyo Night",
    colors: {
      bg: "#1a1b26",
      surface: "#24283b",
      text: "#a9b1d6",
      primary: "#7aa2f7",
      accent: "#292e42",
      muted: "#565f89",
    },
  },
  {
    id: "dracula",
    name: "Dracula",
    colors: {
      bg: "#282a36",
      surface: "#44475a",
      text: "#f8f8f2",
      primary: "#bd93f9",
      accent: "#6272a4",
      muted: "#6272a4",
    },
  },
  {
    id: "gruvbox-dark-soft",
    name: "Gruvbox Soft",
    colors: {
      bg: "#32302f",
      surface: "#3c3836",
      text: "#ebdbb2",
      primary: "#d65d0e",
      accent: "#504945",
      muted: "#a89984",
    },
  },
  {
    id: "gruvbox-dark-hard",
    name: "Gruvbox Hard",
    colors: {
      bg: "#1d2021",
      surface: "#282828",
      text: "#ebdbb2",
      primary: "#d65d0e",
      accent: "#3c3836",
      muted: "#a89984",
    },
  },
]

function ThemeCard({
  theme,
  isActive,
  onClick,
}: {
  theme: ThemeDef
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center gap-2 outline-none"
    >
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-xl border-2 transition-all duration-200",
          isActive
            ? "border-primary shadow-lg shadow-primary/10"
            : "border-transparent ring-1 ring-border/50 hover:ring-border"
        )}
        style={{ backgroundColor: theme.colors.bg }}
      >
        <div className="flex p-2.5" style={{ height: 88 }}>
          {/* Sidebar skeleton */}
          <div
            className="mr-2 w-8 shrink-0 rounded-md p-1.5"
            style={{ backgroundColor: theme.colors.surface }}
          >
            <div className="flex flex-col gap-1.5">
              <div
                className="h-1 w-3 rounded-full"
                style={{ backgroundColor: theme.colors.primary, opacity: 0.9 }}
              />
              <div
                className="h-1 w-4 rounded-full"
                style={{ backgroundColor: theme.colors.muted, opacity: 0.3 }}
              />
              <div
                className="h-1 rounded-full"
                style={{
                  backgroundColor: theme.colors.muted,
                  opacity: 0.3,
                  width: 14,
                }}
              />
              <div
                className="h-1 w-2.5 rounded-full"
                style={{ backgroundColor: theme.colors.muted, opacity: 0.3 }}
              />
            </div>
          </div>
          {/* Content skeleton */}
          <div className="flex flex-1 flex-col gap-1.5">
            <div
              className="h-1.5 w-10 rounded-full"
              style={{ backgroundColor: theme.colors.text, opacity: 0.8 }}
            />
            <div
              className="h-1 w-full rounded-full"
              style={{ backgroundColor: theme.colors.surface }}
            />
            <div
              className="h-1 w-4/5 rounded-full"
              style={{ backgroundColor: theme.colors.surface }}
            />
            <div className="mt-auto flex gap-1.5">
              <div
                className="h-3 flex-1 rounded"
                style={{ backgroundColor: theme.colors.surface }}
              />
              <div
                className="h-3 flex-1 rounded"
                style={{ backgroundColor: theme.colors.surface }}
              />
            </div>
            <div className="flex gap-1.5">
              <div
                className="h-3 flex-1 rounded"
                style={{ backgroundColor: theme.colors.surface }}
              />
              <div
                className="h-3 flex-1 rounded"
                style={{ backgroundColor: theme.colors.surface }}
              />
            </div>
          </div>
        </div>
        {isActive && (
          <div className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-primary">
            <IconCheck className="size-2.5 text-primary-foreground" />
          </div>
        )}
      </div>
      <span
        className={cn(
          "text-xs font-medium transition-colors",
          isActive ? "text-primary" : "text-muted-foreground"
        )}
      >
        {theme.name}
      </span>
    </button>
  )
}

const SOURCE_CATEGORIES: {
  label: string
  description: string
  sources: VideoSource[]
}[] = [
  {
    label: "Premium Content",
    description: "High-quality curated sources",
    sources: ["eporner", "hqporner", "sxyporn"],
  },
  {
    label: "Large Collections",
    description: "Massive archives with varied content",
    sources: ["xnxx", "motherless", "pornhoarder"],
  },
  {
    label: "JAV",
    description: "Japanese Adult Video sources",
    sources: ["7mmtv", "javmost"],
  },
]

function PreferencesSection() {
  const { enabledSources, toggleSource } = useAppStore()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-sm font-semibold">Video Sources</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Toggle which sources to fetch and aggregate videos from
        </p>
      </div>
      <div className="flex flex-col gap-5">
        {SOURCE_CATEGORIES.map((cat) => (
          <div key={cat.label} className="flex flex-col gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                {cat.label}
              </span>
              <span className="text-[11px] text-muted-foreground/60">
                {cat.description}
              </span>
            </div>
            {cat.sources.map((src) => {
              const info = SOURCE_INFO[src]
              const enabled = enabledSources[src]
              return (
                <div
                  key={src}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-all",
                    enabled
                      ? "border-primary/50 bg-primary/5"
                      : "border-border/60 hover:border-border hover:bg-accent/50"
                  )}
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{info.label}</span>
                      {info.defaultOn && (
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                          DEFAULT
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {info.description}
                    </span>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={() => toggleSource(src)}
                  />
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

const PRIMARY_COLORS = [
  {
    name: "Rose",
    light: "oklch(0.514 0.222 16.935)",
    dark: "oklch(0.455 0.188 13.697)",
    hex: "#e11d48",
  },
  {
    name: "Orange",
    light: "oklch(0.633 0.209 38.0)",
    dark: "oklch(0.633 0.209 38.0)",
    hex: "#ea580c",
  },
  {
    name: "Amber",
    light: "oklch(0.735 0.175 73.0)",
    dark: "oklch(0.735 0.175 73.0)",
    hex: "#d97706",
  },
  {
    name: "Green",
    light: "oklch(0.565 0.163 152.0)",
    dark: "oklch(0.565 0.163 152.0)",
    hex: "#16a34a",
  },
  {
    name: "Teal",
    light: "oklch(0.600 0.118 184.0)",
    dark: "oklch(0.600 0.118 184.0)",
    hex: "#0d9488",
  },
  {
    name: "Blue",
    light: "oklch(0.546 0.224 264.0)",
    dark: "oklch(0.546 0.224 264.0)",
    hex: "#2563eb",
  },
  {
    name: "Violet",
    light: "oklch(0.541 0.234 303.0)",
    dark: "oklch(0.541 0.234 303.0)",
    hex: "#7c3aed",
  },
  {
    name: "Pink",
    light: "oklch(0.592 0.234 350.0)",
    dark: "oklch(0.592 0.234 350.0)",
    hex: "#db2777",
  },
]

function AppearanceSection() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [activeColor, setActiveColor] = useState<string | null>(null)

  useEffect(() => setMounted(true), [])

  // Read current primary color from computed style on mount
  useEffect(() => {
    if (!mounted) return
    const currentPrimary = getComputedStyle(document.documentElement)
      .getPropertyValue("--primary")
      .trim()
    const match = PRIMARY_COLORS.find(
      (c) =>
        c.light === currentPrimary ||
        c.dark === currentPrimary ||
        c.hex === currentPrimary
    )
    if (match) setActiveColor(match.name)
  }, [mounted, theme])

  if (!mounted) return null

  const currentTheme = theme === "system" ? resolvedTheme : theme
  const isBasicTheme = currentTheme === "light" || currentTheme === "dark"

  function applyPrimaryColor(color: (typeof PRIMARY_COLORS)[number]) {
    const value = currentTheme === "light" ? color.light : color.dark
    document.documentElement.style.setProperty("--primary", value)
    document.documentElement.style.setProperty("--sidebar-primary", value)
    document.documentElement.style.setProperty("--ring", value)
    setActiveColor(color.name)
    try {
      localStorage.setItem("wetasfk-primary-color", color.name)
    } catch {}
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-sm font-semibold">Theme</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Select a theme for the interface
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {THEMES.map((t) => (
          <ThemeCard
            key={t.id}
            theme={t}
            isActive={currentTheme === t.id}
            onClick={() => setTheme(t.id)}
          />
        ))}
      </div>

      {isBasicTheme && (
        <>
          <div>
            <h3 className="text-sm font-semibold">Accent Color</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Choose a primary accent color for the {currentTheme} theme
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {PRIMARY_COLORS.map((color) => (
              <button
                key={color.name}
                onClick={() => applyPrimaryColor(color)}
                className={cn(
                  "group relative flex size-9 items-center justify-center rounded-full border-2 transition-all",
                  activeColor === color.name
                    ? "scale-110 border-primary"
                    : "border-transparent hover:scale-105"
                )}
                title={color.name}
              >
                <span
                  className="size-7 rounded-full"
                  style={{ backgroundColor: color.hex }}
                />
                {activeColor === color.name && (
                  <IconCheck className="absolute size-3.5 text-white drop-shadow-md" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [section, setSection] = useState<Section>("preferences")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <div className="flex flex-col sm:min-h-150 sm:flex-row">
          {/* Desktop sidebar */}
          <div className="hidden w-60 shrink-0 flex-col border-r border-border/60 bg-muted/30 p-3 sm:flex">
            <span className="mb-2 px-2 py-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Settings
            </span>
            <nav className="flex flex-col gap-1">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  className={cn(
                    "flex flex-col gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                    section === s.id
                      ? "bg-accent font-medium text-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <div className="flex flex-row items-center gap-1">
                    <s.icon className="size-4" />
                    {s.label}
                  </div>
                  <span className="text-muted-foreground/50">
                    {s.description}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          {/* Mobile tabs */}
          <div className="flex border-b border-border/60 sm:hidden">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors",
                  section === s.id
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground"
                )}
              >
                <s.icon className="size-4" />
                {s.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {section === "preferences" && <PreferencesSection />}
            {section === "appearance" && <AppearanceSection />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
