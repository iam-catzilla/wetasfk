"use client"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { useAppStore } from "@/lib/store"
import { IconAdjustments, IconPalette, IconCheck } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

type Section = "preferences" | "appearance"
type VideoSource = "eporner" | "sxyporn" | "both"

const SECTIONS: { id: Section; label: string; icon: typeof IconAdjustments }[] =
  [
    { id: "preferences", label: "Preferences", icon: IconAdjustments },
    { id: "appearance", label: "Appearance", icon: IconPalette },
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
]

const VIDEO_SOURCES: { id: VideoSource; label: string; description: string }[] =
  [
    {
      id: "eporner",
      label: "Eporner",
      description: "Free HD videos via Eporner API",
    },
    {
      id: "sxyporn",
      label: "SxyPrn",
      description: "Alternative source with direct video playback",
    },
    { id: "both", label: "Both", description: "Aggregate from all sources" },
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

function PreferencesSection() {
  const { videoSource, setVideoSource } = useAppStore()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-sm font-semibold">Video Sources</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Choose which sources to fetch videos from
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {VIDEO_SOURCES.map((source) => (
          <button
            key={source.id}
            onClick={() => setVideoSource(source.id)}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all",
              videoSource === source.id
                ? "border-primary/50 bg-primary/5"
                : "border-border/60 hover:border-border hover:bg-accent/50"
            )}
          >
            <div
              className={cn(
                "flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                videoSource === source.id
                  ? "border-primary bg-primary"
                  : "border-muted-foreground/40"
              )}
            >
              {videoSource === source.id && (
                <div className="size-1.5 rounded-full bg-primary-foreground" />
              )}
            </div>
            <div>
              <div className="text-sm font-medium">{source.label}</div>
              <div className="text-xs text-muted-foreground">
                {source.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function AppearanceSection() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  const currentTheme = theme === "system" ? resolvedTheme : theme

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
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <div className="flex flex-col sm:min-h-100 sm:flex-row">
          {/* Desktop sidebar */}
          <div className="hidden w-44 shrink-0 flex-col border-r border-border/60 bg-muted/30 p-3 sm:flex">
            <span className="mb-2 px-2 py-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Settings
            </span>
            <nav className="flex flex-col gap-0.5">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                    section === s.id
                      ? "bg-accent font-medium text-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <s.icon className="size-4" />
                  {s.label}
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
