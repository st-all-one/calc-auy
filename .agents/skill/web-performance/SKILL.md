---
name: web-performance
description: >
  Modern web performance: Core Web Vitals (LCP, INP, CLS), critical rendering
  path, loading strategies, caching/delivery, rendering/animation, measurement,
  performance APIs, anti-patterns. Load when optimizing loading, rendering,
  interactivity, or monitoring.
category: web
version: "2.0.0"
tags: [performance, core-web-vitals, crp, caching, lazy-loading, rail, profiling]
license: MIT
---

# Modern Web Performance

## Use When
- Optimizing load, render, or interactivity
- Improving Core Web Vitals (LCP, INP, CLS)
- Choosing loading/caching strategies
- Setting performance budgets and monitoring
- Profiling with DevTools

## Core Rules
- Measure first: field (RUM) over lab; Lighthouse/CrUX for context.
- Targets: LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 (75th percentile, mobile).
- Critical Path: minimize render-blocking CSS/JS; inline critical CSS; defer the rest.
- Images: correct size/format (AVIF/WebP), `width`/`height` (CLS), `loading="lazy"` below fold, `fetchpriority="high"` for LCP.
- JS: ship less; code-split; defer/async; avoid long tasks (>50ms) that hurt INP.
- Fonts: `font-display: swap`, preload critical fonts, subset.
- Caching: immutable hashed assets, `stale-while-revalidate`, CDN; Brotli > gzip.
- Animate only `transform`/`opacity`; avoid layout thrash and forced reflow.
- Use `content-visibility`, `contain`, `will-change` sparingly.
- Respect `prefers-reduced-motion` and network conditions.
- Avoid: render-blocking third parties, huge hero images, layout-shifting ads, main-thread hydration bloat.

## Core Patterns
```html
<link rel="preconnect" href="https://cdn.example" crossorigin>
<link rel="preload" as="image" href="/hero.avif" fetchpriority="high">
<link rel="stylesheet" href="/critical.css">
<script src="/app.js" type="module" defer></script>
<img src="/hero.avif" width="1200" height="630" alt="" fetchpriority="high" decoding="async">
<img src="/thumb.avif" width="400" height="300" alt="" loading="lazy" decoding="async">
```

```js
// RUM: Core Web Vitals
new PerformanceObserver((list) => {
  for (const e of list.getEntries()) console.log("LCP", e.startTime);
}).observe({ type: "largest-contentful-paint", buffered: true });

new PerformanceObserver((list) => {
  for (const e of list.getEntries()) if (!e.hadRecentInput) console.log("CLS", e.value);
}).observe({ type: "layout-shift", buffered: true });
```
```http
Cache-Control: public, max-age=31536000, immutable   # hashed assets
```

## File Map
| File | Content |
|---|---|
| `00-index.md` | Index and map |
| `01-core-concepts.md` | RAIL, metrics, mindset |
| `02-how-browsers-work.md` | Navigation, DNS/TCP/TLS/HTTP pipeline |
| `03-critical-rendering-path.md` | DOM → CSSOM → render → layout → paint |
| `04-loading-strategies.md` | preload/preconnect, lazy, Speculation Rules, fetchpriority |
| `05-rendering-and-animation.md` | 60fps, compositor props, CSS vs JS |
| `06-core-web-vitals.md` | LCP/INP/CLS thresholds and fixes |
| `07-measurement-and-monitoring.md` | PerformanceObserver, RUM, budgets |
| `08-modern-patterns.md` | Consolidated checklist |
| `09-anti-patterns.md` | What to avoid |
| `10-startup-performance.md` | Workers, code splitting, async |
| `11-network-deep-dive.md` | TCP, latency, throttling, preload scanner |
| `12-glossary.md` | Terms |
| `13-performance-apis.md` | bfcache, Font Loading, Beacon, IdleCallback |
| `14-adaptive-content.md` | Responsive images, Client Hints |
| `15-delivery-and-caching.md` | Brotli, Cache-Control, SW, CDN |
| `16-profiling-and-tooling.md` | DevTools, flame graphs |
| `EXAMPLE.md` | Reference implementation |

## Read Order
`00`→`01`→`06`; CRP `03`; loading `04`; measurement `07`; delivery `15`.

## Prereqs
HTML/CSS/JS and browser DevTools.
