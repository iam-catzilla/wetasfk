"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { useAppStore } from "@/lib/store"
import { IconPlus, IconCheck, IconPlaylist } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

interface SaveToPlaylistProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  videoId: string
  videoTitle: string
  videoThumb: string
  videoDuration: string
}

export function SaveToPlaylistDialog({
  open,
  onOpenChange,
  videoId,
  videoTitle,
  videoThumb,
  videoDuration,
}: SaveToPlaylistProps) {
  const {
    playlists,
    createPlaylist,
    addToPlaylist,
    removeFromPlaylist,
    isInPlaylist,
  } = useAppStore()

  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState("")

  function handleToggle(playlistId: string) {
    if (isInPlaylist(playlistId, videoId)) {
      removeFromPlaylist(playlistId, videoId)
    } else {
      addToPlaylist(playlistId, {
        id: videoId,
        title: videoTitle,
        thumb: videoThumb,
        duration: videoDuration,
        addedAt: Date.now(),
      })
    }
  }

  function handleCreate() {
    const trimmed = newName.trim()
    if (!trimmed) return
    const id = createPlaylist(trimmed)
    addToPlaylist(id, {
      id: videoId,
      title: videoTitle,
      thumb: videoThumb,
      duration: videoDuration,
      addedAt: Date.now(),
    })
    setNewName("")
    setCreating(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm gap-0 p-0">
        <DialogTitle className="border-b border-border/60 px-5 py-4 text-base font-semibold">
          Save to…
        </DialogTitle>

        <div className="max-h-72 overflow-y-auto px-2 py-2">
          {playlists.length === 0 && !creating && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No playlists yet. Create one below.
            </p>
          )}

          {playlists.map((pl) => {
            const inList = isInPlaylist(pl.id, videoId)
            return (
              <button
                key={pl.id}
                onClick={() => handleToggle(pl.id)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent"
              >
                <div
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded border transition-colors",
                    inList
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border"
                  )}
                >
                  {inList && <IconCheck className="size-3.5" />}
                </div>
                <IconPlaylist className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 truncate text-sm font-medium">
                  {pl.name}
                </span>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                  {pl.items.length}
                </span>
              </button>
            )
          })}
        </div>

        <div className="border-t border-border/60 p-3">
          {creating ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleCreate()
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Playlist name"
                autoFocus
                className="h-9 flex-1 rounded-lg border border-border/60 bg-muted/50 px-3 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                maxLength={100}
              />
              <button
                type="submit"
                disabled={!newName.trim()}
                className="h-9 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreating(false)
                  setNewName("")
                }}
                className="h-9 rounded-lg border border-border/60 px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              onClick={() => setCreating(true)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <IconPlus className="size-4" />
              Create new playlist
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
