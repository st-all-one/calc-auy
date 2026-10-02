# 09 — Anti-Patterns (What to Avoid)

## Loading

| ❌ Anti-Pattern | Why It's Harmful | Modern Replacement |
|----------------|-----------------|-------------------|
| **`<link rel="prerender">`** | Deprecated, non-standard, replaced by Speculation Rules API | Speculation Rules API (`prerender`) |
| **Domain sharding** | Anti-pattern since HTTP/2 (multiple connections waste resources) | Single connection with HTTP/2 multiplexing |
| **CSS `@import`** | Serializes CSS loading; blocks parallel downloads | `<link rel="stylesheet">` |
| **`<script>` without `defer`/`async` in `<head>`** | Blocks HTML parsing and rendering | `<script defer src="...">` |
| **`loading="lazy"` on LCP image** | Defers loading of the most important visual element | `fetchpriority="high"` + no lazy |
| **`loading="lazy"` on above-fold images** | Delays perceived load | Remove `loading` for above-fold |
| **Relying on `<link rel="prefetch">` cross-site** | Cache partitioning prevents cross-site prefetch | Speculation Rules API |
| **Preconnecting to 10+ origins** | Wastes sockets and memory; each preconnect is real | Preconnect 2-3 critical; dns-prefetch rest |
| **`dns-prefetch` for own domain** | Already resolved; pointless use of hint | Only use for cross-origin |
| **Using JS lazy-loading libraries when native `loading="lazy"` works** | JS costs bundle size + main thread execution | Native `loading="lazy"` (97% support) |
| **Missing `crossorigin` on preconnect for fonts** | Fonts load in anonymous mode; without it, only DNS is resolved | `<link rel="preconnect" crossorigin>` |
| **Server Push** | Chrome removed support; wastes bandwidth | `103 Early Hints` or `<link rel="preload">` |

## Rendering

| ❌ Anti-Pattern | Why It's Harmful | Modern Replacement |
|----------------|-----------------|-------------------|
| **Animating `top`/`left`** | Forces layout recalculation per frame | `transform: translate()` |
| **Animating `width`/`height`** | Forces layout + repaint per frame | `transform: scale()` |
| **Using `setTimeout`/`setInterval` for animations** | No frame synchronization; runs when not visible | `requestAnimationFrame()` |
| **`translateZ(0)` on every element ("GPU boost hack")** | Creates unnecessary layers, wastes GPU memory | Let browser decide; use `will-change` only where needed |
| **`will-change` on everything** | Over-promotion of layers; memory pressure | `will-change: transform` only on elements about to animate |
| **JS animation libraries for simple transitions** | CSS can do it cheaper (no JS parsing, main thread) | CSS transitions/keyframes |
| **Forced synchronous layouts (layout thrashing)** | Interleaved read/write access causes multiple reflows | Batch reads, then batch writes |
| **Inline styles in JS for every style change** | Harder for browser to optimize; more style recalc | CSS classes + `classList.toggle()` |
| **`display: none` to hide off-screen content** | DOM still exists; doesn't save layout/paint work | `content-visibility: auto` |
| **Heavy `box-shadow`/`filter` on animated elements** | Expensive repaint cost per frame | Simplify visual effects; use `::before`/`::after` |

## Core Web Vitals

| ❌ Anti-Pattern | Why It's Harmful | Modern Replacement |
|----------------|-----------------|-------------------|
| **Images without `width`+`height`** | #1 cause of CLS — browser reserves 0x0, then shifts | Always set dimensions |
| **`font-display: block` (or default)** | FOIT — invisible text for up to 3s | `font-display: swap` or `optional` |
| **Not reserving space for ads** | Ads inject after load, shifting everything | `min-height` container |
| **CSR without SSR for initial content** | Terrible LCP — user sees blank white screen | SSR, streaming SSR, or static generation |
| **Server-side rendering everything (no hydration strategy)** | Slow TTI — sends all JS, must hydrate everything | Islands architecture, partial hydration |
| **Single monolithic JS bundle** | Blocks interactivity until parsed/executed | Code splitting, route-based chunks |
| **Large event handlers on main thread** | Blocks interactions, degrades INP | Debounce, Web Workers, `scheduler.yield()` |
| **Not using `passive: true` on scroll/touch listeners** | Browser can't optimize scrolling; forced to wait for `preventDefault()` | `{ passive: true }` |

## Measurement & Monitoring

| ❌ Anti-Pattern | Why It's Harmful | Modern Replacement |
|----------------|-----------------|-------------------|
| **`window.performance.timing`** | Deprecated; doesn't support SPDY/HTTP2 | `performance.getEntriesByType('navigation')` |
| **Relying only on Lighthouse** | Lab data ≠ real user experience | RUM (CrUX, analytics) + synthetic (Lighthouse CI) |
| **No real-user monitoring** | You don't know what users actually experience | Web Vitals library, RUM endpoint, CrUX dashboard |
| **Measuring on development machine only** | Dev machine is not representative | Network throttling, CPU throttling, test on mid-range devices |
| **Not setting performance budgets** | Performance regressions go unnoticed | Lighthouse CI, bundlesize, size-limit |
| **No CI performance check** | PRs can degrade without anyone noticing | Lighthouse CI GitHub Action, WebPageTest CI |
| **Budgeting only total bundle size** | Ignores interaction, rendering, and stability metrics | Budget CWV metrics too |
| **Sampling RUM too infrequently** | Insufficient sample size for reliable P75 | Target 1000s of samples per origin per day |
| **Not observing `buffered: true`** | Miss early metrics (especially LCP/CLS) | `observer.observe({ buffered: true })` |

## Tooling & Process

| ❌ Anti-Pattern | Why It's Harmful | Modern Replacement |
|----------------|-----------------|-------------------|
| **FastClick library** | Fixed a 300ms tap delay that hasn't existed since Chrome 32/Safari 9 | Remove; no longer needed |
| **CSS-animations.js (James Long, 2013)** | Library for CSS animations from JS; unnecessary | Native CSS animations |
| **Modernizr** | Feature detection library; adds bundle weight | `@supports` in CSS, `'feature' in window` in JS |
| **jQuery for DOM animations** | `.animate()` uses `setInterval` + style properties | CSS transitions/animations, `Web Animations API` |
| **Grunt/Gulp-based performance optimization** | Overly complex build chain | webpack, vite with built-in minification/tree-shaking |
| **Manual image optimization** | Inconsistent, easy to forget | Build-time image optimization plugins (imagemin, sharp) |
| **Custom build of "critical CSS" tools without monitoring** | May become stale as CSS changes | Automated critical CSS extraction (Critters, Penthouse) in CI |
| **Loading analytics/tracker synchronously** | Blocks rendering | `<script async src="...">`, `{ passive: true }` |

## Mobile-Specific

| ❌ Anti-Pattern | Why It's Harmful | Modern Replacement |
|----------------|-----------------|-------------------|
| **Treating mobile as "desktop lite"** | Mobile has slower CPUs, less memory, slower networks | Performance budget for mobile; test on real mobile devices |
| **Serving desktop-sized images to mobile** | Wasted bandwidth (3x-10x oversize) | `srcset` + `<picture>` + `sizes` |
| **Assuming 4G everywhere** | Many users on 3G, 2G, or congested networks | Test on "Slow 3G" (400ms RTT, 400kbps) |
| **Not handling `visibilitychange`** | App keeps running in background, draining battery | Pause animations, throttled timers on `visibilitychange` |
| **Heavy frameworks on mobile without SSR** | Slow FCP, bad LCP on low-end devices | Consider lighter frameworks, SSR, or static generation |
| **Using 100+ DOM elements in SVG animations** | SVG painting is expensive on mobile GPUs | Use Canvas API or optimized CSS animations |

## Summary: The Golden Rules

1. **CSS `transform` + `opacity`** for all animations
2. **`loading="lazy"` + `fetchpriority="high"`** for images
3. **`async`/`defer`** for all scripts
4. **`preconnect`** for critical origins, **`dns-prefetch`** for the rest
5. **`width` + `height`** on all images
6. **`font-display: swap`** for all fonts
7. **`content-visibility: auto`** for all off-screen sections
8. **`requestAnimationFrame`** for JS animations
9. **`PerformanceObserver`** with `buffered: true`
10. **Test on real mobile devices with throttled networks**
