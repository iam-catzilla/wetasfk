export type Source = "coomer" | "kemono";

const BASE_URLS: Record<Source, string> = {
  coomer: "https://coomer.st/api/v1",
  kemono: "https://kemono.cr/api/v1",
};

const SESSION_COOKIES = [
  "session=eyJfcGVybWFuZW50Ijp0cnVlLCJhY2NvdW50X2lkIjoxOTA4ODI1fQ.aVfvkg.X5SMH4QZ6lN5MfcjtuPU-RPMXEc",
  "session=eyJfcGVybWFuZW50Ijp0cnVlLCJhY2NvdW50X2lkIjoxOTEwODgyfQ.aVqn_A.m01x6ji3CP9oAhkFppolNcM2MvY",
  "session=eyJfcGVybWFuZW50Ijp0cnVlLCJhY2NvdW50X2lkIjoxOTEwODg0fQ.aVqoLA.N_la-lhzKgpa2gYstFc78LutY2A",
];

let currentCookieIndex = 0;

function getNextSessionCookie() {
  const cookie = SESSION_COOKIES[currentCookieIndex];
  currentCookieIndex = (currentCookieIndex + 1) % SESSION_COOKIES.length;
  return cookie;
}

export interface Creator {
  id: string;
  name: string;
  service: string;
  indexed: number;
  updated: number;
  favorited: number;
}

export interface Post {
  id: string;
  user: string;
  service: string;
  title: string;
  content: string;
  substring: string; // HTML content
  embed: {
    url: string;
    description: string;
    title: string;
  };
  shared_file: boolean;
  added: string;
  published: string;
  edited: string | null;
  file: {
    name: string;
    path: string;
  } | null;
  attachments: Array<{
    name: string;
    path: string;
  }>;
  tags: string[] | null;
  next?: string | null;
  prev?: string | null;
}

export interface CreatorProfile extends Creator {
  post_count: number;
  dm_count: number;
  share_count: number;
  chat_count: number;
  public_id: string;
}

async function fetchAPI<T>(
  endpoint: string,
  source: Source = "coomer"
): Promise<T> {
  const baseUrl = BASE_URLS[source];
  const targetUrl = `${baseUrl}${endpoint}`;

  // Use proxy to bypass CORS if in browser
  const isBrowser = typeof window !== "undefined";
  const url = isBrowser
    ? `/api/proxy?url=${encodeURIComponent(targetUrl)}`
    : targetUrl;

  const response = await fetch(url, {
    headers: {
      Accept: "text/css",
      Cookie: getNextSessionCookie(),
    },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  getSourceFromService: (service: string): Source => {
    const coomerServices = ["onlyfans", "fansly", "candygirl"];
    return coomerServices.includes(service.toLowerCase()) ? "coomer" : "kemono";
  },

  getMediaUrl: (
    path: string,
    source: Source = "coomer",
    server?: string
  ): string => {
    if (!path) return "";
    if (server)
      return `${server}/data${path.startsWith("/") ? path : `/${path}`}`;
    const domain = source === "coomer" ? "coomer.st" : "kemono.cr";
    // Ensure path starts with / and handle if it already contains /data
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const finalPath = cleanPath.startsWith("/data")
      ? cleanPath
      : `/data${cleanPath}`;
    return `https://n1.${domain}${finalPath}`;
  },

  getIconUrl: (
    service: string,
    id: string,
    source: Source = "coomer"
  ): string => {
    const domain = source === "coomer" ? "coomer.st" : "kemono.cr";
    return `https://${domain}/icons/${service}/${id}`;
  },

  getBannerUrl: (
    service: string,
    id: string,
    source: Source = "coomer"
  ): string => {
    const domain = source === "coomer" ? "coomer.st" : "kemono.cr";
    return `https://${domain}/banners/${service}/${id}`;
  },

  getRecentPosts: async (
    source: Source = "coomer",
    offset = 0,
    query?: string
  ): Promise<Post[]> => {
    const q = query ? `&q=${encodeURIComponent(query)}` : "";
    const data = await fetchAPI<{ posts: Post[] }>(
      `/posts?o=${offset}${q}`,
      source
    );
    return data.posts;
  },

  getCreators: async (source: Source = "coomer"): Promise<Creator[]> => {
    return fetchAPI<Creator[]>("/creators", source);
  },

  getProfile: async (
    service: string,
    userId: string,
    source: Source = "coomer"
  ): Promise<CreatorProfile> => {
    return fetchAPI<CreatorProfile>(
      `/${service}/user/${userId}/profile`,
      source
    );
  },

  getCreatorPosts: async (
    service: string,
    userId: string,
    source: Source = "coomer",
    offset = 0,
    query?: string
  ): Promise<Post[]> => {
    const q = query ? `&q=${encodeURIComponent(query)}` : "";
    const data = await fetchAPI<Post[]>(
      `/${service}/user/${userId}/posts?o=${offset}${q}`,
      source
    );
    return data;
  },

  getPost: async (
    service: string,
    userId: string,
    postId: string,
    source: Source = "coomer"
  ): Promise<Post> => {
    const data = await fetchAPI<{ post: Post }>(
      `/${service}/user/${userId}/post/${postId}`,
      source
    );
    return data.post;
  },

  getRandomArtist: async (
    source: Source = "coomer"
  ): Promise<{ service: string; artist_id: string }> => {
    return fetchAPI<{ service: string; artist_id: string }>(
      "/artists/random",
      source
    );
  },

  getRandomPost: async (
    source: Source = "coomer"
  ): Promise<{ service: string; artist_id: string; post_id: string }> => {
    return fetchAPI<{ service: string; artist_id: string; post_id: string }>(
      "/posts/random",
      source
    );
  },

  getRandomArtists: async (
    source: Source = "coomer",
    count = 12
  ): Promise<Creator[]> => {
    const creators = await api.getCreators(source);
    return creators.sort(() => 0.5 - Math.random()).slice(0, count);
  },

  searchCreators: async (
    query: string,
    source: Source = "coomer"
  ): Promise<Creator[]> => {
    const creators = await api.getCreators(source);
    const lowerQuery = query.toLowerCase();
    return creators
      .filter(
        (c) =>
          c.name.toLowerCase().includes(lowerQuery) ||
          c.id.toLowerCase().includes(lowerQuery)
      )
      .slice(0, 50);
  },

  getTags: async (source: Source = "coomer"): Promise<string[]> => {
    // The API doesn't have a direct tags endpoint, usually tags are in posts
    return ["onlyfans", "fansly", "patreon", "candygirl", "gumroad"];
  },

  getPopularPosts: async (
    source: Source = "coomer",
    period: string = "recent"
  ): Promise<Post[]> => {
    const data = await fetchAPI<{ posts: Post[] }>(
      `/posts/popular?period=${period}`,
      source
    );
    return data.posts;
  },

  getRecommendedCreators: async (
    service: string,
    userId: string,
    source: Source = "coomer"
  ): Promise<Creator[]> => {
    return fetchAPI<Creator[]>(
      `/${service}/user/${userId}/recommended`,
      source
    );
  },
};
