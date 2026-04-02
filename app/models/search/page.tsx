"use client"

import { useEffect, useState, useMemo, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { api, Creator } from "@/lib/api"
import { ArtistCard } from "@/components/artist-card"
import { useSource } from "@/lib/source-context"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { IconLoader2, IconSearch } from "@tabler/icons-react"

const ITEMS_PER_PAGE = 24

export default function CreatorsSearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <IconLoader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  )
}

function SearchContent() {
  const { source } = useSource()
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get("q") || ""

  const [allCreators, setAllCreators] = useState<Creator[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [serviceFilter, setServiceFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("popularity")
  const [currentPage, setCurrentPage] = useState(1)

  // Update searchQuery when URL param changes
  useEffect(() => {
    const q = searchParams.get("q")
    if (q) setSearchQuery(q)
  }, [searchParams])

  useEffect(() => {
    const fetchCreators = async () => {
      setLoading(true)
      try {
        const data = await api.getCreators(source)
        setAllCreators(data)
      } catch (error) {
        console.error("Failed to fetch creators:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchCreators()
  }, [source])

  const filteredCreators = useMemo(() => {
    let result = [...allCreators]

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.id.toLowerCase().includes(query)
      )
    }

    // Filter by service
    if (serviceFilter !== "all") {
      result = result.filter(
        (c) => c.service.toLowerCase() === serviceFilter.toLowerCase()
      )
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === "popularity") {
        return (b.favorited || 0) - (a.favorited || 0)
      } else if (sortBy === "name") {
        return a.name.localeCompare(b.name)
      } else if (sortBy === "indexed") {
        return (b.indexed || 0) - (a.indexed || 0)
      }
      return 0
    })

    return result
  }, [allCreators, searchQuery, serviceFilter, sortBy])

  const totalPages = Math.ceil(filteredCreators.length / ITEMS_PER_PAGE)
  const paginatedCreators = filteredCreators.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, serviceFilter, sortBy])

  const services = Array.from(new Set(allCreators.map((c) => c.service))).sort()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Search Models
        </h1>
        {!loading && (
          <p className="mt-1 text-sm text-muted-foreground">
            {filteredCreators.length.toLocaleString()} models found
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <IconSearch className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search models..."
            className="h-11 rounded-xl border-border/60 bg-muted/50 pl-10 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select
          value={serviceFilter}
          onValueChange={(v) => setServiceFilter(v ?? "all")}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="All Services" />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="all">All Services</SelectItem>
            {services.map((s) => (
              <SelectItem key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={sortBy}
          onValueChange={(v) => setSortBy(v ?? "popularity")}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Popularity" />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="popularity">Popularity</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="indexed">Recently Indexed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <IconLoader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <>
          {filteredCreators.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-lg font-medium text-muted-foreground">
                No models found
              </p>
              <p className="mt-1 text-sm text-muted-foreground/60">
                Try a different search or filter
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {paginatedCreators.map((creator) => (
                <ArtistCard
                  key={creator.id + creator.service}
                  artist={creator}
                />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <Button
                    variant="ghost"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                </PaginationItem>
                <PaginationItem>
                  <span className="px-4 text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <Button
                    variant="ghost"
                    disabled={currentPage === totalPages}
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                  >
                    Next
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </div>
  )
}
