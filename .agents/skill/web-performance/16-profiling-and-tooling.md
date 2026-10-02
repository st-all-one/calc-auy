# Profiling and Tooling — Browser DevTools, Flame Graphs, Performance Workflow

## Why

Without measurement, optimization is guesswork. Browser profiling tools reveal exactly where time is spent — parsing, layout, painting, JavaScript execution, network — enabling targeted, data-driven optimizations.

## What

### 1. Key Profiling Tools

| Tool | Platform | Best For |
|------|----------|----------|
| **Performance panel** | Chrome DevTools | Recording and analyzing runtime performance |
| **Performance panel** | Firefox DevTools | Flame graphs, stack charts, marker charts |
| **Network panel** | All browsers | Resource timing, waterfals, throttling |
| **Lighthouse** | Chrome DevTools, CLI | Audits, scoring, recommendations |
| **WebPageTest** | Web | Synthetic multi-location testing, filmstrips |
| **Firefox Profiler** | profiler.firefox.com | Gecko-level profiling, call tree, flame graph |

### 2. Firefox Profiler Features

The Firefox Profiler (profiler.firefox.com) provides specialized performance views:

**Call Tree**: Shows which functions consumed the most time, hierarchically organized. Use to identify expensive JavaScript functions.

**Flame Graph**: A visualization showing stacked function calls. Each rectangle represents a function call; wider = more time. Useful for identifying deep call stacks that block the main thread.

**Stack Chart**: A horizontal view of call stacks over time, showing which code was executing at each moment. Helps correlate UI events with JavaScript execution.

**Marker Chart**: Shows browser-internal markers (paint, layout, GC, etc.) overlaid on a timeline. Use to identify rendering bottlenecks.

**Network Chart**: Network request waterfall synchronized with the main thread timeline. Shows how network delays relate to rendering.

### 3. Chrome DevTools Performance Panel

Key workflows:

**Record runtime performance**:
1. Open DevTools → Performance tab
2. Click Record (circle icon)
3. Perform the user interaction (click, scroll, animation)
4. Stop recording
5. Analyze the flame chart and summary

**Key sections in the flame chart**:
- **Network**: Request waterfals
- **Timings**: FP, FCP, LCP markers
- **Main**: Main thread activity (parse, style, layout, paint, JS)
- **Compositor**: Compositor thread work
- **GPU**: GPU processing
- **Summary** (bottom): Time breakdown by category (Scripting, Rendering, Painting, System, Idle, etc.)

### 4. Lighthouse

Automated auditing tool for performance, accessibility, SEO, and best practices.

```bash
# CLI audit
npx lighthouse https://example.com --view

# CI integration (Lighthouse CI)
npx lhci autorun
```

**Key performance metrics scored**:
- FCP, LCP, TTI, TBT (Total Blocking Time), CLS, Speed Index

**Best for**: Synthetic, repeatable performance scoring and regression detection.

### 5. WebPageTest

Three-location, multi-device synthetic testing (free tier available at webpagetest.org).

**Key outputs**:
- **Waterfall view**: Per-resource timing breakdown
- **Filmstrip**: Visual frame-by-frame progression of page loading
- **Performance metrics**: FCP, LCP, TTI, Speed Index, etc.
- **Opportunities**: Specific optimization suggestions

**Best for**: Understanding real-world loading sequence, catching render-blocking issues.

### 6. Performance Monitoring Workflow

```
Development → Synthetic Testing → RUM → Continuous Monitoring
    ↓                ↓               ↓            ↓
 DevTools       Lighthouse       CrUX/        CI + Alerts
 Profiler       WebPageTest     RUM Setup

DEV (daily):
  - Profile in DevTools after each feature
  - Check flame chart for long tasks (>50ms)
  - Check Network tab for waterfall issues

CI (per commit):
  - Lighthouse CI: enforce performance budgets
  - WebPageTest: catch regression in TTFB, LCP

STAGING (per release):
  - Full WebPageTest analysis (3G, mobile, desktop)
  - Compare against performance budgets

PRODUCTION (continuous):
  - RUM data from CrUX and/or your analytics
  - Monitor CWV (LCP, INP, CLS) in real-time
  - Alerts when metrics cross thresholds
```

### 7. Reading a Waterfall Chart

In any DevTools Network panel (or WebPageTest):

```
Timeline (ms):  0  100  200  300  400  500  600  700
                |   |    |    |    |    |    |    |
index.html      ████░░░░░░░░░░░░░░░░░░░░
styles.css          ██░░░░░░░░
app.js               ████░░░░░░░░░░░░░░░░
hero.jpg                      ████████░░░░░░░░░░░░
analytics.js                          ██░░░░░░░░

█ = Waiting (TTFB)   ░ = Downloading
```

**What to look for**:
- **Long `█` blocks**: Server processing (TTFB) is slow → optimize backend or use CDN
- **Sequential downloads**: Resources blocked on earlier ones → use preload/preconnect
- **Gaps with no activity**: Idle time → investigate parser blocking
- **Late-discovered resources**: Not found by preload scanner → add preload hints

### 8. Debugging Specific Performance Issues

**Layout thrashing**:
1. Record in Performance panel
2. Look for alternating "Layout" and "Parse HTML" or "Script" entries
3. Batch DOM reads before writes

**Long tasks (>50ms)**:
1. Record interaction
2. In the flame chart, identify purple (Scripting) blocks >50ms
3. Click to see the function call stack
4. Break into smaller chunks with `setTimeout()` or `scheduler.yield()`

**Animation jank (missed frames)**:
1. Record animation
2. Enable "FPS meter" (Chrome: Rendering → FPS meter)
3. Check for red frames or frame drops
4. If Layout/Paint triggers appear, switch to `transform`/`opacity`

**Network bottlenecks**:
1. Open Network panel
2. Throttle to Regular 3G
3. Look for:
   - Waterfall gaps → add preconnect
   - Late DNS → add dns-prefetch
   - Large transfers → optimize images, enable compression

## What to Avoid

- **Profiling only on your dev machine** — test under throttled conditions
- **Ignoring long tasks** — every task >50ms degrades INP
- **Relying on a single run** — always take the median of 3+ runs
- **Optimizing without data** — profile first, then optimize the real bottleneck
- **Only using Lighthouse** — it's synthetic; combine with RUM
- **Not throttling in DevTools** — your local network is unrealistically fast
- **Trusting the Summary tab blindly** — drill into the flame chart for context
