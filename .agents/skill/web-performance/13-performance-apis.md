# Performance APIs — High Precision Timing, Bfcache, Performance Data, Font Loading, Beacon, Navigation Preload, Background Tasks

## Why

Beyond the standard Navigation/Resource Timing APIs covered in `07-measurement-and-monitoring.md`, the browser provides specialized APIs for specific measurement and optimization needs. These cover high-precision timing, bfcache debugging, font loading control, reliable analytics delivery, service worker integration, and idle-time scheduling.

## What

### 1. High Precision Timing

The Performance API uses **`DOMHighResTimeStamp`** — a monotonic, sub-millisecond resolution clock. Unlike `Date.now()`:

- Not subject to system clock skew or adjustments
- Monotonic (always increases, never goes backward)
- Sub-millisecond precision (floating-point milliseconds)

```js
// High resolution timestamp
const t0 = performance.now();
doWork();
const t1 = performance.now();
console.log(`doWork took ${t1 - t0} ms`);
```

**Use**: Accurate benchmarking and profiling. Always use `performance.now()` instead of `Date.now()` for performance measurements.

### 2. Performance Data Flow

The Performance API collects data through **`PerformanceEntry`** objects. The flow:

1. Browser records events (navigation milestones, resource loads, marks, measures)
2. Entries are stored in the **performance timeline buffer**
3. Retrieved via `performance.getEntries()`, `performance.getEntriesByType()`, or observed in real-time via `PerformanceObserver`

```js
// Retrieve all paint entries
const paints = performance.getEntriesByType('paint');
// [{name: "first-paint", startTime: 100.5},
//  {name: "first-contentful-paint", startTime: 200.3}]

// Modern pattern: PerformanceObserver for real-time observation
const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    console.log(`${entry.name}: ${entry.startTime}ms`);
  });
});
observer.observe({ type: 'paint', buffered: true });
```

The data is not analyzed or visualized by the API itself — it must be sent to analytics endpoints or processed by developer tools.

### 3. Bfcache Monitoring (`notRestoredReasons`)

The **Back-Forward Cache (bfcache)** caches a page's entire state (including JavaScript heap) when the user navigates away, enabling instant back/forward navigation.

The `PerformanceNavigationTiming.notRestoredReasons` property reports why a page was **blocked** from bfcache:

```js
performance.getEntriesByType('navigation').forEach((entry) => {
  if (entry.notRestoredReasons) {
    console.log('Reasons:', entry.notRestoredReasons.reasons);
    // e.g., [{reason: "unload-listener"}, {reason: "cache-control"}]
  }
});
```

**Common blocking reasons**: `unload` event listeners, `Cache-Control: no-store`, `beforeunload` listeners, `window.opener` references.

**Fix**: Remove `unload` listeners (they degrade bfcache), ensure `Cache-Control` allows caching, avoid `no-store` on navigational pages.

### 4. Font Loading API

Control web fonts programmatically — load, check status, and react to loading events:

```js
// Check if a font is loaded
const fontFace = new FontFace('MyFont', 'url(myfont.woff2)');
document.fonts.add(fontFace);

// Load and await
await fontFace.load();

// Check all fonts status
document.fonts.ready.then(() => {
  console.log('All fonts loaded');
});

// Check specific font
const loaded = document.fonts.check('12px MyFont');
```

Combine with `font-display: swap` to ensure text remains visible during font load:

```css
@font-face {
  font-family: 'MyFont';
  src: url('myfont.woff2') format('woff2');
  font-display: swap;
}
```

### 5. Beacon API

Reliably send data to a server without blocking page unload. Unlike `XMLHttpRequest` or `fetch` in `beforeunload`/`unload` handlers:

- Request is **guaranteed to be sent** even if the page is being closed
- Does **not block** the navigation or tab close
- Asynchronous and non-blocking

```js
// Send analytics on page unload
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    navigator.sendBeacon('/analytics', JSON.stringify({
      sessionId: 'abc123',
      timeOnPage: performance.now()
    }));
  }
});
```

**Use over `fetch()` in unload handlers**: `sendBeacon()` is designed specifically for this use case and will not be cancelled by the browser.

### 6. Navigation Preload

Service Workers can activate **navigation preload** — when a navigation request goes to the Service Worker, the browser simultaneously starts fetching the resource from the network:

```js
self.addEventListener('activate', (event) => {
  event.waitUntil(async () => {
    // Enable navigation preload
    await self.registration.navigationPreload.enable();
  }());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(async () => {
    // Try cache first, fall back to preloaded response
    const cached = await caches.match(event.request);
    if (cached) return cached;

    // If preload already started, use it instead of starting a new fetch
    const response = await event.preloadResponse || fetch(event.request);
    return response;
  }());
});
```

**Benefit**: Reduces the latency cost of routing requests through the Service Worker. The network request starts immediately instead of waiting for the SW to boot.

### 7. Background Tasks API (`requestIdleCallback`)

Schedule non-urgent work during idle periods, avoiding impact on critical tasks:

```js
// Schedule analytics processing when the browser is idle
requestIdleCallback((deadline) => {
  while (deadline.timeRemaining() > 0 && analyticsQueue.length > 0) {
    processAnalyticsEvent(analyticsQueue.shift());
  }

  // If there's still work, schedule another idle callback
  if (analyticsQueue.length > 0) {
    requestIdleCallback(processAnalytics);
  }
}, { timeout: 2000 }); // Must run within 2s, even if not idle
```

| Property | Description |
|----------|-------------|
| `deadline.timeRemaining()` | Time remaining in current idle period (ms) |
| `deadline.didTimeout` | Whether the callback was forced due to timeout |
| `options.timeout` | Max delay before forced execution |

**Use for**: Lazy analytics processing, deferred logging, prefetch preparation, non-critical state reconciliation.

## What to Avoid

- **Using `Date.now()` for performance measurement** — use `performance.now()`
- **Forgetting `buffered: true`** in `PerformanceObserver` — misses entries recorded before the observer was attached
- **Using `unload` event for analytics** — use `visibilitychange` + `sendBeacon()`; `unload` is unreliable on mobile
- **Blocking navigation** with sync XHR in `beforeunload` — use Beacon API
- **Checking font load status** via polling or timers — use Font Loading API events
- **Adding `unload` event listeners** — they block bfcache and hurt back/forward performance
- **Running heavy work during critical path** — use `requestIdleCallback` to defer non-urgent tasks
