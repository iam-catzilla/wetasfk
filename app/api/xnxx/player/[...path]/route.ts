import { NextRequest, NextResponse } from "next/server"

const XNXX_BASE = "https://www.xnxx.com"
const PROXY_URL = "https://api.codetabs.com/v1/proxy/?quest="

async function fetchXnxxPage(path: string): Promise<string> {
  const target = `${XNXX_BASE}${path}`
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

  // path is tilde-encoded: ["video-hbwy3c6~slug_here"]
  // convert back to slash path: "/video-hbwy3c6/slug_here"
  const videoPath = "/" + path.join("/").replace(/~/g, "/")

  try {
    const html = await fetchXnxxPage(videoPath)

    // Extract MP4 URLs from html5player calls
    const highMatch = html.match(/html5player\.setVideoUrlHigh\('([^']+)'\)/)
    const lowMatch = html.match(/html5player\.setVideoUrlLow\('([^']+)'\)/)
    const highUrl = highMatch?.[1] ?? ""
    const lowUrl = lowMatch?.[1] ?? ""

    if (!highUrl && !lowUrl) {
      return new NextResponse("Video URLs not found", { status: 502 })
    }

    // Build a minimal self-hosted player page — served from our own origin,
    // so no X-Frame-Options issue. referrerpolicy=no-referrer avoids CDN hotlink checks.
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
<video controls autoplay playsinline referrerpolicy="no-referrer" id="v">
  ${highUrl ? `<source src="${highUrl}" type="video/mp4">` : ""}
  ${lowUrl && lowUrl !== highUrl ? `<source src="${lowUrl}" type="video/mp4">` : ""}
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
        // Allow being embedded in our iframe (no X-Frame-Options restriction)
        "X-Frame-Options": "SAMEORIGIN",
      },
    })
  } catch (err) {
    console.error("[xnxx/player]", err)
    return new NextResponse("Failed to load video", { status: 502 })
  }
}
