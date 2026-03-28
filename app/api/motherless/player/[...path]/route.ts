import { NextRequest, NextResponse } from "next/server"

const ML_BASE = "https://motherless.com"
const PROXY_URL = "https://api.codetabs.com/v1/proxy/?quest="

async function fetchML(path: string): Promise<string> {
  const target = `${ML_BASE}${path}`
  const res = await fetch(`${PROXY_URL}${encodeURIComponent(target)}`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" },
  })
  if (!res.ok) throw new Error(`Proxy error: ${res.status}`)
  return res.text()
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  // path is just [id], e.g. ["87D587B"]
  const id = path[0]

  if (!id || !/^[A-Z0-9]+$/i.test(id)) {
    return new NextResponse("Invalid video ID", { status: 400 })
  }

  try {
    const html = await fetchML(`/${id}`)

    // Extract highest quality MP4 — __fileurl is the best quality URL
    const fileUrlMatch = html.match(/__fileurl\s*=\s*'([^']+)'/)
    const fileUrl = fileUrlMatch?.[1] ?? ""

    // Fallback: collect <source src="..." res="..."> tags and pick highest res
    const sourceMatches = [
      ...html.matchAll(/<source\s+src="([^"]+)"[^>]*res="([^"]+)"/g),
    ]
    const sources = sourceMatches.map((m) => ({ url: m[1], res: m[2] }))
    // Sort by resolution descending (720p > 480p > 360p etc.)
    sources.sort((a, b) => {
      const aNum = parseInt(a.res) || 0
      const bNum = parseInt(b.res) || 0
      return bNum - aNum
    })

    const primaryUrl = fileUrl || sources[0]?.url || ""
    const fallbackUrl = sources.find((s) => s.url !== primaryUrl)?.url ?? ""

    if (!primaryUrl) {
      return new NextResponse("Video URLs not found", { status: 502 })
    }

    // data-poster for the thumbnail within the player
    const posterMatch = html.match(/data-poster="([^"]+)"/)
    const poster = posterMatch?.[1] ?? ""

    const playerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="referrer" content="no-referrer">
<meta name="viewport" content="width=device-width,initial-scale=1">
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
  <source src="${primaryUrl}" type="video/mp4">
  ${fallbackUrl ? `<source src="${fallbackUrl}" type="video/mp4">` : ""}
</video>
<div id="err">
  <span>Stream unavailable or expired.</span>
  <span style="opacity:.6;font-size:12px">Signed CDN URLs expire — reload the watch page.</span>
</div>
<script>
  document.getElementById('v').addEventListener('error', function(){
    this.style.display='none';
    document.getElementById('err').classList.add('show');
  }, true);
</script>
</body>
</html>`

    return new NextResponse(playerHtml, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-store",
      },
    })
  } catch (err) {
    console.error("[motherless/player]", err)
    return new NextResponse("Failed to load video", { status: 502 })
  }
}
