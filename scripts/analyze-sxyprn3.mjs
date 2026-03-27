const PROXY = "https://api.codetabs.com/v1/proxy/?quest="

async function main() {
  // Fetch a video page
  const url = "https://sxyprn.com/post/69c5765876e92.html"
  console.log("Fetching:", url)
  const html = await (await fetch(PROXY + encodeURIComponent(url))).text()

  // Find data-vnfo
  const vnfoMatch =
    html.match(/data-vnfo\s*=\s*'([^']+)'/)?.[1] ||
    html.match(/data-vnfo\s*=\s*"([^"]+)"/)?.[1]
  if (vnfoMatch) {
    console.log("=== data-vnfo ===")
    console.log(vnfoMatch.slice(0, 500))
    try {
      const parsed = JSON.parse(vnfoMatch.replace(/&quot;/g, '"'))
      console.log(
        "\nParsed vnfo:",
        JSON.stringify(parsed, null, 2).slice(0, 1000)
      )
    } catch (e) {
      console.log("Not JSON, raw value:", vnfoMatch)
    }
  }

  // Find vid_container area
  const vidIdx = html.indexOf("vid_container")
  if (vidIdx > -1) {
    console.log("\n=== vid_container section ===")
    console.log(html.slice(vidIdx, vidIdx + 2000))
  }

  // Find video iframe/embed
  const iframes = html.match(/<iframe[^>]+>/gi) || []
  console.log("\n=== Iframes ===")
  iframes.forEach((f) => console.log(f))

  // Find external video links (luluvdo, vidara etc)
  const extLinks =
    html.match(
      /https?:\/\/(?:luluvdo|vidara|lulustream|streamwish)[^\s"'<>]+/gi
    ) || []
  console.log("\n=== External video links ===")
  console.log(extLinks.slice(0, 10))

  // Get the post entry structure for list pages
  console.log("\n\n=== Analyzing list entry structure ===")
  const homeHtml = await (
    await fetch(PROXY + encodeURIComponent("https://sxyprn.com/"))
  ).text()

  // Find one complete post_el_small entry
  const startIdx = homeHtml.indexOf("class='post_el_small'")
  if (startIdx > -1) {
    // Find the next post_el_small after this one
    const nextIdx = homeHtml.indexOf("class='post_el_small'", startIdx + 10)
    const entry = homeHtml.slice(
      startIdx,
      nextIdx > -1 ? nextIdx : startIdx + 3000
    )
    console.log("\n=== Complete first entry ===")
    console.log(entry)
  }

  // Find duration pattern location
  const durIdx = homeHtml.indexOf("duration_small")
  if (durIdx > -1) {
    console.log("\n=== Duration area ===")
    console.log(homeHtml.slice(durIdx - 100, durIdx + 200))
  }

  // Trending/popular page check
  console.log("\n\n=== Testing trending page ===")
  const trendHtml = await (
    await fetch(
      PROXY + encodeURIComponent("https://sxyprn.com/popular/top-viewed.html")
    )
  ).text()
  console.log("Length:", trendHtml.length)
  const trendPosts = trendHtml.match(/class='post_el_small'/g) || []
  console.log("Post entries:", trendPosts.length)
  const trendLinks = trendHtml.match(/\/post\/[a-f0-9]+\.html/g) || []
  console.log("Post links:", trendLinks.length)
}

main().catch((e) => console.error(e))
