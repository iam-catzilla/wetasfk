"use client"

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react"
import { Creator } from "./api"

interface FavoritesContextType {
  favorites: Creator[]
  toggleFavorite: (creator: Creator) => void
  isFavorite: (creator: Creator) => boolean
  importFavorites: (items: Creator[]) => void
}

export const FavoritesContext = createContext<FavoritesContextType | undefined>(
  undefined
)

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<Creator[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("favorites")
    if (stored) {
      try {
        setFavorites(JSON.parse(stored))
      } catch (e) {
        console.error("Failed to parse favorites", e)
      }
    }
    setIsLoaded(true)
  }, [])

  // Listen for changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "favorites" && e.newValue) {
        try {
          setFavorites(JSON.parse(e.newValue))
        } catch (err) {
          console.error("Failed to sync favorites from storage", err)
        }
      }
    }

    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [])

  // Sync with localStorage whenever favorites change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("favorites", JSON.stringify(favorites))
    }
  }, [favorites, isLoaded])

  const toggleFavorite = useCallback((creator: Creator) => {
    setFavorites((prev) => {
      const exists = prev.find(
        (c) => c.id === creator.id && c.service === creator.service
      )
      if (exists) {
        return prev.filter(
          (c) => !(c.id === creator.id && c.service === creator.service)
        )
      } else {
        return [...prev, creator]
      }
    })
  }, [])

  const isFavorite = useCallback(
    (creator: Creator) => {
      return favorites.some(
        (c) => c.id === creator.id && c.service === creator.service
      )
    },
    [favorites]
  )

  const importFavorites = useCallback((items: Creator[]) => {
    setFavorites((prev) => {
      const seen = new Set(prev.map((c) => `${c.id}:${c.service}`))
      const newItems = items.filter((c) => !seen.has(`${c.id}:${c.service}`))
      return [...prev, ...newItems]
    })
  }, [])

  return (
    <FavoritesContext.Provider
      value={{ favorites, toggleFavorite, isFavorite, importFavorites }}
    >
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const context = useContext(FavoritesContext)
  if (context === undefined) {
    throw new Error("useFavorites must be used within a FavoritesProvider")
  }
  return context
}
