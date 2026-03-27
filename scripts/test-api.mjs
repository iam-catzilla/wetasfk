/**
 * Test script: verifies the Eporner API proxy works through the Next.js API route.
 *
 * Usage:
 *   1. Start the dev server: pnpm dev
 *   2. In another terminal: node scripts/test-api.mjs
 *   3. Optionally pass a custom base URL: node scripts/test-api.mjs http://localhost:3001
 */

const BASE = process.argv[2] || "http://localhost:3000"

// Quick direct-to-Eporner test to see if the API is reachable at network level
async function testDirectAccess() {
  console.log("=== DIAGNOSTIC: Direct Eporner API access ===")
  const url =
    "https://www.eporner.com/api/v2/video/search/?query=all&per_page=1&format=json"
  console.log("GET", url, "\n")
  try {
    const res = await fetch(url)
    const ct = res.headers.get("content-type") || ""
    console.log("Status:", res.status)
    console.log("Content-Type:", ct)
    if (ct.includes("json")) {
      console.log("✅ Direct access works — API is reachable\n")
      return true
    } else {
      const text = await res.text()
      console.log("⚠ Got HTML instead of JSON (likely ISP/firewall block)")
      console.log("Body preview:", text.slice(0, 200), "\n")
      return false
    }
  } catch (err) {
    console.log("❌ Direct fetch failed:", err.cause?.code || err.message, "\n")
    return false
  }
}

async function testSearch() {
  const url = `${BASE}/api/eporner/video/search/?query=all&per_page=3&page=1&order=top-weekly&thumbsize=big&gay=0&lq=0&format=json`
  console.log("=== TEST: Search endpoint ===")
  console.log("GET", url, "\n")

  const res = await fetch(url)
  console.log("Status:", res.status)
  console.log("Content-Type:", res.headers.get("content-type"))

  if (!res.ok) {
    console.error("FAILED — non-OK status")
    const text = await res.text()
    console.error("Body (first 500 chars):", text.slice(0, 500))
    return false
  }

  const json = await res.json()
  console.log("total_count:", json.total_count)
  console.log("total_pages:", json.total_pages)
  console.log("videos returned:", json.videos?.length)

  if (json.videos?.length > 0) {
    const v = json.videos[0]
    console.log("\nFirst video:")
    console.log("  id:", v.id)
    console.log("  title:", v.title)
    console.log("  views:", v.views)
    console.log("  rating:", v.rate)
    console.log("  duration:", v.length_min)
    console.log("  embed:", v.embed)
    console.log("  thumb:", v.default_thumb?.src)
  }

  console.log("\n✅ Search test PASSED\n")
  return true
}

async function testVideoById(id) {
  const url = `${BASE}/api/eporner/video/id/?id=${id}&thumbsize=big&format=json`
  console.log("=== TEST: Video by ID ===")
  console.log("GET", url, "\n")

  const res = await fetch(url)
  console.log("Status:", res.status)
  console.log("Content-Type:", res.headers.get("content-type"))

  if (!res.ok) {
    console.error("FAILED — non-OK status")
    const text = await res.text()
    console.error("Body (first 500 chars):", text.slice(0, 500))
    return false
  }

  const json = await res.json()
  console.log("Video title:", json.title)
  console.log("Video views:", json.views)
  console.log("Video embed:", json.embed)

  console.log("\n✅ Video-by-ID test PASSED\n")
  return true
}

async function main() {
  console.log(`Testing API proxy at ${BASE}\n`)

  const directOk = await testDirectAccess()
  if (!directOk) {
    console.log("⚠ Direct API access is blocked on this network.")
    console.log(
      "  The Next.js proxy will also fail unless you route through a VPN"
    )
    console.log("  or set EPORNER_API_BASE env var to a working proxy URL.\n")
    console.log("  Continuing to test the proxy route anyway...\n")
  }

  const searchOk = await testSearch()
  if (!searchOk) {
    console.error("❌ Search test failed, aborting.")
    process.exit(1)
  }

  // Use the first video ID from search results to test getVideoById
  const searchRes = await fetch(
    `${BASE}/api/eporner/video/search/?query=all&per_page=1&page=1&order=top-weekly&thumbsize=big&format=json`
  )
  const searchJson = await searchRes.json()
  const firstId = searchJson.videos?.[0]?.id

  if (firstId) {
    const idOk = await testVideoById(firstId)
    if (!idOk) {
      console.error("❌ Video-by-ID test failed.")
      process.exit(1)
    }
  } else {
    console.warn("⚠ No video ID available, skipping getVideoById test")
  }

  console.log("🎉 All tests passed!")
}

main().catch((err) => {
  console.error("❌ Test crashed:", err)
  process.exit(1)
})
