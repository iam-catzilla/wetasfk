const PROXY = "https://api.codetabs.com/v1/proxy/?quest="

async function analyzeHomepageDeep() {
  console.log("=== Deep homepage analysis ===\n")
  const html = await (
    await fetch(PROXY + encodeURIComponent("https://sxyprn.com/"))
  ).text()

  // Find the main content area - look for post/entry containers
  // Look for divs with post-related content
  const postPattern = /class=['"]([^'"]*post[^'"]*)['"]/gi
  const postClasses = []
  let m
  while ((m = postPattern.exec(html)) !== null) postClasses.push(m[1])
  console.log("Post classes found:", [...new Set(postClasses)])

  // Find all anchor-like patterns that lead to actual video pages (not blog pagination)
  const postLinks = html.match(/\/post\/[a-f0-9]+\.html/g) || []
  console.log("\n/post/ links:", postLinks.length, postLinks.slice(0, 5))

  // Find data-vnfo which is how sxyprn stores video info
  const vnfoMatch = html.match(/data-vnfo\s*=\s*['"][^'"]+['"]/g) || []
  console.log("\ndata-vnfo attrs:", vnfoMatch.length)
  if (vnfoMatch.length > 0) console.log("Sample:", vnfoMatch[0].slice(0, 200))

  // Find img src patterns for thumbnails
  const lazyImgs = html.match(/data-src\s*=\s*['"]([^'"]+)['"]/g) || []
  console.log("\ndata-src (lazy load):", lazyImgs.length)
  console.log("Sample:", lazyImgs.slice(0, 3))

  // Find the chunk around first post
  const postIdx =
    html.indexOf("post_el_small") ||
    html.indexOf("post_el") ||
    html.indexOf("data-vnfo")
  if (postIdx > 0) {
    console.log("\n--- Post element context: ---")
    console.log(html.slice(postIdx, postIdx + 1500))
    console.log("--- end ---")
  }

  // Extract a bigger section to understand video entry structure
  const entryStart =
    html.indexOf("entry_date") ||
    html.indexOf("duration") ||
    html.indexOf("views")
  if (entryStart > 0) {
    console.log("\n--- Entry context: ---")
    console.log(html.slice(Math.max(0, entryStart - 300), entryStart + 500))
    console.log("--- end ---")
  }

  // Search for common sxyprn element patterns
  const allClasses = html.match(/class=['"]([^'"]+)['"]/gi) || []
  const uniqueClasses = [
    ...new Set(
      allClasses.map((c) => c.replace(/class=['"]/i, "").replace(/['"]$/, ""))
    ),
  ]
  console.log("\n=== All unique classes ===")
  console.log(uniqueClasses.filter((c) => c.length < 40).join("\n"))
}

async function findVideoPage() {
  console.log("\n\n=== Finding actual video page ===\n")
  const html = await (
    await fetch(PROXY + encodeURIComponent("https://sxyprn.com/"))
  ).text()

  // Look for post links (actual video individual pages)
  const postLinks = html.match(/\/post\/[a-f0-9]+\.html/g) || []
  if (postLinks.length > 0) {
    const videoUrl = `https://sxyprn.com${postLinks[0]}`
    console.log("Fetching video page:", videoUrl)
    const videoHtml = await (
      await fetch(PROXY + encodeURIComponent(videoUrl))
    ).text()
    console.log("Length:", videoHtml.length)

    const title = videoHtml.match(/<title>([^<]+)<\/title>/i)?.[1]
    console.log("Title:", title)

    // video sources
    const sources =
      videoHtml.match(/https?:\/\/[^\s"'<>]*(?:\.mp4|\.m3u8)[^\s"'<>]*/gi) || []
    console.log("Direct video sources:", sources.slice(0, 3))

    // vnfo data
    const vnfo = videoHtml.match(/data-vnfo\s*=\s*['"]([^'"]+)['"]/)?.[1]
    console.log("vnfo:", vnfo?.slice(0, 300))

    // Look for video container
    const playerSection =
      videoHtml.indexOf("video_player") ||
      videoHtml.indexOf("player") ||
      videoHtml.indexOf("vid_")
    if (playerSection > 0) {
      console.log("\n--- Player section: ---")
      console.log(videoHtml.slice(playerSection, playerSection + 1000))
      console.log("--- end ---")
    }

    return
  }

  // If no /post/ links, look at what actual video links look like
  console.log("No /post/ links. Looking for alternatives...")

  // Extract all href patterns
  const hrefs = html.match(/href=['"]([^'"]+)['"]/g) || []
  const videoHrefs = hrefs.filter(
    (h) => !h.includes(".css") && !h.includes(".js") && !h.includes("adtng")
  )
  console.log("Sample hrefs:", videoHrefs.slice(0, 20))
}

async function main() {
  await analyzeHomepageDeep()
  await findVideoPage()
}

main().catch((e) => console.error("Error:", e))
