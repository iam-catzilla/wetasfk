"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { useSource } from "@/lib/source-context"
import { IconLoader2 } from "@tabler/icons-react"

export default function RandomPostPage() {
  const router = useRouter()
  const { source } = useSource()

  useEffect(() => {
    const fetchRandom = async () => {
      try {
        const data = await api.getRandomPost(source)
        if (data && data.service && data.artist_id && data.post_id) {
          router.replace(
            `/post/${data.service}/${data.artist_id}/${data.post_id}`
          )
        }
      } catch (error) {
        console.error("Failed to fetch random post:", error)
      }
    }
    fetchRandom()
  }, [source, router])

  return (
    <div className="flex h-[50vh] w-full flex-col items-center justify-center gap-4">
      <IconLoader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground">Finding a random post...</p>
    </div>
  )
}
