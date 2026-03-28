"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type {
  FavoriteItem,
  WatchHistoryItem,
  VideoSource,
  Playlist,
  PlaylistItem,
} from "./types"
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

  // Playlist
  playlists: Playlist[]
  createPlaylist: (name: string) => string
  deletePlaylist: (id: string) => void
  renamePlaylist: (id: string, name: string) => void
  addToPlaylist: (playlistId: string, item: PlaylistItem) => void
  removeFromPlaylist: (playlistId: string, videoId: string) => void
  getPlaylistById: (id: string) => Playlist | undefined
  isInPlaylist: (playlistId: string, videoId: string) => boolean
  importPlaylist: (playlist: Playlist) => void
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

      // Playlist
      playlists: [],

      createPlaylist: (name) => {
        const id = `pl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
        const now = Date.now()
        set((state) => ({
          playlists: [
            ...state.playlists,
            { id, name, items: [], createdAt: now, updatedAt: now },
          ],
        }))
        return id
      },

      deletePlaylist: (id) =>
        set((state) => ({
          playlists: state.playlists.filter((p) => p.id !== id),
        })),

      renamePlaylist: (id, name) =>
        set((state) => ({
          playlists: state.playlists.map((p) =>
            p.id === id ? { ...p, name, updatedAt: Date.now() } : p
          ),
        })),

      addToPlaylist: (playlistId, item) =>
        set((state) => ({
          playlists: state.playlists.map((p) => {
            if (p.id !== playlistId) return p
            if (p.items.some((i) => i.id === item.id)) return p
            return {
              ...p,
              items: [...p.items, item],
              updatedAt: Date.now(),
            }
          }),
        })),

      removeFromPlaylist: (playlistId, videoId) =>
        set((state) => ({
          playlists: state.playlists.map((p) => {
            if (p.id !== playlistId) return p
            return {
              ...p,
              items: p.items.filter((i) => i.id !== videoId),
              updatedAt: Date.now(),
            }
          }),
        })),

      getPlaylistById: (id) => get().playlists.find((p) => p.id === id),

      isInPlaylist: (playlistId, videoId) => {
        const pl = get().playlists.find((p) => p.id === playlistId)
        return pl ? pl.items.some((i) => i.id === videoId) : false
      },

      importPlaylist: (playlist) =>
        set((state) => {
          // Generate a new id so imports never clash
          const id = `pl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
          return {
            playlists: [
              ...state.playlists,
              { ...playlist, id, createdAt: Date.now(), updatedAt: Date.now() },
            ],
          }
        }),
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
        // Ensure playlists array exists for older persisted data
        if (!Array.isArray((merged as AppStore).playlists)) {
          ;(merged as AppStore).playlists = []
        }
        return merged as AppStore
      },
    }
  )
)
