"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { FavoriteItem, WatchHistoryItem } from "./types"

interface AppStore {
  favorites: FavoriteItem[]
  watchHistory: WatchHistoryItem[]
  searchHistory: string[]

  addFavorite: (item: FavoriteItem) => void
  removeFavorite: (id: string) => void
  isFavorite: (id: string) => boolean

  addToHistory: (item: WatchHistoryItem) => void
  clearHistory: () => void

  addSearchTerm: (term: string) => void
  clearSearchHistory: () => void

  videoSource: "eporner" | "sxyporn" | "both"
  setVideoSource: (source: "eporner" | "sxyporn" | "both") => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      favorites: [],
      watchHistory: [],
      searchHistory: [],

      addFavorite: (item) =>
        set((state) => {
          if (state.favorites.some((f) => f.id === item.id)) return state
          return { favorites: [item, ...state.favorites] }
        }),

      removeFavorite: (id) =>
        set((state) => ({
          favorites: state.favorites.filter((f) => f.id !== id),
        })),

      isFavorite: (id) => get().favorites.some((f) => f.id === id),

      addToHistory: (item) =>
        set((state) => {
          const filtered = state.watchHistory.filter((h) => h.id !== item.id)
          return { watchHistory: [item, ...filtered].slice(0, 100) }
        }),

      clearHistory: () => set({ watchHistory: [] }),

      addSearchTerm: (term) =>
        set((state) => {
          const filtered = state.searchHistory.filter((t) => t !== term)
          return { searchHistory: [term, ...filtered].slice(0, 20) }
        }),

      clearSearchHistory: () => set({ searchHistory: [] }),

      videoSource: "eporner" as const,
      setVideoSource: (source) => set({ videoSource: source }),
    }),
    {
      name: "wetasfk-store",
    }
  )
)
