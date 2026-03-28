"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { FavoriteItem, WatchHistoryItem, VideoSource } from "./types"
import { ALL_SOURCES, DEFAULT_ENABLED } from "./source-config"

export { ALL_SOURCES, DEFAULT_ENABLED }

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

  enabledSources: Record<VideoSource, boolean>
  toggleSource: (source: VideoSource) => void
  getEnabledList: () => VideoSource[]
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

      enabledSources: { ...DEFAULT_ENABLED },
      toggleSource: (source) =>
        set((state) => {
          const next = {
            ...state.enabledSources,
            [source]: !state.enabledSources[source],
          }
          // Ensure at least one source remains enabled
          if (!Object.values(next).some(Boolean)) return state
          return { enabledSources: next }
        }),
      getEnabledList: () => {
        const s = get().enabledSources
        return ALL_SOURCES.filter((k) => s[k])
      },
    }),
    {
      name: "wetasfk-store",
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as object) }
        // Ensure enabledSources has all keys (handles new sources added later)
        const es = (merged as AppStore).enabledSources || {}
        for (const src of ALL_SOURCES) {
          if (es[src] === undefined) es[src] = DEFAULT_ENABLED[src]
        }
        ;(merged as AppStore).enabledSources = es
        return merged as AppStore
      },
    }
  )
)
