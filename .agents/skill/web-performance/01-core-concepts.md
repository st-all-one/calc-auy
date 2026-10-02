# 01 — Core Concepts

## Why

Performance determines user retention. 53% of mobile users abandon sites that take >3s to load. Performance directly impacts conversion, accessibility, and SEO (Core Web Vitals are ranking signals).

## What

### User-Perceived Performance (UPP)

The only performance that matters. It includes:

| Dimension | Definition | Key Metric |
|-----------|-----------|------------|
| **Responsiveness** | Speed of system output after user input | INP (<200ms good) |
| **Frame Rate** | Smoothness of visual updates | 60fps target (16.7ms/frame) |
| **Memory Usage** | Ability to maintain user state without OOM | Not directly perceived but critical |
| **Power Usage** | Battery drain while meeting UPP goals | Indirectly perceived via device lifetime |

### The RAIL Model

| Phase | Goal | Threshold |
|-------|------|-----------|
| **Response** | Acknowledge input immediately | <100ms (ideally <50ms) |
| **Animation** | Each frame must render smoothly | <16.7ms per frame |
| **Idle** | Maximize idle time for deferred work | <50ms idle blocks |
| **Load** | Deliver content and become interactive | <5s on 3G, <1.5s on T1 |

### Four Key Moments in Page Lifecycle

1. **First Paint (FP)** — First pixel rendered
2. **First Contentful Paint (FCP)** — First text/image rendered
3. **Largest Contentful Paint (LCP)** — Main content visible
4. **Time to Interactive (TTI)** — Page reliably responds to user input

### Modern Metrics Framework

- **Loading**: LCP (<2.5s), FCP (<1.8s), TTFB (<800ms)
- **Interactivity**: INP (<200ms), TTI (<5s on 3G)
- **Visual Stability**: CLS (<0.1)
- **Smoothness**: No long tasks (>50ms), no dropped frames

## How

### Performance Mindset

```
1. Establish baseline metrics (RUM data)
2. Set performance budgets (quantitative limits)
3. Identify critical path for each user-perceived event
4. Optimize what matters most (measure → optimize → verify)
5. Monitor in production (RUM) and CI (synthetic)
```

### First 14KB Rule

The browser starts rendering after receiving the first TCP packet (~14KB). Critical CSS/HTML must fit here.

### "Above the Fold" ≠ Modern

Modern performance is about **progressive rendering** and **prioritizing the critical path**, not binary above/below-fold thinking.

## What to Avoid

- ❌ Optimizing what you can't measure (guessing)
- ❌ Premature optimization without baseline
- ❌ Equating "fast in dev" with "fast in production" (network throttling is essential)
- ❌ Ignoring mobile — 60%+ of traffic is mobile
- ❌ Focusing only on load time while ignoring interaction/fluidity

## Key References

- MDN: `guides/fundamentals/index.md`
- MDN: `guides/how_long_is_too_long/index.md`
- RAIL: https://web.dev/articles/rail
