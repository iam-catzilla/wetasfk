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
  IconDeviceTv,
  IconChevronDown,
  IconUsers,
  IconTrendingUp,
  IconDice,
  IconStar,
  IconMovie,
  IconFileText,
  IconBookmark,
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

const MODEL_LINKS = [
  { href: "/models/search", label: "Search", icon: IconSearch },
  { href: "/models/random", label: "Random", icon: IconDice },
]

const POST_LINKS = [
  { href: "/posts/search", label: "Search", icon: IconSearch },
  { href: "/posts/random", label: "Random", icon: IconDice },
  { href: "/posts/popular", label: "Popular", icon: IconTrendingUp },
]

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

          {/* Favorites */}
          <Link
            href="/favorites"
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname === "/favorites"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <IconHeart className="size-4" />
            Favorites
          </Link>

          {/* Models Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors outline-none",
                  isAnyActive(MODEL_LINKS)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <IconUsers className="size-4" />
                Models
                <IconChevronDown className="size-3 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Models
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {MODEL_LINKS.map((link) => (
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

          {/* Posts Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors outline-none",
                  isAnyActive(POST_LINKS)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <IconFileText className="size-4" />
                Posts
                <IconChevronDown className="size-3 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Posts
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {POST_LINKS.map((link) => (
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
            <Link
              href="/favorites"
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                pathname === "/favorites"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <IconHeart className="size-4" />
              Favorites
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
              Models
            </p>
            {MODEL_LINKS.map((link) => (
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
            <p className="px-3 pt-2 pb-1 text-xs font-bold tracking-wider text-muted-foreground uppercase">
              Posts
            </p>
            {POST_LINKS.map((link) => (
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
