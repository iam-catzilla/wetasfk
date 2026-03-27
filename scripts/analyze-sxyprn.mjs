const PROXY = "https://api.codetabs.com/v1/proxy/?quest="

async function analyzeHomepage() {
  console.log("=== Fetching SxyPrn homepage ===\n")
  const res = await fetch(PROXY + encodeURIComponent("https://sxyprn.com/"))
  const html = await res.text()
  console.log("HTML length:", html.length)

  // Find video item patterns
  const blogLinks = html.match(/\/blog\/[a-f0-9]+\/\d+\.html/g) || []
  console.log("Blog links found:", blogLinks.length)
  console.log("First 5:", blogLinks.slice(0, 5))

  // Find the structure around the first blog link
  const idx = html.indexOf("/blog/")
  if (idx > 0) {
    console.log(
      "\n--- Context around first /blog/ link (500 chars before, 300 after): ---"
    )
    console.log(html.slice(Math.max(0, idx - 500), idx + 300))
    console.log("--- end context ---\n")
  }

  // Look for video container classes
  const classes = html.match(/class="[^"]*"/g) || []
  const videoClasses = classes.filter((c) =>
    /video|item|post|thumb|entry|block|card/i.test(c)
  )
  console.log("Video-related classes:", [...new Set(videoClasses)].slice(0, 15))

  // Find duration patterns
  const durations = html.match(/\d{1,2}:\d{2}(?::\d{2})?/g) || []
  console.log("\nDuration patterns found:", durations.length)
  console.log("First 5:", durations.slice(0, 5))

  // Find thumbnail/image URLs
  const images =
    html.match(/https?:\/\/[^\s"'<>]+\.(jpg|jpeg|png|webp)[^\s"'<>]*/gi) || []
  const cdnImages = images.filter((i) => /cdn|thumb|img/i.test(i))
  console.log("\nCDN/thumb images:", cdnImages.length)
  console.log("Sample:", cdnImages.slice(0, 3))
}

async function analyzeVideoPage() {
  console.log("\n=== Fetching a SxyPrn video page ===\n")
  // First get a video ID from homepage
  const homeRes = await fetch(PROXY + encodeURIComponent("https://sxyprn.com/"))
  const homeHtml = await homeRes.text()
  const match = homeHtml.match(/\/blog\/([a-f0-9]+)\/\d+\.html/)
  if (!match) {
    console.log("No blog links found on homepage")
    return
  }

  const videoUrl = `https://sxyprn.com/blog/${match[1]}/0.html`
  console.log("Fetching:", videoUrl)

  const res = await fetch(PROXY + encodeURIComponent(videoUrl))
  const html = await res.text()
  console.log("HTML length:", html.length)

  // Find video source URLs
  const videoSources =
    html.match(
      /https?:\/\/[^\s"'<>]*(?:\.mp4|\.m3u8|vidara|lulustream|stream)[^\s"'<>]*/gi
    ) || []
  console.log("Video source URLs:", videoSources.length)
  console.log("Sources:", videoSources.slice(0, 5))

  // Find embed or iframe
  const iframes = html.match(/<iframe[^>]*src="[^"]*"[^>]*>/gi) || []
  console.log("\nIframes:", iframes.length)
  iframes.slice(0, 3).forEach((f) => console.log(" ", f))

  // Find title
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i)
  console.log("\nTitle:", titleMatch?.[1])

  // Find relevant section around video player
  const playerIdx = html.search(/video|player|embed|stream/i)
  if (playerIdx > 0) {
    const ctxStart = Math.max(0, playerIdx - 200)
    console.log("\n--- Player area context: ---")
    console.log(html.slice(ctxStart, ctxStart + 600))
    console.log("--- end ---")
  }

  // Look for data attributes with video info
  const dataAttrs = html.match(/data-[a-z-]+="[^"]*"/gi) || []
  const videoData = dataAttrs.filter((d) =>
    /vnfo|video|src|url|stream|quality/i.test(d)
  )
  console.log("\nVideo-related data attrs:", videoData.slice(0, 10))
}

async function analyzeSearchPage() {
  console.log("\n=== Fetching SxyPrn search ===\n")
  const url = "https://sxyprn.com/blog/all/0.html?sm=trending"
  console.log("Fetching:", url)
  const res = await fetch(PROXY + encodeURIComponent(url))
  const html = await res.text()
  console.log("HTML length:", html.length)

  const blogLinks = html.match(/\/blog\/[a-f0-9]+\/\d+\.html/g) || []
  console.log("Blog links found:", blogLinks.length)
}

async function main() {
  await analyzeHomepage()
  await analyzeVideoPage()
  await analyzeSearchPage()
}

main().catch((e) => console.error("Error:", e))
