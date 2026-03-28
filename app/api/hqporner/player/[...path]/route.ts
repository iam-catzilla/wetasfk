import { NextRequest, NextResponse } from "next/server"

const HQ_BASE = "https://hqporner.com"
const PROXY_URL = "https://api.codetabs.com/v1/proxy/?quest="

async function proxyFetch(url: string): Promise<string> {
  const res = await fetch(`${PROXY_URL}${encodeURIComponent(url)}`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" },
  })
  if (!res.ok) throw new Error(`Proxy error: ${res.status}`)
  return res.text()
}

function extractVideoUrls(html: string): { mp4: string[]; hls: string[] } {
  const mp4: string[] = []
  const hls: string[] = []

  // Pattern 1: <source src="...mp4">
  for (const m of html.matchAll(/<source[^>]+src="([^"]+\.mp4[^"]*)"/gi)) {
    mp4.push(m[1])
  }

  // Pattern 2: file:"..." or file: "..." (JWPlayer style)
  for (const m of html.matchAll(
    /file\s*:\s*["']([^"']+\.(?:mp4|m3u8)[^"']*)/gi
  )) {
    if (m[1].includes(".m3u8")) hls.push(m[1])
    else mp4.push(m[1])
  }

  // Pattern 3: video tag src
  for (const m of html.matchAll(/<video[^>]+src="([^"]+\.mp4[^"]*)"/gi)) {
    mp4.push(m[1])
  }

  // Pattern 4: Direct MP4 URL in JS (common in mydaddy.cc)
  for (const m of html.matchAll(
    /["'](https?:\/\/[^"'\s]+\.mp4(?:\?[^"'\s]*)?)["']/gi
  )) {
    if (!mp4.includes(m[1])) mp4.push(m[1])
  }

  // Pattern 5: HLS m3u8
  for (const m of html.matchAll(
    /["'](https?:\/\/[^"'\s]+\.m3u8(?:\?[^"'\s]*)?)["']/gi
  )) {
    if (!hls.includes(m[1])) hls.push(m[1])
  }

  // Pattern 6: eval(function(p,a,c,k,e,d) packed JS — try to unpack and find URLs
  const packedMatch = html.match(
    /eval\(function\(p,a,c,k,e,[dr]\)\{[\s\S]*?\}(?:\([\s\S]*?\))\)/
  )
  if (packedMatch) {
    // Extract strings that look like URLs from the packed source
    for (const m of packedMatch[0].matchAll(
      /(https?:\/\/[^"'\\\s]+\.(?:mp4|m3u8)[^"'\\\s]*)/gi
    )) {
      if (m[1].includes(".m3u8")) hls.push(m[1])
      else mp4.push(m[1])
    }
  }

  return {
    mp4: [...new Set(mp4)],
    hls: [...new Set(hls)],
  }
}

/**
 * For each MP4 URL ending in /360.mp4 (or similar), generate variants
 * at higher resolutions. Returns URLs ordered highest-quality-first.
 * The browser's <source> fallback will try them in order.
 */
function generateQualityVariants(
  mp4Urls: string[],
  qualityOrder: string[]
): string[] {
  const result: string[] = []
  const seen = new Set<string>()

  for (const url of mp4Urls) {
    // Match URLs ending in /360.mp4, /720.mp4 etc.
    const match = url.match(/^(.+\/)\d+(\.mp4.*)$/)
    if (match) {
      for (const q of qualityOrder) {
        const variant = `${match[1]}${q}${match[2]}`
        if (!seen.has(variant)) {
          seen.add(variant)
          result.push(variant)
        }
      }
    } else {
      if (!seen.has(url)) {
        seen.add(url)
        result.push(url)
      }
    }
  }

  return result
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const id = path[0]

  if (!id || !/^\d+$/.test(id)) {
    return new NextResponse("Invalid video ID", { status: 400 })
  }

  try {
    // Step 1: Find the full video page URL via search
    const searchHtml = await proxyFetch(`${HQ_BASE}/?q=${id}`)
    const linkMatch = searchHtml.match(
      new RegExp(`href="(/hdporn/${id}-[^"]+\\.html)"`)
    )

    let videoHtml: string
    if (linkMatch) {
      videoHtml = await proxyFetch(`${HQ_BASE}${linkMatch[1]}`)
    } else {
      videoHtml = await proxyFetch(`${HQ_BASE}/hdporn/${id}.html`)
    }

    // Step 2: Extract embed URL (mydaddy.cc or similar) from AJAX player blocks
    let embedUrl = ""
    // Look for the altplayer.php AJAX URL pattern first
    const ajaxMatch = videoHtml.match(
      /url:\s*['"]\/blocks\/(?:alt|native)player\.php\?i=([^'"]+)['"]/
    )
    if (ajaxMatch) {
      embedUrl = ajaxMatch[1]
      if (embedUrl.startsWith("//")) embedUrl = `https:${embedUrl}`
    }

    if (!embedUrl) {
      // Fallback: look for iframe src with mydaddy
      const iframeMatch = videoHtml.match(
        /<iframe[^>]+src="([^"]*mydaddy[^"]*)"/i
      )
      embedUrl = iframeMatch ? iframeMatch[1] : ""
      if (embedUrl.startsWith("//")) embedUrl = `https:${embedUrl}`
    }

    if (!embedUrl) {
      return new NextResponse("Embed URL not found", { status: 502 })
    }

    // Step 3: Fetch the embed page DIRECTLY with Referer header
    // (mydaddy.cc requires Referer from hqporner.com, without it returns block page)
    const embedRes = await fetch(embedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Referer: "https://hqporner.com/",
      },
    })
    if (!embedRes.ok) {
      return new NextResponse("Embed fetch failed", { status: 502 })
    }
    const embedHtml = await embedRes.text()

    // Step 4: Extract MP4 URLs from the mydaddy.cc response
    // Pattern: src="//s29.bigcdn.cc/pubs/.../360.mp4" title="360p"
    const sources: { url: string; label: string }[] = []
    for (const m of embedHtml.matchAll(
      /src=["'](\/\/[^"']+\.mp4)["'][^>]*title=["']([^"']+)["']/g
    )) {
      sources.push({ url: `https:${m[1]}`, label: m[2] })
    }

    // Also try bare MP4 URL patterns
    if (sources.length === 0) {
      for (const m of embedHtml.matchAll(
        /["']((?:https?:)?\/\/[^"'\s]+\.mp4(?:\?[^"'\s]*)?)["']/g
      )) {
        let url = m[1]
        if (url.startsWith("//")) url = `https:${url}`
        if (!sources.find((s) => s.url === url)) {
          sources.push({ url, label: "" })
        }
      }
    }

    // Extract poster
    const posterMatch = embedHtml.match(
      /poster=["']((?:https?:)?\/\/[^"']+\.jpg)["']/
    )
    let poster = posterMatch ? posterMatch[1] : ""
    if (poster.startsWith("//")) poster = `https:${poster}`

    const urls = extractVideoUrls(embedHtml)
    const allMp4 = sources.length > 0 ? sources.map((s) => s.url) : urls.mp4

    // Generate quality variants: try 1080, 720, 480 before the original (usually 360)
    const qualityOrder = ["1080", "720", "480", "360"]
    const withQualityFallbacks = generateQualityVariants(allMp4, qualityOrder)

    if (withQualityFallbacks.length > 0 || urls.hls.length > 0) {
      const playerHtml = buildPlayerHtml(withQualityFallbacks, urls.hls, poster)
      return new NextResponse(playerHtml, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "private, no-store",
          "X-Frame-Options": "SAMEORIGIN",
        },
      })
    }

    // Step 5: Fallback - serve embed HTML from our origin
    return new NextResponse(embedHtml, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-store",
        "X-Frame-Options": "SAMEORIGIN",
      },
    })
  } catch (err) {
    console.error("[hqporner/player]", err)
    return new NextResponse("Failed to load video", { status: 502 })
  }
}

function buildPlayerHtml(
  mp4Urls: string[],
  hlsUrls: string[],
  poster = ""
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="referrer" content="no-referrer">
<meta name="viewport" content="width=device-width,initial-scale=1">
${hlsUrls.length > 0 ? '<script src="https://cdn.jsdelivr.net/npm/hls.js@latest/dist/hls.min.js"><\/script>' : ""}
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;background:#000;overflow:hidden}
  video{width:100%;height:100%;display:block;object-fit:contain}
  #err{display:none;position:absolute;inset:0;align-items:center;justify-content:center;
       flex-direction:column;gap:12px;color:#fff;font-family:sans-serif;font-size:14px;text-align:center}
  #err.show{display:flex}
</style>
</head>
<body>
<video controls autoplay playsinline referrerpolicy="no-referrer" id="v"${poster ? ` poster="${poster}"` : ""}>
  ${mp4Urls.map((u) => `<source src="${u}" type="video/mp4">`).join("\n  ")}
</video>
<div id="err">
  <span>Stream unavailable or expired.</span>
  <span style="opacity:.6;font-size:12px">Signed CDN URLs expire — reload the watch page.</span>
</div>
<script>
  var v = document.getElementById('v');
  ${
    hlsUrls.length > 0
      ? `if (typeof Hls !== 'undefined' && Hls.isSupported() && ${mp4Urls.length === 0 ? "true" : "v.error"}) {
    var hls = new Hls();
    hls.loadSource('${hlsUrls[0]}');
    hls.attachMedia(v);
    hls.on(Hls.Events.MANIFEST_PARSED, function() { v.play(); });
  }`
      : ""
  }
  v.addEventListener('error', function(){
    this.style.display='none';
    document.getElementById('err').classList.add('show');
  }, true);
<\/script>
</body>
</html>`
}
