"use client"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { useAppStore } from "@/lib/store"
import {
  IconAdjustments,
  IconPalette,
  IconCheck,
  IconPlaylist,
  IconDownload,
  IconUpload,
  IconTrash,
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import type { VideoSource, Playlist } from "@/lib/types"

type Section = "preferences" | "appearance" | "playlists"

const SOURCE_INFO: Record<
  VideoSource,
  { label: string; description: string; defaultOn: boolean }
> = {
  eporner: {
    label: "Eporner",
    description: "Free HD videos via Eporner",
    defaultOn: false,
  },
  sxyporn: {
    label: "SxyPrn",
    description: "One of the largest curated premium collections",
    defaultOn: true,
  },
  hqporner: {
    label: "HQPorner",
    description: "Premium source with high-quality videos, might be slow",
    defaultOn: false,
  },
  xnxx: {
    label: "XNXX",
    description: "Low quality but the largest video archive",
    defaultOn: false,
  },
  motherless: {
    label: "Motherless",
    description: "User-uploaded unfiltered content, some videos may be removed",
    defaultOn: false,
  },
  pornhoarder: {
    label: "PornHoarder",
    description: "Multi-source video aggregator",
    defaultOn: false,
  },
  "7mmtv": {
    label: "7mmtv",
    description: "JAV streaming for censored, uncensored, amateur content",
    defaultOn: true,
  },
  javmost: {
    label: "JavMost",
    description: "Free JAV online source for censored & uncensored videos",
    defaultOn: false,
  },
  pornhub: {
    label: "PornHub",
    description: "The world's largest adult video site with millions of videos",
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
  {
    id: "playlists",
    label: "Playlists",
    icon: IconPlaylist,
    description: "Manage, export and import playlists",
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
  {
    id: "horizon",
    name: "Horizon",
    colors: {
      bg: "#1c1e26",
      surface: "#232530",
      text: "#cbced0",
      primary: "#e95678",
      accent: "#2e303e",
      muted: "#6c6f93",
    },
  },
  {
    id: "synthwave-84",
    name: "Synthwave '84",
    colors: {
      bg: "#262335",
      surface: "#34294f",
      text: "#e0def4",
      primary: "#ff7edb",
      accent: "#3b2d63",
      muted: "#848bbd",
    },
  },
  {
    id: "rose-pine",
    name: "Rosé Pine",
    colors: {
      bg: "#191724",
      surface: "#1f1d2e",
      text: "#e0def4",
      primary: "#eb6f92",
      accent: "#26233a",
      muted: "#6e6a86",
    },
  },
  {
    id: "kanagawa",
    name: "Kanagawa",
    colors: {
      bg: "#1f1f28",
      surface: "#2a2a37",
      text: "#dcd7ba",
      primary: "#7e9cd8",
      accent: "#2a2a37",
      muted: "#727169",
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
    sources: ["eporner", "hqporner", "sxyporn", "pornhub"],
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

function PlaylistsSection() {
  const { playlists, deletePlaylist, importPlaylist } = useAppStore()

  function exportPlaylist(pl: Playlist) {
    const data = JSON.stringify(pl, null, 2)
    const blob = new Blob([data], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `playlist-${pl.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport() {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        if (data && data.name && Array.isArray(data.items)) {
          importPlaylist(data as Playlist)
        }
      } catch {
        // Invalid JSON — silently ignore
      }
    }
    input.click()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Playlists</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Manage, export and import your playlists
          </p>
        </div>
        <button
          onClick={handleImport}
          className="mr-4 flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <IconDownload className="size-4" />
          Import
        </button>
      </div>

      {playlists.length > 0 ? (
        <div className="flex flex-col gap-2">
          {playlists.map((pl) => (
            <div
              key={pl.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-4 py-3"
            >
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">{pl.name}</span>
                <span className="text-xs text-muted-foreground">
                  {pl.items.length} video{pl.items.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => exportPlaylist(pl)}
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  title="Export playlist"
                >
                  <IconDownload className="size-4" />
                </button>
                <button
                  onClick={() => deletePlaylist(pl.id)}
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  title="Delete playlist"
                >
                  <IconTrash className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No playlists yet. Create one from any watch page.
        </p>
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
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-5xl">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <div className="flex flex-col sm:min-h-175 sm:flex-row">
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
            {section === "playlists" && <PlaylistsSection />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
