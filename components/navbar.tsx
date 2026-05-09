"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import {
  IconSearch,
  IconFlame,
  IconMenu2,
  IconX,
  IconHistory,
  IconSettings,
  IconDeviceTv,
  IconChevronDown,
  IconTrendingUp,
  IconDice,
  IconMovie,
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { SettingsDialog } from "./settings-dialog"
import { useAppStore } from "@/lib/store"
import Image from "next/image"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const VIDEO_LINKS = [
  { href: "/trending", label: "Trending", icon: IconFlame },
  { href: "/search", label: "Search", icon: IconSearch },
  { href: "/history", label: "History", icon: IconHistory },
]

const ONLYFANS_MODEL_LINKS = [
  { href: "/models/search", label: "Search", icon: IconSearch },
  { href: "/models/random", label: "Random", icon: IconDice },
]

const ONLYFANS_POST_LINKS = [
  { href: "/posts/search", label: "Search", icon: IconSearch },
  { href: "/posts/random", label: "Random", icon: IconDice },
  { href: "/posts/popular", label: "Popular", icon: IconTrendingUp },
]

const ONLYFANS_LINKS = [...ONLYFANS_MODEL_LINKS, ...ONLYFANS_POST_LINKS]

function OnlyFansIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="-20.62 0.53 820.42 555.49" className={className}>
      <path
        d="M266.82.53c35 0 69.65 6.91 101.98 20.34s61.71 33.11 86.45 57.93c24.75 24.81 44.37 54.27 57.77 86.7a267.919 267.919 0 0 1 20.29 102.27c0 108.09-64.93 205.53-164.51 246.89s-214.2 18.5-290.41-57.93C2.18 380.3-20.62 265.36 20.62 165.5 61.87 65.64 159.04.53 266.82.53zm0 347.4c10.5.01 20.9-2.05 30.61-6.07s18.52-9.93 25.95-17.38 13.31-16.29 17.33-26.02a80.365 80.365 0 0 0 6.06-30.7c0-32.43-19.48-61.66-49.35-74.07s-64.26-5.55-87.12 17.38-29.7 57.41-17.33 87.37 41.53 49.49 73.86 49.49z"
        fill="currentColor"
      />
      <path
        d="M566.35 200.96c67.71 19.54 147.63 0 147.63 0-23.19 101.55-96.75 165.15-202.81 172.89a266.766 266.766 0 0 1-40.48 65.86 266.208 266.208 0 0 1-57.62 51.43c-21.6 14.24-45.15 25.25-69.92 32.68s-50.48 11.19-76.33 11.18l79.95-254.81C428.95 18.28 471.08.54 665.98.54H799.8c-22.38 98.88-99.54 174.41-233.44 200.42z"
        fill="currentColor"
      />
    </svg>
  )
}

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [mobileOpen, setMobileOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const getEnabledList = useAppStore((s) => s.getEnabledList)
  const trendingHref = `/trending?sources=${getEnabledList().join(",")}`

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

  const isAnyActive = (links: { href: string }[]) =>
    links.some((l) => pathname === l.href)

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 items-center gap-2 px-4 lg:px-6">
        {/* Logo */}
        <Link href="/" className="mr-2 flex shrink-0 items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg">
            <Image src="/logo.png" alt="Wetasfk Logo" width={32} height={32} />
          </div>
          <span className="hidden font-mono text-xl font-bold text-primary sm:inline">
            Wet as f**k
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {/* Videos Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors outline-none",
                  isAnyActive(VIDEO_LINKS)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <IconFlame className="size-4" />
                Videos
                <IconChevronDown className="size-3 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Videos
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {VIDEO_LINKS.map((link) => (
                <DropdownMenuItem key={link.href} asChild>
                  <Link
                    href={link.href === "/trending" ? trendingHref : link.href}
                    className={cn(
                      "flex items-center gap-2",
                      pathname === link.href && "font-medium text-primary"
                    )}
                  >
                    <link.icon className="size-4" />
                    {link.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Library */}
          <Link
            href="/library"
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === "/library"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <IconDeviceTv className="size-4" />
            Library
          </Link>

          {/* Feed */}
          <Link
            href="/feed"
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === "/feed"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <IconMovie className="size-4" />
            Feed
          </Link>

          {/* OnlyFans Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors outline-none",
                  isAnyActive(ONLYFANS_LINKS)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <OnlyFansIcon className="size-4 text-primary" />
                OnlyFans
                <IconChevronDown className="size-3 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Models
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ONLYFANS_MODEL_LINKS.map((link) => (
                <DropdownMenuItem key={link.href} asChild>
                  <Link
                    href={link.href}
                    className={cn(
                      "flex items-center gap-2",
                      pathname === link.href && "font-medium text-primary"
                    )}
                  >
                    <link.icon className="size-4" />
                    {link.label}
                  </Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Posts
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ONLYFANS_POST_LINKS.map((link) => (
                <DropdownMenuItem key={link.href} asChild>
                  <Link
                    href={link.href}
                    className={cn(
                      "flex items-center gap-2",
                      pathname === link.href && "font-medium text-primary"
                    )}
                  >
                    <link.icon className="size-4" />
                    {link.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
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
            <Link
              href="/feed"
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                pathname === "/feed"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <IconMovie className="size-4" />
              Feed
            </Link>
            <Link
              href="/library"
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                pathname === "/library"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <IconDeviceTv className="size-4" />
              Library
            </Link>
            <p className="px-3 pt-2 pb-1 text-xs font-bold tracking-wider text-muted-foreground uppercase">
              Videos
            </p>
            {VIDEO_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href === "/trending" ? trendingHref : link.href}
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
            <p className="px-3 pt-2 pb-1 text-xs font-bold tracking-wider text-muted-foreground uppercase">
              OnlyFans
            </p>
            <p className="px-3 pt-1 pb-1 text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              Models
            </p>
            {ONLYFANS_MODEL_LINKS.map((link) => (
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
            <p className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              Posts
            </p>
            {ONLYFANS_POST_LINKS.map((link) => (
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
