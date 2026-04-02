"use client"

import { useAppStore } from "@/lib/store"
import { use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  IconTrash,
  IconPlayerPlay,
  IconArrowLeft,
  IconEdit,
  IconCheck,
  IconDeviceTv,
} from "@tabler/icons-react"
import { useState } from "react"

interface Props {
  params: Promise<{ playlistId: string }>
}

export default function PlaylistPage({ params }: Props) {
  const { playlistId } = use(params)
  const router = useRouter()
  const {
    getPlaylistById,
    removeFromPlaylist,
    renamePlaylist,
    deletePlaylist,
  } = useAppStore()
  const playlist = getPlaylistById(playlistId)

  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState("")

  if (!playlist) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <IconDeviceTv className="mb-4 size-12 text-muted-foreground/40" />
        <p className="text-lg font-medium text-muted-foreground">
          Playlist not found
        </p>
        <Link
          href="/library"
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Back to Library
        </Link>
      </div>
    )
  }

  function handleRename() {
    const trimmed = editName.trim()
    if (trimmed && trimmed !== playlist!.name) {
      renamePlaylist(playlist!.id, trimmed)
    }
    setEditing(false)
  }

  function handleDelete() {
    deletePlaylist(playlist!.id)
    router.push("/library")
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link
          href="/library"
          className="flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <IconArrowLeft className="size-4" />
          Library
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {editing ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleRename()
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoFocus
                  className="h-10 flex-1 rounded-lg border border-border/60 bg-muted/50 px-3 font-heading text-xl font-bold outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                  maxLength={100}
                />
                <button
                  type="submit"
                  className="rounded-lg bg-primary p-2 text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <IconCheck className="size-5" />
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-2xl font-bold tracking-tight">
                  {playlist.name}
                </h1>
                <button
                  onClick={() => {
                    setEditName(playlist.name)
                    setEditing(true)
                  }}
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  title="Rename"
                >
                  <IconEdit className="size-4" />
                </button>
              </div>
            )}
            <p className="mt-1 text-sm text-muted-foreground">
              {playlist.items.length} video
              {playlist.items.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {playlist.items.length > 0 && (
              <Link
                href={`/watch/${playlist.items[0].id}?playlist=${playlist.id}`}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <IconPlayerPlay className="size-4" />
                Play all
              </Link>
            )}
            <button
              onClick={handleDelete}
              className="rounded-lg border border-border/60 p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              title="Delete playlist"
            >
              <IconTrash className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Video list */}
      {playlist.items.length > 0 ? (
        <div className="flex flex-col gap-2">
          {playlist.items.map((item, index) => (
            <div
              key={item.id}
              className="group flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent"
            >
              <span className="w-6 shrink-0 text-center text-xs text-muted-foreground">
                {index + 1}
              </span>

              <Link
                href={`/watch/${item.id}?playlist=${playlist.id}`}
                className="relative aspect-video w-36 shrink-0 overflow-hidden rounded-md bg-muted"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.thumb}
                  alt={item.title}
                  className="size-full object-cover"
                  loading="lazy"
                />
                <div className="absolute right-1 bottom-1 rounded bg-black/80 px-1 py-0.5 text-[10px] text-white">
                  {item.duration}
                </div>
              </Link>

              <Link
                href={`/watch/${item.id}?playlist=${playlist.id}`}
                className="min-w-0 flex-1"
              >
                <p className="line-clamp-2 text-sm leading-snug font-medium group-hover:text-foreground">
                  {item.title}
                </p>
              </Link>

              <button
                onClick={() => removeFromPlaylist(playlist.id, item.id)}
                className="shrink-0 rounded-lg p-1.5 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                title="Remove from playlist"
              >
                <IconTrash className="size-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <IconDeviceTv className="mb-4 size-12 text-muted-foreground/40" />
          <p className="text-lg font-medium text-muted-foreground">
            This playlist is empty
          </p>
          <p className="mt-1 text-sm text-muted-foreground/60">
            Save videos from any watch page
          </p>
        </div>
      )}
    </div>
  )
}
