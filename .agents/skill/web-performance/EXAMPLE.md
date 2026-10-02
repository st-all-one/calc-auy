# Web Performance — Complete Modern Implementation

> Production-grade reference implementation synthesizing all patterns from this guide.
> Every line is deliberate — no fluff, no outdated techniques.

---

## 1. Project Structure

```
project/
├── src/
│   ├── index.html
│   ├── css/
│   │   ├── critical.css        # Inlined in <head> (< 14KB)
│   │   └── full.css            # Loaded after paint
│   ├── js/
│   │   ├── app.js              # Main application (deferred)
│   │   ├── analytics.js        # Async, non-blocking
│   │   └── heavy-worker.js     # Web Worker for offloaded work
│   ├── img/
│   │   ├── hero.avif           # LCP image (modern format)
│   │   ├── hero@2x.avif
│   │   ├── hero.webp           # Fallback
│   │   └── hero.jpg            # Last resort fallback
│   └── fonts/
│       └── Inter.woff2
├── sw.js                       # Service Worker
├── speculation.json             # Speculation Rules (external ref)
├── favicon.ico
└── build.config.js
```

---

## 2. Complete HTML (`src/index.html`)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta http-equiv="Accept-CH" content="DPR,Width,Viewport-Width,Downlink,ECT,Device-Memory" />
  <title>Modern Web App</title>
  <meta name="description" content="A performance-optimized web application" />

  <!-- === Resource Hints (Critical Origins) === -->
  <link rel="preconnect" href="https://fonts.googleapis.com/" crossorigin />
  <link rel="preconnect" href="https://api.example.com" crossorigin />
  <link rel="dns-prefetch" href="https://analytics.example.com" />
  <link rel="dns-prefetch" href="https://images.example.com" />

  <!-- === Preload LCP Resource === -->
  <link
    rel="preload"
    href="/img/hero.avif"
    as="image"
    fetchpriority="high"
    media="(min-width: 600px)"
    type="image/avif"
  />

  <!-- === Preload Critical Font === -->
  <link
    rel="preload"
    href="/fonts/Inter.woff2"
    as="font"
    type="font/woff2"
    crossorigin
  />

  <!-- === Critical CSS (inlined, < 14KB) === -->
  <style>
    /* All above-the-fold styles — extracted via Critters or Penthouse at build time */
    :root {
      --font-body: 'Inter', system-ui, -apple-system, sans-serif;
      --color-primary: #0055ff;
      --color-bg: #ffffff;
    }
    html { font-family: var(--font-body); color: #111; background: var(--color-bg); }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    img, video { max-width: 100%; display: block; }
    .hero { display: flex; flex-direction: column; align-items: center; padding: 2rem; }
    .hero__title { font-size: clamp(1.5rem, 4vw, 3rem); font-weight: 700; }
    .hero__image { aspect-ratio: 16 / 9; width: 100%; max-width: 1200px; height: auto; }
  </style>

  <!-- === Deferred Non-Critical CSS === -->
  <link
    rel="preload"
    href="/css/full.css"
    as="style"
    onload="this.onload=null;this.rel='stylesheet'"
    fetchpriority="low"
  />
  <noscript><link rel="stylesheet" href="/css/full.css" /></noscript>

  <!-- === Scripts (all deferred or async — never blocking) === -->
  <script defer src="/js/app.js"></script>
  <script async src="/js/analytics.js"></script>
</head>

<body>
  <!-- === LCP Element (hero section) === -->
  <section class="hero" style="content-visibility: auto">
    <h1 class="hero__title">Modern Web Performance</h1>
    <picture>
      <source type="image/avif" srcset="/img/hero.avif, /img/hero@2x.avif 2x" />
      <source type="image/webp" srcset="/img/hero.webp, /img/hero@2x.webp 2x" />
      <img
        class="hero__image"
        src="/img/hero.jpg"
        srcset="/img/hero.jpg, /img/hero@2x.jpg 2x"
        width="1200"
        height="675"
        alt="Hero banner showcasing performance metrics"
        fetchpriority="high"
        decoding="async"
      />
    </picture>
  </section>

  <!-- === Content (below the fold) === -->
  <main>
    <section style="content-visibility: auto; contain-intrinsic-size: 400px">
      <h2>Features</h2>
      <div class="card-grid">
        <article class="card">
          <img
            src="/img/feature1.webp"
            loading="lazy"
            decoding="async"
            width="400"
            height="300"
            alt="Feature 1"
          />
          <h3>Fast Loading</h3>
          <p>Optimized critical path delivers content in under 1.5s.</p>
        </article>
        <article class="card">
          <img
            src="/img/feature2.webp"
            loading="lazy"
            decoding="async"
            width="400"
            height="300"
            alt="Feature 2"
          />
          <h3>Smooth Interactions</h3>
          <p>INP below 100ms with off-main-thread processing.</p>
        </article>
      </div>
    </section>
  </main>

  <!-- === Speculation Rules (next-page prefetch) === -->
  <script type="speculationrules">
  {
    "prefetch": [{
      "source": "document",
      "where": { "href_matches": "/articles/*" },
      "eagerness": "moderate"
    }],
    "prerender": [{
      "source": "list",
      "urls": ["/most-likely-next"]
    }]
  }
  </script>

  <!-- === Service Worker Registration === -->
  <script>
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js');
    });
  }
  </script>
</body>
</html>
```

---

## 3. Critical CSS (`src/css/critical.css`)

```css
/* This file is inlined in <head> — keep under 14KB (compressed) */
/* Only includes styles needed for above-the-fold content */
/* Extracted automatically by Critters or Penthouse at build time */

:root {
  --font-body: 'Inter', system-ui, -apple-system, sans-serif;
  --color-primary: #0055ff;
  --color-bg: #ffffff;
  --color-text: #111111;
  --space-unit: 0.5rem;
}

html {
  font-family: var(--font-body);
  color: var(--color-text);
  background: var(--color-bg);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}

@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter.woff2') format('woff2');
  font-display: swap;
  font-weight: 400 700;
}

body {
  min-height: 100dvh;
  overflow-x: hidden;
}

img {
  max-width: 100%;
  display: block;
}

.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: calc(var(--space-unit) * 4);
}

.hero__title {
  font-size: clamp(1.5rem, 4vw, 3rem);
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: calc(var(--space-unit) * 2);
}

.hero__image {
  aspect-ratio: 16 / 9;
  width: 100%;
  max-width: 1200px;
  height: auto;
  border-radius: 0.5rem;
  background: #f0f0f0;
}
```

---

## 4. Full CSS (`src/css/full.css`)

```css
/* Non-critical styles — loaded after paint via preload + onload swap */

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  padding: 2rem;
}

.card {
  border: 1px solid #e0e0e0;
  border-radius: 0.75rem;
  overflow: hidden;
  transition: transform 200ms ease, box-shadow 200ms ease;
  contain: layout style paint;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.card img {
  width: 100%;
  height: auto;
}

/* Animations — only transform/opacity */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

.hero {
  animation: fadeIn 400ms ease-out;
}
```

---

## 5. JavaScript: Main Application (`src/js/app.js`)

```js
// Deferred — runs after HTML parsing, before DOMContentLoaded

// 5a. PerformanceObserver — monitor Core Web Vitals in production
class WebVitalsReporter {
  #observer;
  #clsValue = 0;
  #inpEntries = [];

  constructor(endpoint = '/analytics') {
    this.#endpoint = endpoint;
    this.#observer = new PerformanceObserver(this.#handleEntry.bind(this));
    this.#observeAll();
  }

  #observeAll() {
    this.#observer.observe({ type: 'largest-contentful-paint', buffered: true });
    this.#observer.observe({ type: 'layout-shift', buffered: true });
    this.#observer.observe({ type: 'event', buffered: true, durationThreshold: 0 });
    this.#observer.observe({ type: 'long-animation-frame', buffered: true });
  }

  #handleEntry(list) {
    for (const entry of list.getEntries()) {
      switch (entry.entryType) {
        case 'largest-contentful-paint':
          this.#send({ lcp: entry.startTime });
          break;
        case 'layout-shift':
          if (!entry.hadRecentInput) this.#clsValue += entry.value;
          break;
        case 'event':
          if (entry.interactionId > 0) {
            this.#inpEntries.push(entry.processingStart - entry.startTime);
          }
          break;
        case 'long-animation-frame':
          for (const script of entry.scripts) {
            if (script.duration > 50) {
              this.#send({ longFrame: { url: script.sourceURL, duration: script.duration } });
            }
          }
          break;
      }
    }
  }

  #send(data) {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(this.#endpoint, JSON.stringify(data));
    }
  }

  getCLS() { return this.#clsValue; }
  getINP() { return this.#inpEntries.length ? Math.max(...this.#inpEntries) : 0; }
}

// 5b. Adaptive content loading based on device capabilities
function initAdaptiveLoading() {
  const connection = navigator.connection || {};
  const deviceMemory = navigator.deviceMemory || 8;
  const isConstrained = connection.effectiveType === 'slow-2g'
    || connection.effectiveType === '2g'
    || deviceMemory <= 2;

  if (isConstrained) {
    document.documentElement.classList.add('low-performance');
    // Defer heavy features
    import('./lightweight-app.js');
  } else {
    import('./full-app.js');
  }
}

// 5c. Deferred non-critical work via requestIdleCallback
function scheduleBackgroundWork() {
  requestIdleCallback(() => {
    // Prefetch next likely page
    if ('speculationrules' in document) return;
    const links = document.querySelectorAll('a[data-prefetch]');
    for (const link of links) {
      const prefetchLink = document.createElement('link');
      prefetchLink.rel = 'prefetch';
      prefetchLink.href = link.href;
      document.head.appendChild(prefetchLink);
    }
  }, { timeout: 3000 });
}

// 5d. Yield to main thread to avoid long tasks
async function processInChunks(items, processFn, chunkSize = 5) {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    for (const item of chunk) processFn(item);
    if (i + chunkSize < items.length) {
      await new Promise(r => setTimeout(r, 0));
    }
  }
}

// 5e. Event handling with passive listeners
document.addEventListener('touchstart', () => {}, { passive: true });
document.addEventListener('scroll', () => {}, { passive: true });

// 5f. Visibility change — pause heavy work when hidden
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    // Flush analytics via sendBeacon
    navigator.sendBeacon('/session-end', JSON.stringify({
      duration: performance.now(),
      cls: new WebVitalsReporter().getCLS()
    }));
  }
});

// 5g. Class to batch DOM reads before writes (avoid layout thrashing)
class DOMBatch {
  #reads = [];
  #writes = [];

  read(fn) { this.#reads.push(fn); return this; }
  write(fn) { this.#writes.push(fn); return this; }

  flush() {
    const readResults = this.#reads.map(fn => fn());
    this.#writes.forEach((fn, i) => fn(readResults[i]));
    this.#reads = [];
    this.#writes = [];
  }
}

// Initialize
const vitals = new WebVitalsReporter();
initAdaptiveLoading();
scheduleBackgroundWork();
```

---

## 6. JavaScript: Web Worker (`src/js/heavy-worker.js`)

```js
// Runs off the main thread — for data processing, fetch, caching
self.onmessage = async (e) => {
  const { type, payload } = e.data;

  switch (type) {
    case 'FETCH_AND_PROCESS': {
      try {
        const resp = await fetch(payload.url);
        const data = await resp.json();
        const result = expensiveTransform(data);
        self.postMessage({ type: 'RESULT', payload: result });
      } catch (err) {
        self.postMessage({ type: 'ERROR', payload: err.message });
      }
      break;
    }

    case 'PROCESS_BATCH': {
      const result = payload.items.map(expensiveTransform);
      self.postMessage({ type: 'RESULT', payload: result });
      break;
    }

    case 'PRECACHE_URLS': {
      const cache = await caches.open('v1');
      await cache.addAll(payload.urls);
      self.postMessage({ type: 'PRECACHE_DONE' });
      break;
    }
  }
};

function expensiveTransform(item) {
  // Simulate CPU-intensive work
  let result = 0;
  for (let i = 0; i < 1000; i++) {
    result += Math.sqrt(item * i);
  }
  return result;
}
```

---

## 7. Service Worker (`sw.js`)

```js
const CACHE_NAME = 'v2';
const PRECACHE_URLS = [
  '/',
  '/css/full.css',
  '/js/app.js',
  '/img/hero.avif',
  '/fonts/Inter.woff2'
];

// Install: precache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate: enable navigation preload + clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.registration?.navigationPreload?.enable(),
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
    ])
  );
  self.clients.claim();
});

// Fetch: stale-while-revalidate with navigation preload fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const preloadResponse = await event.preloadResponse;
          if (preloadResponse) return preloadResponse;

          const networkResponse = await fetch(request);
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone());
          return networkResponse;
        } catch {
          const cached = await caches.match(request);
          return cached || new Response('Offline', { status: 503 });
        }
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      const fetchPromise = fetch(request).then((response) => {
        if (response.ok) {
          const cache = caches.open(CACHE_NAME);
          cache.then((c) => c.put(request, response.clone()));
        }
        return response;
      }).catch(() => cached);
      return cached || fetchPromise;
    })()
  );
});

// Handle speculation rules API messages
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
```

---

## 8. Server Configuration (Nginx)

```nginx
# /etc/nginx/sites-available/app

server {
    listen 443 ssl http2;
    server_name example.com;

    # Brotli compression (preferred)
    brotli on;
    brotli_types text/html text/css application/javascript application/json image/svg+xml font/woff2;
    brotli_comp_level 6;

    # Gzip fallback
    gzip on;
    gzip_types text/html text/css application/javascript application/json image/svg+xml font/woff2;
    gzip_comp_level 5;
    gzip_vary on;

    # Security & Performance Headers
    add_header Cache-Control "public, max-age=0, must-revalidate" always;
    add_header Accept-CH "DPR, Width, Viewport-Width, Downlink, ECT, Device-Memory" always;
    add_header Server-Timing "cache;desc=CDN" always;
    add_header NEL '{"report_to":"default","max_age":2592000}' always;

    # 103 Early Hints (preconnect + preload before full response)
    location / {
        add_header Link "</css/critical.css>; rel=preload; as=style";
        add_header Link "</img/hero.avif>; rel=preload; as=image; fetchpriority=high";
        add_header Link "<https://fonts.googleapis.com/>; rel=preconnect; crossorigin";
        try_files $uri $uri/ /index.html;
    }

    # Versioned assets — immutable, 1 year cache
    location ~* \.(?:js|css)\.([a-f0-9]+)\.(?:js|css)$ {
        expires 365d;
        add_header Cache-Control "public, immutable, max-age=31536000";
        access_log off;
    }

    # Images — long cache, brotli static
    location ~* \.(?:jpg|jpeg|gif|png|ico|cur|gz|svg|svgz|mp4|ogg|ogv|webp|avif)$ {
        expires 365d;
        add_header Cache-Control "public, immutable, max-age=31536000";
        access_log off;
    }

    # Fonts
    location ~* \.(?:woff|woff2)$ {
        expires 365d;
        add_header Cache-Control "public, immutable, max-age=31536000";
        access_log off;
    }

    # Speculation Rules
    location = /speculation.json {
        add_header Content-Type application/json;
        add_header Access-Control-Allow-Origin *;
    }
}
```

---

## 9. Build Configuration (`build.config.js`)

```js
// Conceptual bundler configuration (Vite/Rollup/Webpack equivalent)
export default {
  // Code splitting by route
  entry: {
    main: './src/js/app.js',
    admin: './src/js/admin.js',
  },

  // Output with content hashes for long-term caching
  output: {
    filename: '[name].[contenthash:8].js',
    chunkFilename: '[name].[contenthash:8].chunk.js',
  },

  // CSS extraction + critical CSS inlining
  css: {
    extract: true,
    criticalCSS: {
      enabled: true,
      inline: true,
      minify: true,
    },
  },

  // Image optimization
  images: {
    formats: ['avif', 'webp', 'jpg'],
    sizes: [400, 800, 1200],
    quality: {
      avif: 65,
      webp: 75,
      jpg: 80,
    },
  },

  // Bundle budgets
  budgets: {
    initial: { maxSize: '150KB' },
    total: { maxSize: '500KB' },
    font: { maxSize: '50KB' },
  },

  // Automatic preload hints generation
  preload: {
    rel: 'preload',
    as: {
      fonts: 'font',
      images: 'image',
    },
    crossorigin: true,
  },

  // Tree shaking
  treeshake: true,

  // Minification
  minify: {
    html: true,
    css: true,
    js: { ecma: 2022, module: true },
  },
};
```

---

## 10. HTML Response Headers (Full Set)

```http
HTTP/2 200
Content-Type: text/html; charset=utf-8
Content-Encoding: br
Cache-Control: public, max-age=0, must-revalidate
Accept-CH: DPR, Width, Viewport-Width, Downlink, ECT, Device-Memory
Server-Timing: auth;dur=35, db;dur=120, cache;desc="hit"
Critical-CH: DPR, ECT
NEL: {"report_to":"default","max_age":2592000}
Report-To: {"group":"default","max_age":2592000,"endpoints":[{"url":"https://nel.example.com/report"}]}
Link: </css/critical.css>; rel=preload; as=style
Link: </img/hero.avif>; rel=preload; as=image; fetchpriority=high
Link: <https://fonts.googleapis.com/>; rel=preconnect; crossorigin
```

---

## 11. Performance Budget (`lighthouserc.json`)

```json
{
  "ci": {
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "first-contentful-paint": ["error", { "maxNumericValue": 1800 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-blocking-time": ["error", { "maxNumericValue": 200 }],
        "speed-index": ["error", { "maxNumericValue": 3000 }],
        "max-server-latency": ["error", { "maxNumericValue": 800 }],
        "unminified-javascript": "error",
        "unminified-css": "error",
        "unused-javascript": "warn",
        "offscreen-images": "warn",
        "uses-responsive-images": "error",
        "uses-http2": "error",
        "uses-long-cache-ttl": "error"
      }
    },
    "collect": {
      "settings": {
        "preset": "desktop",
        "throttlingMethod": "simulate",
        "throttling": {
          "rttMs": 150,
          "throughputKbps": 1638.4,
          "cpuSlowdownMultiplier": 4
        }
      }
    },
    "upload": {
      "target": "filesystem",
      "outputDir": "./lhci-reports"
    }
  }
}
```

---

## 12. RUM Collection Script (Injected via `<script defer>`)

```js
// web-vitals.js — lightweight RUM collection
// Uses PerformanceObserver with buffered:true for complete capture

(function() {
  'use strict';

  const endpoint = '/rum';
  const events = [];

  function send(data) {
    events.push(data);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, JSON.stringify(events));
    } else {
      fetch(endpoint, { method: 'POST', body: JSON.stringify(data), keepalive: true });
    }
  }

  // LCP
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    if (entries.length > 0) {
      send({ metric: 'LCP', value: entries[entries.length - 1].startTime });
    }
  }).observe({ type: 'largest-contentful-paint', buffered: true });

  // CLS
  let cls = 0;
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!entry.hadRecentInput) cls += entry.value;
    }
    send({ metric: 'CLS', value: cls });
  }).observe({ type: 'layout-shift', buffered: true });

  // INP
  let inp = 0;
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.interactionId > 0) {
        const latency = entry.processingStart - entry.startTime;
        inp = Math.max(inp, latency);
      }
    }
    send({ metric: 'INP', value: inp });
  }).observe({ type: 'event', buffered: true, durationThreshold: 0 });

  // TTFB
  const nav = performance.getEntriesByType('navigation')[0];
  if (nav) {
    send({ metric: 'TTFB', value: nav.responseStart - nav.requestStart });
  }

  // Server Timing
  if (nav?.serverTiming?.length) {
    for (const entry of nav.serverTiming) {
      send({ metric: `server-${entry.name}`, value: entry.duration });
    }
  }

  // Navigation type (bfcache restore?)
  if (nav?.type === 'back_forward' && nav?.activationStart > 0) {
    send({ metric: 'bfcache-restore', value: nav.activationStart });
  }

  // Connection info
  if (navigator.connection) {
    send({
      metric: 'connection',
      value: {
        type: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt,
        deviceMemory: navigator.deviceMemory
      }
    });
  }
})();
```

---

## 13. CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/performance.yml
name: Performance Checks
on: [pull_request]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run build
      - name: Lighthouse CI
        run: npx lhci autorun
        env:
          LHCI_GITHUB_TOKEN: ${{ secrets.LHCI_GITHUB_TOKEN }}

  bundlesize:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - name: Check Bundle Size
        run: |
          MAX_SIZE=300000  # 300KB
          for f in dist/assets/*.js; do
            size=$(stat -c%s "$f")
            if [ $size -gt $MAX_SIZE ]; then
              echo "FAIL: $(basename $f) is $(($size / 1000))KB (max: $(($MAX_SIZE / 1000))KB)"
              exit 1
            fi
          done
```

---

## 14. Key Patterns Reference (Quick-Check)

| Concern | Pattern | File Reference |
|---------|---------|----------------|
| Loading | `preconnect`, `dns-prefetch`, `preload`, `fetchpriority` | **HTML** |
| LCP | `<link rel="preload">` hero image + explicit `width`/`height` | **HTML** |
| CLS | `aspect-ratio`, `width`+`height` on all media | **CSS** |
| INP | `scheduler.yield()`, chunked processing, Web Workers | **JS** |
| Fonts | `font-display: swap`, `font-size-adjust: from-font` | **CSS** |
| Off-screen | `content-visibility: auto`, `loading="lazy"` | **HTML/CSS** |
| Animation | `transform`/`opacity` only, `will-change` sparingly | **CSS** |
| Caching | Versioned hashes, `immutable` + 1 year, SW stale-while-revalidate | **Server/SW** |
| Compression | Brotli level 6 with gzip fallback | **Server** |
| Measurement | PerformanceObserver with `buffered: true` | **JS** |
| Adaptive | `srcset`/`sizes`, Client Hints, Network Information API | **HTML/JS** |
| Future nav | Speculation Rules API (`prefetch`/`prerender`) | **HTML** |
| Background | `requestIdleCallback`, Web Workers, SW navigation preload | **JS/SW** |
| Analytics | `sendBeacon` on `visibilitychange` (not `unload`) | **JS** |

---

> **This example implements every modern pattern from this guide.**
> Use sections independently or compose the full stack for a production-grade app.
