```markdown
# Eporner API v2

**Public RESTful API for webmasters** to search and embed free HD porn videos from Eporner.com (one of the largest adult video platforms with millions of videos in up to 4K).

- **Fully public** — No API key or registration required
- **HTTP GET** only
- **Response formats**: JSON (default), XML
- **TXT** supported only for the `removed` endpoint
- **Base URL**: `https://www.eporner.com/api/v2/video/`

**GitHub Mirror**: [eporner/API](https://github.com/eporner/API) (contains PHP examples)

---

## Available Endpoints

### 1. Search Videos

**Endpoint**: `GET /video/search/`

Search for videos with pagination and multiple filters.

#### Parameters

| Parameter   | Type    | Default  | Description                                                                                         |
| ----------- | ------- | -------- | --------------------------------------------------------------------------------------------------- |
| `query`     | string  | `all`    | Search term (e.g. `teen`, `anal milf`). Use `all` for all videos.                                   |
| `per_page`  | integer | `30`     | Results per page (`1` – `1000`)                                                                     |
| `page`      | integer | `1`      | Page number                                                                                         |
| `order`     | string  | `latest` | `latest`, `newest`, `longest`, `shortest`, `top-rated`, `most-popular`, `top-weekly`, `top-monthly` |
| `thumbsize` | string  | `medium` | `small`, `medium`, `big`                                                                            |
| `gay`       | integer | `0`      | `0` = exclude, `1` = include, `2` = only gay                                                        |
| `lq`        | integer | `1`      | `0` = exclude low quality, `1` = include, `2` = only low quality                                    |
| `format`    | string  | `json`   | `json` or `xml`                                                                                     |

#### Example
```

https://www.eporner.com/api/v2/video/search/?query=teen&per_page=50&page=1&order=top-weekly&thumbsize=big&format=json

```

#### Response
- Pagination info: `total_count`, `total_pages`, `count`, `page`, `per_page`, `time_ms`
- `videos`: Array of video objects (see **Video Object** below)

---

### 2. Get Video by ID
**Endpoint**: `GET /video/id/`

Retrieve full details for a single video. Also used to check if a video still exists.

#### Parameters

| Parameter   | Type     | Default   | Description |
|-------------|----------|-----------|-------------|
| `id`        | string   | (required) | 11-character case-sensitive video ID |
| `thumbsize` | string   | `medium`  | `small`, `medium`, `big` |
| `format`    | string   | `json`    | `json` or `xml` |

#### Example
```

https://www.eporner.com/api/v2/video/id/?id=IsabYDAiqXa&thumbsize=medium&format=json

```

#### Response
Single video object (see **Video Object** below).
Returns empty array `[]` if the video has been removed.

---

### 3. Removed Videos
**Endpoint**: `GET /video/removed/`

Returns a complete list of all video IDs that have been removed from Eporner.

#### Parameters

| Parameter | Type   | Default | Description |
|-----------|--------|---------|-------------|
| `format`  | string | `json`  | `json`, `xml`, or `txt` (recommended for smaller size) |

#### Example
```

https://www.eporner.com/api/v2/video/removed/?format=txt

````

**Note**: The response can be several megabytes. Use `txt` format for efficiency.

---

## Video Object Fields

Every video in search or ID responses contains:

| Field            | Type     | Description |
|------------------|----------|-------------|
| `id`             | string   | 11-character unique video ID |
| `title`          | string   | Video title |
| `keywords`       | string   | Comma-separated tags |
| `views`          | integer  | Number of views |
| `rate`           | string   | Rating (e.g. `"4.13"`, 0.00–5.00) |
| `url`            | string   | Full page URL on Eporner |
| `added`          | string   | Date added (`YYYY-MM-DD hh:mm:ss`) |
| `length_sec`     | integer  | Duration in seconds |
| `length_min`     | string   | Duration in `mm:ss` or `hh:mm:ss` |
| `embed`          | string   | Embed URL for iframe player |
| `default_thumb`  | object   | Default thumbnail info |
| `thumbs`         | array    | Array of up to 15 thumbnail objects |

### Thumbnail Object
```json
{
  "size": "big",
  "width": 640,
  "height": 360,
  "src": "https://..."
}
````

---

## Additional Resources

- **Feeds**: https://www.eporner.com/api/v2/feeds/ — CSV and RSS feeds
- **PHP Examples**: https://www.eporner.com/api/v2/php-examples/
- **GitHub Examples**: https://github.com/eporner/API/tree/master/examples (PHP scripts for search and ID)

**Official Documentation**: [https://www.eporner.com/api/v2/](https://www.eporner.com/api/v2/)
