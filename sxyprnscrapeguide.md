# SxyPrn Scraping Guide - URL Patterns

**Base URL**: `https://sxyprn.com`

**Note**: SxyPrn has **no public JSON API**. All data must be scraped from HTML pages.  
Video pages often contain direct streaming links to external hosts (vidara.so, lulustream, etc.).

---

## Main Page Types

### 1. Homepage

- `https://sxyprn.com/`

### 2. Search

- `https://sxyprn.com/searches/0.html`

### 3. Popular / Top Lists

- Top Popular: `https://sxyprn.com/popular/top-pop.html`
- Top Viewed: `https://sxyprn.com/popular/top-viewed.html`

### 4. Star / Pornstar Pages

- Format: `https://sxyprn.com/[STAR-NAME].html`
- Example: `https://sxyprn.com/Mia-Khalif.html`
- Example: `https://sxyprn.com/Eve-Sweet.html`

### 5. Individual Video / Post Pages

- Format: `https://sxyprn.com/blog/[VIDEO-ID]/0.html`
- Example: `https://sxyprn.com/blog/69496b9089c83/0.html`
- Example: `https://sxyprn.com/blog/69c0872905c11/0.html` (older style: `/post/...`)

**Star-filtered Video Page** (useful for context):

- `https://sxyprn.com/post/[ID].html?sk=[STAR-NAME]&so=0&ss=latest`
- Parameters:
  - `sk=` → Star keyword (e.g. `Mia-Khalif`)
  - `so=` → Sort order (usually `0`)
  - `ss=` → Sort style (`latest`, `views`, etc.)

### 6. Category / Tag Pages

- Example: `https://sxyprn.com/blog/Only-Fans/0.html`
- With params: `https://sxyprn.com/Onlyfans.html?sm=trending`

---

## Common Query Parameters

- `?sk=` → Filter by star/performer
- `?sm=trending` → Sorting / mode (trending, etc.)
- `?sc` → Category filter (seen on some blog pages)
- Pagination often uses `/0.html`, `/1.html`, etc. or query params (inspect links on the page).

---

## What to Extract While Scraping

**On List Pages (Star, Popular, Search):**

- Video title
- Video link (`/blog/[ID]/0.html`)
- Thumbnail image
- Duration
- Views / upload time
- Tags / categories

**On Single Video Page:**

- Full title
- Duration, quality, bitrate, file size
- Direct video source URLs (often hosted on vidara.so, lulustream, etc.)
- Tags and hashtags
- Star names

**Selectors Tip**:  
Use browser DevTools to inspect current classes/IDs (they can change). Common patterns include classes like `.title`, `.duration`, `.video-item`, `a[href*="/blog/"]`.

---

## Scraping Best Practices

- Always send a realistic `User-Agent`.
- Add a small delay (500–1500ms) between requests.
- Handle relative URLs by prefixing with `https://sxyprn.com`.
- On video pages, look for `<a>` or `<video>` tags pointing to external hosts.
- Store extracted data in a database (video ID as unique key).

**Warning**:  
Scraping may violate the site's Terms of Service. Use responsibly, for personal/educational purposes only, and respect rate limits.

**Official Site**: https://sxyprn.com/

Last updated: March 2026
