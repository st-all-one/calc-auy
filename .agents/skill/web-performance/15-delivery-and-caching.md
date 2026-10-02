# Delivery and Caching — Compression, HTTP Caching, Service Workers, CDN

## Why

How content is delivered to the browser is as important as how it is built. Compression reduces transfer size by 70-85%, proper caching eliminates redundant network requests, CDNs bring content closer to users, and Service Workers enable offline-capable, instant-loading experiences.

## What

### 1. Compression — Brotli vs Gzip

| Algorithm | Compression Ratio | Speed | Browser Support |
|-----------|------------------|-------|----------------|
| **Brotli** (`br`) | Better (10-20% smaller than gzip) | Slower compress, fast decompress | ~97% (all modern) |
| **Gzip** (`gzip`, `deflate`) | Good | Fast compress, fast decompress | 100% |

```nginx
# Nginx configuration: prefer Brotli, fallback to gzip
brotli on;
brotli_types text/html text/css application/javascript image/svg+xml;
brotli_comp_level 6;

gzip on;
gzip_types text/html text/css application/javascript image/svg+xml;
gzip_comp_level 5;
```

```apache
# Apache configuration
AddOutputFilterByType BROTLI_COMPRESS text/html text/css application/javascript
AddOutputFilterByType DEFLATE text/html text/css application/javascript
```

**Compression savings calculation**:

```js
const timing = performance.getEntriesByType('navigation')[0];
const savings = 1 - timing.transferSize / timing.decodedBodySize;
console.log(`Compression saved ${(savings * 100).toFixed(1)}%`);
```

### 2. HTTP Caching

Control how long resources are cached with `Cache-Control` headers:

```http
# Immutable content (versioned filenames: app.a1b2c3.js)
Cache-Control: public, max-age=31536000, immutable

# HTML pages (short-lived or revalidated)
Cache-Control: no-cache
# or
Cache-Control: public, max-age=0, must-revalidate

# API responses
Cache-Control: private, max-age=60

# Never cache (auth pages, sensitive data)
Cache-Control: no-store
```

| Directive | Effect |
|-----------|--------|
| `max-age=N` | Cache for N seconds |
| `no-cache` | Must revalidate with server before using cached copy |
| `no-store` | Do not cache at all |
| `public` | Can be cached by any cache (CDN, proxy, browser) |
| `private` | Cache only in browser (not CDN/proxies) |
| `immutable` | Never revalidate during `max-age` (versioned assets) |
| `must-revalidate` | Must obey server revalidation |

**ETag validation**:

```http
# First request: server computes hash
ETag: "abc123"

# Second request: browser sends If-None-Match
If-None-Match: "abc123"

# Response: 304 Not Modified (zero bytes transferred)
```

**Cache strategy by resource type**:

| Resource Type | Cache Policy | Example |
|--------------|-------------|---------|
| Versioned JS/CSS | `max-age=31536000, immutable` | `app.abc123.js` |
| Images (versioned) | `max-age=31536000, immutable` | `photo.avif` |
| HTML pages | `no-cache` or `max-age=0, must-revalidate` | `/index.html` |
| API data | `private, max-age=60` | `/api/data` |
| User content | `private, no-cache` | `/api/profile` |
| Fonts | `public, max-age=31536000` | `font.woff2` |

### 3. Service Workers for Performance

Service Workers act as a client-side proxy. Key performance use cases:

**Precaching (install-time)**:

```js
const CACHE = 'v1';
const PRECACHE_URLS = ['/', '/styles.css', '/app.js', '/hero.webp'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});
```

**Stale-while-revalidate (runtime caching)**:

```js
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.open(CACHE).then((cache) => {
      return cache.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request).then((response) => {
          cache.put(event.request, response.clone());
          return response;
        });
        // Return cached immediately, update in background
        return cached || fetchPromise;
      });
    })
  );
});
```

**Network-first with timeout**:

```js
self.addEventListener('fetch', (event) => {
  event.respondWith(
    Promise.race([
      fetch(event.request),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
    ]).catch(() => caches.match(event.request))
  );
});
```

**Navigation preload** (see `13-performance-apis.md` for details):

```js
self.addEventListener('activate', (event) => {
  event.waitUntil(self.registration?.navigationPreload?.enable());
});
```

### 4. CDN (Content Delivery Network)

CDNs cache static assets at edge locations near users, reducing:

- **Latency** (shorter physical distance)
- **TTFB** (cached responses from edge)
- **Origin load** (fewer requests hit the server)

**CDN best practices**:

- Cache static assets at the edge with long `max-age`
- Use CDN for: images, fonts, CSS, JS, video
- Enable CDN compression (Brotli at edge)
- Use CDN for API responses when acceptable (short TTL or cache tags)
- Combine CDN with Service Worker for offline fallback

**Cache invalidation strategies**:
- **Versioned filenames** (hash-based): `app.a1b2c3.js` — never invalidate, just deploy new hash
- **CDN purge**: manual or automated purge when content changes
- **Surrogate keys/cache tags**: purge by tag (e.g., `blog-post-123`)
- **Short TTL + revalidation**: `max-age=60, must-revalidate` for quickly-changing content

## How

### Combined Delivery Pipeline

```
User → DNS (CDN) → CDN Edge (Brotli, Cache HIT?) → Origin Server
                                  ↓
                           Cache HIT → return cached
                           Cache MISS → fetch origin, cache, return
```

### Configuration Summary

| Layer | Action | Effect |
|-------|--------|--------|
| Build | Minify, hash filenames | Smaller payloads, long cache |
| Server | Brotli compression | 70-85% size reduction |
| Server | `Cache-Control` headers | Correct caching per resource |
| Server | ETag support | Efficient revalidation |
| CDN | Edge caching | Low-latency delivery |
| SW | Precache + stale-while-revalidate | Instant repeat visits, offline |
| HTTP/2 or HTTP/3 | Multiplexing | No connection limits |

## What to Avoid

- **No compression** — always enable at least gzip, prefer Brotli
- **Short `max-age` on versioned assets** — they never change; use `immutable` + 1 year
- **Long `max-age` on HTML** — HTML should use `no-cache` or short TTL
- **No ETag support** — ETags prevent unnecessary re-downloads
- **Forgetting CDN compression** — ensure Brotli is enabled at the edge
- **Service Worker without navigation preload** — adds an extra network hop
- **Over-caching API responses** — use `private` and short TTL for user-specific data
- **Not purging CDN cache on deploy** — users may see stale content
- **Cookie-based CDN cache keys** — reduces cache hit rate; use URL-based keys
