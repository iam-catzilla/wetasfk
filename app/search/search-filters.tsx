"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { IconSearch } from "@tabler/icons-react"
import { SORT_OPTIONS } from "@/lib/constants"
import type { SortOrder } from "@/lib/types"
import { useAppStore } from "@/lib/store"

interface SearchFiltersProps {
  currentQuery: string
  currentOrder: SortOrder
}

export function SearchFilters({
  currentQuery,
  currentOrder,
}: SearchFiltersProps) {
  const router = useRouter()
  const [query, setQuery] = useState(currentQuery)
  const { addSearchTerm, searchHistory, getEnabledList } = useAppStore()

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = query.trim()
    if (trimmed) {
      addSearchTerm(trimmed)
      const enabled = getEnabledList()
      const params = new URLSearchParams()
      params.set("q", trimmed)
      params.set("order", currentOrder)
      params.set("sources", enabled.join(","))
      router.push(`/search?${params.toString()}`)
    }
  }

  function handleOrderChange(order: string) {
    const enabled = getEnabledList()
    const params = new URLSearchParams()
    if (query) params.set("q", query)
    params.set("order", order)
    params.set("sources", enabled.join(","))
    router.push(`/search?${params.toString()}`)
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <IconSearch className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for videos, categories, stars..."
            className="h-11 w-full rounded-xl border border-border/60 bg-muted/50 pr-4 pl-10 text-sm transition-all outline-none placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <button
          type="submit"
          className="h-11 rounded-xl bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Search
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleOrderChange(opt.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              currentOrder === opt.value
                ? "bg-primary text-primary-foreground"
                : "border border-border/60 text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {!currentQuery && searchHistory.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Recent:</span>
          {searchHistory.slice(0, 8).map((term) => (
            <button
              key={term}
              onClick={() => {
                setQuery(term)
                const enabled = getEnabledList()
                const params = new URLSearchParams()
                params.set("q", term)
                params.set("order", currentOrder)
                params.set("sources", enabled.join(","))
                router.push(`/search?${params.toString()}`)
              }}
              className="rounded-full border border-border/40 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              {term}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
