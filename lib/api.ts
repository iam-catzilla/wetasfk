export type Source = "coomer" | "kemono"

const BASE_URLS: Record<Source, string[]> = {
  coomer: ["https://official.coomer.com.co/api/v1", "https://coomer.st/api/v1"],
  kemono: ["https://kemono.cr/api/v1"],
}

const WEB_ORIGINS: Record<Source, string> = {
  coomer: "https://official.coomer.com.co",
  kemono: "https://kemono.cr",
}

const SESSION_COOKIES = [
  "session=eyJfcGVybWFuZW50Ijp0cnVlLCJhY2NvdW50X2lkIjoxOTA4ODI1fQ.aVfvkg.X5SMH4QZ6lN5MfcjtuPU-RPMXEc",
  "session=eyJfcGVybWFuZW50Ijp0cnVlLCJhY2NvdW50X2lkIjoxOTEwODgyfQ.aVqn_A.m01x6ji3CP9oAhkFppolNcM2MvY",
  "session=eyJfcGVybWFuZW50Ijp0cnVlLCJhY2NvdW50X2lkIjoxOTEwODg0fQ.aVqoLA.N_la-lhzKgpa2gYstFc78LutY2A",
]

let currentCookieIndex = 0

function getNextSessionCookie() {
  const cookie = SESSION_COOKIES[currentCookieIndex]
  currentCookieIndex = (currentCookieIndex + 1) % SESSION_COOKIES.length
  return cookie
}

export interface Creator {
  id: string
  name: string
  service: string
  indexed: number
  updated: number
  favorited: number
}

export interface Post {
  id: string
  user: string
  service: string
  title: string
  content: string
  substring: string // HTML content
  embed: {
    url: string
    description: string
    title: string
  }
  shared_file: boolean
  added: string
  published: string
  edited: string | null
  file: {
    name: string
    path: string
    server?: string
  } | null
  attachments: Array<{
    name: string
    path: string
    server?: string
  }>
  tags: string[] | null
  next?: string | null
  prev?: string | null
}

export interface CreatorProfile extends Creator {
  post_count: number
  dm_count: number
  share_count: number
  chat_count: number
  public_id: string
}

async function fetchAPI<T>(
  endpoint: string,
  source: Source = "coomer"
): Promise<T> {
  const baseUrls = Array.isArray(BASE_URLS[source])
    ? BASE_URLS[source]
    : [BASE_URLS[source]]
  const isBrowser = typeof window !== "undefined"
  let lastError: Error | null = null

  for (const baseUrl of baseUrls) {
    const targetUrl = `${baseUrl}${endpoint}`
    const url = isBrowser
      ? `/api/proxy?url=${encodeURIComponent(targetUrl)}`
      : targetUrl

    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          Cookie: getNextSessionCookie(),
        },
        next: { revalidate: 3600 },
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }

      return response.json()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("API fetch failed")
    }
  }

  throw lastError ?? new Error("API fetch failed")
}

function decodeHtmlEntities(value?: string | null): string {
  if (!value) return ""

  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, dec: string) =>
      String.fromCodePoint(Number.parseInt(dec, 10))
    )
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function fallbackTitle(post: Partial<Post>): string {
  const fromSubstring = stripHtml(decodeHtmlEntities(post.substring))
  if (fromSubstring) return fromSubstring.slice(0, 90)

  const fromContent = stripHtml(decodeHtmlEntities(post.content))
  if (fromContent) return fromContent.slice(0, 90)

  return "Untitled Post"
}

function normalizePost(
  post: Partial<Post>,
  serverByPath?: Map<string, string>
): Post {
  const decodedTitle = decodeHtmlEntities(post.title).trim()
  const decodedContent = decodeHtmlEntities(post.content)
  const decodedSubstring = decodeHtmlEntities(post.substring)

  const normalizedFilePath = post.file?.path?.trim()
  const normalizedFile = normalizedFilePath
    ? {
        name: post.file?.name || "",
        path: normalizedFilePath,
        server:
          post.file?.server ||
          serverByPath?.get(normalizedFilePath) ||
          undefined,
      }
    : null

  const normalizedAttachments = Array.isArray(post.attachments)
    ? post.attachments
        .map((attachment) => {
          const attachmentPath = attachment?.path?.trim()
          if (!attachmentPath) return null
          return {
            name: attachment?.name || "",
            path: attachmentPath,
            server:
              attachment?.server ||
              serverByPath?.get(attachmentPath) ||
              undefined,
          }
        })
        .filter((attachment): attachment is NonNullable<typeof attachment> =>
          Boolean(attachment)
        )
    : []

  return {
    id: String(post.id || ""),
    user: String(post.user || ""),
    service: String(post.service || ""),
    title: decodedTitle || fallbackTitle(post),
    content: decodedContent,
    substring: decodedSubstring,
    embed: {
      url: post.embed?.url || "",
      description: post.embed?.description || "",
      title: post.embed?.title || "",
    },
    shared_file: Boolean(post.shared_file),
    added: post.added || "",
    published: post.published || "",
    edited: post.edited ?? null,
    file: normalizedFile,
    attachments: normalizedAttachments,
    tags: post.tags ?? null,
    next: post.next ?? null,
    prev: post.prev ?? null,
  }
}

export const api = {
  getSourceFromService: (service: string): Source => {
    const coomerServices = ["onlyfans", "fansly", "candygirl"]
    return coomerServices.includes(service.toLowerCase()) ? "coomer" : "kemono"
  },

  getMediaUrl: (
    path: string,
    source: Source = "coomer",
    server?: string
  ): string => {
    if (!path) return ""
    if (/^https?:\/\//i.test(path)) return path

    const cleanPath = path.startsWith("/") ? path : `/${path}`
    const isImage = /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(cleanPath)
    const isVideo = /\.(mp4|webm|mov|mkv|m4v)$/i.test(cleanPath)

    const proxifyVideo = (url: string): string => {
      if (!isVideo) return url
      return `/api/media?url=${encodeURIComponent(url)}`
    }

    if (server) {
      if (source === "coomer" && isImage) {
        return `https://img.coomer.st/thumbnail/data${cleanPath}`
      }
      const cleanServer = server.replace(/\/$/, "")
      return proxifyVideo(`${cleanServer}${cleanPath}`)
    }

    if (source === "coomer") {
      if (isVideo) {
        return proxifyVideo(`https://n3.coomer.st/data${cleanPath}`)
      }
      return `https://img.coomer.st/thumbnail/data${cleanPath}`
    }

    const domain = "kemono.cr"
    const finalPath = cleanPath.startsWith("/data")
      ? cleanPath
      : `/data${cleanPath}`
    return proxifyVideo(`https://n1.${domain}${finalPath}`)
  },

  getIconUrl: (
    service: string,
    id: string,
    source: Source = "coomer"
  ): string => {
    return `${WEB_ORIGINS[source]}/icons/${service}/${id}`
  },

  getBannerUrl: (
    service: string,
    id: string,
    source: Source = "coomer"
  ): string => {
    return `${WEB_ORIGINS[source]}/banners/${service}/${id}`
  },

  getRecentPosts: async (
    source: Source = "coomer",
    offset = 0,
    query?: string
  ): Promise<Post[]> => {
    const q = query ? `&q=${encodeURIComponent(query)}` : ""
    const data = await fetchAPI<{ posts: Partial<Post>[] }>(
      `/posts?o=${offset}${q}`,
      source
    )
    return (data.posts || []).map((post) => normalizePost(post))
  },

  getCreators: async (source: Source = "coomer"): Promise<Creator[]> => {
    return fetchAPI<Creator[]>("/creators", source)
  },

  getProfile: async (
    service: string,
    userId: string,
    source: Source = "coomer"
  ): Promise<CreatorProfile> => {
    return fetchAPI<CreatorProfile>(
      `/${service}/user/${userId}/profile`,
      source
    )
  },

  getCreatorPosts: async (
    service: string,
    userId: string,
    source: Source = "coomer",
    offset = 0,
    query?: string
  ): Promise<Post[]> => {
    const q = query ? `&q=${encodeURIComponent(query)}` : ""
    const data = await fetchAPI<Partial<Post>[]>(
      `/${service}/user/${userId}/posts?o=${offset}${q}`,
      source
    )
    return (data || []).map((post) => normalizePost(post))
  },

  getPost: async (
    service: string,
    userId: string,
    postId: string,
    source: Source = "coomer"
  ): Promise<Post> => {
    const data = await fetchAPI<{
      post: Partial<Post>
      attachments?: Array<{ path?: string; server?: string }>
      previews?: Array<{ path?: string; server?: string }>
      videos?: Array<{ path?: string; server?: string }>
    }>(`/${service}/user/${userId}/post/${postId}`, source)

    const serverByPath = new Map<string, string>()
    for (const media of [
      ...(data.attachments || []),
      ...(data.previews || []),
      ...(data.videos || []),
    ]) {
      if (media?.path && media?.server) {
        serverByPath.set(media.path, media.server)
      }
    }

    return normalizePost(data.post || {}, serverByPath)
  },

  getRandomArtist: async (
    source: Source = "coomer"
  ): Promise<{ service: string; artist_id: string }> => {
    return fetchAPI<{ service: string; artist_id: string }>(
      "/artists/random",
      source
    )
  },

  getRandomPost: async (
    source: Source = "coomer"
  ): Promise<{ service: string; artist_id: string; post_id: string }> => {
    return fetchAPI<{ service: string; artist_id: string; post_id: string }>(
      "/posts/random",
      source
    )
  },

  getRandomArtists: async (
    source: Source = "coomer",
    count = 12
  ): Promise<Creator[]> => {
    const creators = await api.getCreators(source)
    return creators.sort(() => 0.5 - Math.random()).slice(0, count)
  },

  searchCreators: async (
    query: string,
    source: Source = "coomer"
  ): Promise<Creator[]> => {
    const creators = await api.getCreators(source)
    const lowerQuery = query.toLowerCase()
    return creators
      .filter(
        (c) =>
          c.name.toLowerCase().includes(lowerQuery) ||
          c.id.toLowerCase().includes(lowerQuery)
      )
      .slice(0, 50)
  },

  getTags: async (source: Source = "coomer"): Promise<string[]> => {
    // The API doesn't have a direct tags endpoint, usually tags are in posts
    return ["onlyfans", "fansly", "patreon", "candygirl", "gumroad"]
  },

  getPopularPosts: async (
    source: Source = "coomer",
    period: string = "recent"
  ): Promise<Post[]> => {
    const data = await fetchAPI<{ posts: Partial<Post>[] }>(
      `/posts/popular?period=${period}`,
      source
    )
    return (data.posts || []).map((post) => normalizePost(post))
  },

  getRecommendedCreators: async (
    service: string,
    userId: string,
    source: Source = "coomer"
  ): Promise<Creator[]> => {
    return fetchAPI<Creator[]>(`/${service}/user/${userId}/recommended`, source)
  },
}
