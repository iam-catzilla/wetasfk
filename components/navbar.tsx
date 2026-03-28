"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import {
  IconSearch,
  IconHeart,
  IconFlame,
  IconMenu2,
  IconX,
  IconHistory,
  IconSettings,
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { ThemeSwitcher } from "./theme-switcher"
import { SettingsDialog } from "./settings-dialog"
import { useAppStore } from "@/lib/store"
import Image from "next/image"

const NAV_LINKS = [
  { href: "/", label: "Trending", icon: IconFlame },
  { href: "/search", label: "Search", icon: IconSearch },
  { href: "/favorites", label: "Favorites", icon: IconHeart },
  { href: "/history", label: "History", icon: IconHistory },
]

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [mobileOpen, setMobileOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const getEnabledList = useAppStore((s) => s.getEnabledList)

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = query.trim()
    if (trimmed) {
      const enabled = getEnabledList()
      const params = new URLSearchParams()
      params.set("q", trimmed)
      params.set("sources", enabled.join(","))
      router.push(`/search?${params.toString()}`)
      setQuery("")
      setMobileOpen(false)
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-450 items-center gap-4 px-4 lg:px-6">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg">
            <Image src="/logo.png" alt="Wetasfk Logo" width={32} height={32} />
          </div>
          <span className="hidden font-heading text-xl font-bold sm:inline">
            Wetasfk
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname === link.href
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <link.icon className="size-4" />
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Search Bar */}
        <form
          onSubmit={handleSearch}
          className="ml-auto flex max-w-md flex-1 items-center"
        >
          <div className="relative w-full">
            <IconSearch className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search videos..."
              className="h-9 w-full rounded-full border border-border/60 bg-muted/50 pr-4 pl-9 text-sm transition-all outline-none placeholder:text-muted-foreground/60 focus:border-primary/50 focus:bg-muted focus:ring-1 focus:ring-primary/20"
            />
          </div>
        </form>

        {/* Theme Switcher */}
        {/* <ThemeSwitcher /> */}

        {/* Settings */}
        <button
          onClick={() => setSettingsOpen(true)}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="Settings"
        >
          <IconSettings className="size-5" />
        </button>
        <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg p-2 text-muted-foreground hover:bg-accent md:hidden"
        >
          {mobileOpen ? (
            <IconX className="size-5" />
          ) : (
            <IconMenu2 className="size-5" />
          )}
        </button>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <nav className="border-t border-border/50 bg-background p-4 md:hidden">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  pathname === link.href
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <link.icon className="size-4" />
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  )
}
