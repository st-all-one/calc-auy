# 08 — Modern Patterns (Consolidated)

## Loading

| Pattern | Implementation | Priority |
|---------|---------------|----------|
| **Preconnect critical origins** | `<link rel="preconnect" href="https://..." crossorigin>` | High |
| **Preload LCP image** | `<link rel="preload" href="/hero.webp" as="image" fetchpriority="high">` | High |
| **dns-prefetch for remaining origins** | `<link rel="dns-prefetch" href="https://...">` | High |
| **Native lazy loading** | `<img loading="lazy" src="...">` | High |
| **content-visibility: auto** | `section { content-visibility: auto }` | Medium |
| **Preconnect + dns-prefetch pairing** | Preconnect for 2-3 critical origins, dns-prefetch for the rest | High |
| **Speculation Rules API** | `<script type="speculationrules"> { "prefetch": [...], "prerender": [...] } </script>` | Medium (Chrome-only) |
| **HTTP Early Hints (103)** | Server sends `103 Early Hints` with `Link` headers before full response | High (server support) |
| **fetchpriority attribute** | `<img fetchpriority="high/low">` | High |
| **Module/nomodule pattern** | `<script type="module" src="modern.js"></script><script nomodule src="legacy.js"></script>` | Medium |

## Rendering

| Pattern | Implementation | Priority |
|---------|---------------|----------|
| **Animate only transform/opacity** | `transition: transform 200ms, opacity 200ms` | High |
| **CSS animations over JS** | Use `@keyframes` for simple animations | High |
| **requestAnimationFrame for JS** | `requestAnimationFrame(animate)` not `setInterval` | High |
| **Critical CSS inlining** | `<style>/* above-fold styles */</style>` in `<head>` | High |
| **Deferred non-critical CSS** | Media queries, preload + onload swap | High |
| **Batch DOM reads before writes** | Avoid layout thrashing | High |
| **will-change sparingly** | Only on elements you will animate; remove after animation | Medium |
| **content-visibility: auto** | Skip rendering for off-screen sections | Medium |
| **`contain` property** | `contain: layout style paint` or `contain: strict` for isolated components | Medium |

## Core Web Vitals

| Pattern | Implementation | Priority |
|---------|---------------|----------|
| **Width + height on images** | `<img width="800" height="600" ...>` | High |
| **font-display: swap** | `@font-face { font-display: swap; }` | High |
| **Reserve space for ads/embeds** | `min-height` container for dynamic content | High |
| **Preload hero image** | `<link rel="preload">` | High |
| **SSR for critical content** | Server-generated HTML for initial view | High |
| **Debounce expensive handlers** | `setTimeout` + `clearTimeout` for input events | High |
| **scheduler.yield()** | Break up long tasks (Chrome 115+) | Medium |
| **Web Workers for computation** | Offload heavy processing off main thread | Medium |
| **`<link rel="preload">` for fonts** | Preload critical fonts early | Medium |
| **`font-size-adjust: from-font`** | Reduce CLS from font swap | Medium |

## Measurement

| Pattern | Implementation | Priority |
|---------|---------------|----------|
| **PerformanceObserver for CWV** | `observer.observe({ type: 'largest-contentful-paint' })` | High |
| **Navigation Timing API** | `performance.getEntriesByType('navigation')` | High |
| **Server Timing** | `Server-Timing` HTTP header | Medium |
| **Resource Timing API** | `performance.getEntriesByType('resource')` | Medium |
| **Long Animation Frames API** | `observer.observe({ type: 'long-animation-frame' })` | Medium |
| **Performance budgets in CI** | Lighthouse CI, webpack-bundle-analyzer | High |
| **RUM + Synthetic** | Both, strategically | High |
| **User Timing API** | `performance.mark()` / `performance.measure()` for custom metrics | Medium |

## Delivery

| Pattern | Implementation | Priority |
|---------|---------------|----------|
| **HTTP/2 or HTTP/3** | Ensure server supports h2/h3 | High |
| **Brotli compression** | `Accept-Encoding: br` (smaller than gzip by ~20%) | High |
| **CDN** | Global edge network for static assets | High |
| **Service Worker caching** | Cache-first strategy for static assets; stale-while-revalidate for dynamic | Medium |
| **Code splitting** | Dynamic `import()` for route-based chunks | High |
| **Tree shaking** | Remove unused exports via bundler | High |
| **Subresource Integrity (SRI)** | `integrity="sha256-..."` on scripts — security without performance cost | Medium |
| **Report-To / NEL** | `NEL` HTTP header for network error logging | Low |

## Progressive Enhancement

| Pattern | Implementation | Priority |
|---------|---------------|----------|
| **SSR with hydration** | Server HTML first, then JS hydrates | High |
| **Streaming SSR** | Stream HTML progressively (React 18+, Node.js) | High |
| **Islands architecture** | Interactive "islands" in static HTML (Astro, Qwik) | Medium |
| **Partial hydration** | Only hydrate visible/interactive components | Medium |
| **Resource Hints as HTTP headers** | `Link: <...>; rel=preload` via `103 Early Hints` or response headers | High |

## Key Principle

> **The browser is your ally, not your enemy.**
> Prefer native HTML/CSS solutions (lazy loading, content-visibility, CSS animations, behavior directives) over JavaScript equivalents. The browser is optimized to handle them efficiently, often off the main thread.
