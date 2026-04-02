"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { useSource } from "@/lib/source-context"
import { IconLoader2 } from "@tabler/icons-react"

export default function RandomCreatorPage() {
  const router = useRouter()
  const { source } = useSource()

  useEffect(() => {
    const fetchRandom = async () => {
      try {
        const data = await api.getRandomArtist(source)
        if (data && data.service && data.artist_id) {
          router.replace(`/user/${data.service}/${data.artist_id}`)
        }
      } catch (error) {
        console.error("Failed to fetch random artist:", error)
      }
    }
    fetchRandom()
  }, [source, router])

  return (
    <div className="flex h-[50vh] w-full flex-col items-center justify-center gap-4">
      <IconLoader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground">Finding a random creator...</p>
    </div>
  )
}
