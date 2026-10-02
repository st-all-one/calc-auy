# Web Performance — Modern Pattern Reference

## Purpose

This compendium synthesizes the MDN Web Performance guides into a concise, AI-optimized reference covering **modern (2024-2025) standards, semantics, best practices, and anti-patterns**. Each document is self-contained and focuses on actionable knowledge.

---

## Document Map

| Doc | Topic | Prerequisites |
|-----|-------|---------------|
| `01-core-concepts.md` | What is performance? RAIL model, key metrics, user perception | None |
| `02-how-browsers-work.md` | Navigation pipeline (DNS → TCP → TLS → HTTP → Parse → Render) | 01 |
| `03-critical-rendering-path.md` | DOM → CSSOM → Render Tree → Layout → Paint | 02 |
| `04-loading-strategies.md` | Lazy loading, speculative loading, preload, preconnect, dns-prefetch | 02, 03 |
| `05-rendering-and-animation.md` | 60fps, compositing, transform/opacity, CSS vs JS animations | 03 |
| `06-core-web-vitals.md` | LCP, INP, CLS — what they are, how to optimize | 03, 04 |
| `07-measurement-and-monitoring.md` | Navigation/Resource Timing API, PerformanceObserver, RUM vs Synthetic, budgets | 01–06 |
| `08-modern-patterns.md` | Consolidated checklist of modern practices | All |
| `09-anti-patterns.md` | What to avoid, outdated techniques | All |

Each document defines:
- **Why** it matters (user-perceived impact)
- **What** the standard is (semantics, mechanics)
- **How** to implement (code, config, process)
- **What to avoid** (anti-patterns, traps)

---

## Dependency Graph (Conceptual)

```
01-core-concepts
    └── 02-how-browsers-work
            ├── 03-critical-rendering-path
            │       ├── 04-loading-strategies
            │       └── 05-rendering-and-animation
            ├── 06-core-web-vitals
            └── 07-measurement-and-monitoring
08-modern-patterns (summary of 01-07)
09-anti-patterns (summary of 01-07)
```

---

## Key Principles (from MDN synthesis)

1. **User-perceived performance (UPP) is the only metric that matters.** Responsiveness > throughput.
2. **Measure first, optimize second.** "Specificity is not your low-hanging fruit."
3. **The Critical Rendering Path is the foundation.** Master it before anything else.
4. **60fps = 16.7ms/frame.** Scripts, style, layout, paint must fit this window.
5. **Interactions need feedback in ≤50ms.** Above 100ms = perceived lag.
6. **5s TTI on 3G is the practical target.** 1s is aspirational for most.
7. **CSS `transform` and `opacity` are GPU-composited.** Use them. Avoid layout-triggering properties.
8. **Native browser features > JS libraries.** `loading=lazy`, `content-visibility`, `requestAnimationFrame`.
9. **Preconnect critical origins early.** Use HTTP `Link` headers.
10. **INP replaced FID as a Core Web Vital in March 2024.** Optimize for it.
