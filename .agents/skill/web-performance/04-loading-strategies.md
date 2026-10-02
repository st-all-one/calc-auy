# 04 — Loading Strategies

## Why

Most of a page's life is spent loading resources. Strategic loading — deferring what isn't needed now, preemptively fetching what will be — directly improves LCP, TTI, and perceived performance.

## What

### The Loading Spectrum

```
Eager (now)                    Lazy (later)
  │                              │
  v                              v
preload ─ preconnect ─ dns-prefetch ─ prefetch ─ lazy=loading ─ lazyload (JS)
  │         │             │             │             │              │
  Forces    | Establishes | Resolves    | Downloads  | Defers       | Defers with
  fetch     | TCP+TLS     | DNS         | for future | offscreen    | intersection
  now       | early       | early       | nav        | images       | observer
```

### Resource Hints (Priority: High → Low)

| Hint | Action | Use Case | Impact |
|------|--------|----------|--------|
| `preload` | Fetch and cache the resource ASAP | Hero image, critical font, critical CSS | High — ensures resource available for first paint |
| `preconnect` | DNS + TCP + TLS early | Third-party origins (fonts, APIs) | Medium-High — saves 100-500ms |
| `dns-prefetch` | DNS resolution only | Many third-party origins | Medium — saves ~20-120ms |
| `prefetch` | Fetch for future navigation | Next page resources | Low-Medium — speculative, may not be used |
| `prerender` (deprecated) | Render entire page in background | — | Replaced by Speculation Rules API |

### Lazy Loading

| Technique | What | Support |
|-----------|------|---------|
| Native `loading="lazy"` | Defers offscreen `<img>` and `<iframe>` loading | Universal (~97%) |
| `content-visibility: auto` | Defers rendering of off-screen elements | Universal (~92%) |
| `IntersectionObserver` | JS-based lazy loading for custom scenarios | Fallback |
| Native `loading="lazy"` for `<iframe>` | Defers offscreen iframes | Universal (~97%) |

### Speculative Loading (Modern)

The **Speculation Rules API** (Chrome-only, modern alternative to deprecated `<link rel="prerender">`):

```json
// Inline JSON in <head>
<script type="speculationrules">
{
  "prefetch": [{
    "source": "list",
    "urls": ["/next-page", "/another-page"]
  }],
  "prerender": [{
    "source": "list",
    "urls": ["/most-likely-next"]
  }]
}
</script>
```

Or via HTTP header:
```http
Speculation-Rules: "/speculationrules.json"
```

**Note**: `prerender` via Speculation Rules is far more efficient than the old `<link rel="prerender">` because the browser manages resource usage and can cancel.

### Priority Hints (fetchpriority)

```html
<img src="hero.webp" fetchpriority="high" />  <!-- LCP element -->
<img src="other.webp" fetchpriority="low" />
```

```javascript
fetch('/api/critical', { priority: 'high' });
fetch('/api/analytics', { priority: 'low' });
```

`fetchpriority` (`high`/`low`/`auto`) tells the browser which resources are more important relative to others of the same type.

## How

### Loading Strategy Decision Tree

```
For each resource:
│
├─ Is it critical for first paint (LCP)?
│   └─ YES → <link rel="preload"> or inline
│
├─ Is it from a third-party origin?
│   └─ YES → Is it one of <3 critical origins?
│   │           └─ YES → <link rel="preconnect" crossorigin>
│   │           └─ NO  → <link rel="dns-prefetch">
│
├─ Is it below the fold?
│   └─ YES → loading="lazy" (images/iframes)
│            content-visibility: auto (sections)
│
├─ Will it be needed on the next page?
│   └─ YES → <link rel="prefetch"> or Speculation Rules
│
└─ Otherwise → load normally (deferred at end of <body>)
```

### Complete HTML Loading Template

```html
<!DOCTYPE html>
<html>
<head>
  <!-- Critical path -->
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />

  <!-- Preconnect critical origins -->
  <link rel="preconnect" href="https://fonts.googleapis.com/" crossorigin />
  <link rel="dns-prefetch" href="https://analytics.example.com/" />

  <!-- Preload critical resources -->
  <link rel="preload" href="/fonts/Inter.woff2" as="font" crossorigin />
  <link rel="preload" href="/images/hero.webp" as="image" fetchpriority="high" />

  <!-- Critical CSS (inline) -->
  <style>/* ... */</style>

  <!-- Deferred non-critical CSS -->
  <link rel="preload" href="/styles/styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'" />
  <noscript><link rel="stylesheet" href="/styles/styles.css" /></noscript>

  <!-- Scripts (deferred, not blocking) -->
  <script defer src="/js/app.js"></script>
</head>
<body>
  <!-- Content -->
  <img src="/images/hero.webp" alt="Hero" fetchpriority="high" />
  
  <section style="content-visibility: auto">
    <img src="/images/gallery1.webp" loading="lazy" alt="Gallery" />
    <img src="/images/gallery2.webp" loading="lazy" alt="Gallery" />
  </section>

  <!-- Speculation rules for next page -->
  <script type="speculationrules">
  {"prefetch":[{"source":"document","where":{"href_matches":"/articles/*"}}]}
  </script>
</body>
</html>
```

## What to Avoid

- ❌ **`<link rel="preload">` for resources that are already eagerly discovered** — wastes preload scanner capacity
- ❌ **Preconnecting to too many origins** — uses socket and memory resources; limit to 3-6
- ❌ **Using `dns-prefetch` for your own domain** — already resolved; useless
- ❌ **Expecting `<link rel="prefetch">` to work cross-site** — cache partitioning broke this; same top-level-site only
- ❌ **Using `<link rel="prerender">`** — deprecated, use Speculation Rules API instead
- ❌ **`loading="lazy"` on LCP images** — delays LCP; use `fetchpriority="high"` instead
- ❌ **Relying on JS-based lazy loading when native is sufficient** — native is faster, lighter, and doesn't block main thread
- ❌ **Using `@font-face` without `font-display: swap`** — causes invisible text during font load (FOIT)

## Key References

- MDN: `guides/lazy_loading/index.md`
- MDN: `guides/speculative_loading/index.md`
- MDN: `guides/dns-prefetch/index.md`
- MDN: `guides/optimizing_startup_performance/index.md`
