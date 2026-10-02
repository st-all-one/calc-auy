# 06 — Core Web Vitals

## Why

Core Web Vitals are Google's standardized metrics for user experience. They are **ranking signals** and directly correlate with business metrics (conversion, retention). INP replaced FID in March 2024 — this is the current standard.

## What

### The Three Core Web Vitals

| Metric | What It Measures | Good | Needs Improvement | Poor |
|--------|-----------------|------|-------------------|------|
| **LCP** (Largest Contentful Paint) | Loading — perceived load speed | ≤2.5s | 2.5s–4.0s | >4.0s |
| **INP** (Interaction to Next Paint) | Interactivity — responsiveness to all clicks/taps/keyboard | ≤200ms | 200ms–500ms | >500ms |
| **CLS** (Cumulative Layout Shift) | Visual stability — unexpected layout shifts | ≤0.1 | 0.1–0.25 | >0.25 |

### LCP — Loading

**What counts as LCP element**: `<img>`, `<image>` (SVG), `<video>` poster, elements with `background-image` (CSS), text nodes (block-level).

**Causes of poor LCP**:
1. Slow server response time (TTFB)
2. Render-blocking CSS/JS
3. Slow resource load times (LCP image)
4. Client-side rendering (CSR) without SSR

**Optimization checklist**:
```html
<!-- 1. Signal the LCP image early -->
<link rel="preload" href="/hero.webp" as="image" fetchpriority="high" />

<!-- 2. Use modern formats -->
<img src="/hero.avif" srcset="/hero.avif, /hero@2x.avif 2x" alt="Hero" />

<!-- 3. Add explicit width+height to prevent CLS -->
<img width="1200" height="600" src="/hero.webp" alt="Hero" />

<!-- 4. Prioritize above CSS/JS images -->
<img src="/hero.webp" alt="Hero" fetchpriority="high" />
```

**Server-side**: Improve TTFB (CDN, early hints, server optimization), inline critical CSS, use SSR for fast first paint.

### INP — Interactivity

**What counts**: Click, tap, keyboard events. Unlike FID (which only measured **first** input), INP measures **all** interactions across the page visit, reporting the worst one.

**What causes poor INP**:
1. Long tasks (>50ms) blocking the main thread
2. Heavy event handlers (complex DOM manipulation, reflow)
3. Large JS bundles parsed and executed on interaction
4. Third-party scripts running during interaction
5. Layout thrashing from interleaved read/write DOM access

**Optimization checklist**:
```javascript
// 1. Break up long tasks
// DON'T: Process all items synchronously
function processAll(items) {
  items.forEach(processItem);  // May create a 200ms task
}

// DO: Use scheduler.yield() or chunking
async function processAll(items) {
  for (const item of items) {
    processItem(item);
    await new Promise(r => setTimeout(r, 0));  // Yield to main thread
    // Or: await scheduler.yield();  // Chrome 115+
  }
}

// 2. Debounce expensive handlers
let timeout;
element.addEventListener('input', () => {
  clearTimeout(timeout);
  timeout = setTimeout(() => { /* expensive work */ }, 150);
});

// 3. Avoid forced reflow
// DON'T: Read → Write → Read → Write (thrashing)
// DO: Batch reads, then batch writes

// 4. Use passive event listeners for scroll/touch
document.addEventListener('touchstart', handler, { passive: true });
```

**Minimize main thread work during interaction phases**:
- Defer analytics, logging, non-critical work to `requestIdleCallback`
- Use Web Workers for computation
- Keep event handlers light — aim for <5ms execution
- Pre-compute or cache results where possible

### CLS — Visual Stability

**Causes of poor CLS**:
1. Images/videos/iframes without explicit dimensions
2. Dynamically injected content (ads, banners, embeds)
3. Web fonts causing FOIT/FOUT (Flash of Invisible/Unstyled Text)
4. Custom animations/transitions that shift layout

**Optimization checklist**:
```html
<!-- 1. Always set width and height on images -->
<img width="800" height="450" src="..." alt="..." />

<!-- Or use aspect-ratio in CSS -->
<style>
  .hero { aspect-ratio: 16 / 9; }
</style>

<!-- 2. Reserve space for dynamic content -->
<div style="min-height: 250px; width: 100%;">
  <div id="ad-container"></div>
</div>

<!-- 3. Use font-display: swap with matching fallback -->
<style>
  @font-face {
    font-family: 'Inter';
    src: url('/fonts/Inter.woff2') format('woff2');
    font-display: swap;  /* Show fallback text immediately */
  }
</style>

<!-- 4. Avoid late-loading layout shifts from transforms -->
<!-- DON'T: Move elements after paint -->
```

**CSS font-size-adjust** (modern) to reduce layout shift when fallback fonts swap:
```css
body {
  font-family: 'Inter', system-ui, sans-serif;
  font-size-adjust: from-font;  /* Auto-match x-height */
}
```

## How

### Monitoring CWV

```javascript
// Using PerformanceObserver (Production-safe)
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    // Send to analytics:
    // navigator.sendBeacon('/analytics', { name: entry.name, value: entry.value });
    console.log(`${entry.name}: ${entry.value}`);
  }
});

observer.observe({ type: 'largest-contentful-paint', buffered: true });
observer.observe({ type: 'layout-shift', buffered: true });
observer.observe({ type: 'first-input', buffered: true });  // FID
// For INP, use the Event Timing API:
const inpObserver = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.interactionId && entry.name === 'pointerdown' || entry.name === 'keydown') {
      // duration = processingStart - startTime (responsiveness)
    }
  }
});
inpObserver.observe({ type: 'event', buffered: true, durationThreshold: 0 });
```

### PageSpeed Insights / CrUX

- **Field data** (CrUX): Real users, aggregated by URL origin
- **Lab data** (Lighthouse): Controlled environment, useful for debugging

## What to Avoid

- ❌ **`loading="lazy"` on LCP image** — delays LCP; use `fetchpriority="high"` instead
- ❌ **Images without dimensions** — single biggest cause of CLS
- ❌ **`font-display: block`** — causes invisible text (FOIT); use `swap` or `optional`
- ❌ **DOM manipulations during critical interaction phase** — triggers layout, hurts INP
- ❌ **Sync `XMLHttpRequest` or synchronous `fetch`** — blocks main thread
- ❌ **Third-party scripts that mutate the DOM after load** — ads, social widgets
- ❌ **Single-page app (SPA) without SSR for initial content** — CSR creates empty HTML, then fetches data; terrible LCP

## Key References

- web.dev/vitals
- MDN: `guides/how_long_is_too_long/index.md`
- MDN: `index.md` (glossary terms for LCP, CLS, INP)
