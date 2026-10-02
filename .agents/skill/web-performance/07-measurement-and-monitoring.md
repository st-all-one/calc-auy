# 07 — Measurement and Monitoring

## Why

You cannot optimize what you cannot measure. Modern web performance requires a **two-pronged monitoring strategy**: synthetic (lab) for debugging and regression prevention, and Real User Monitoring (RUM) for understanding real-world conditions.

## What

### Measurement APIs (Modern — Use These)

| API | What It Measures | Entry Types |
|-----|-----------------|-------------|
| **Navigation Timing** | Main document load timing | `navigation` |
| **Resource Timing** | All resource load timing | `resource` |
| **User Timing** | Custom application markers | `mark`, `measure` |
| **Long Tasks** | Tasks blocking main thread >50ms | `longtask` |
| **Long Animation Frames (LoAF)** | Frames exceeding 50ms, with attribution | `long-animation-frame` |
| **Event Timing** | Interaction latency (for INP) | `event`, `first-input` |
| **Largest Contentful Paint** | LCP timing | `largest-contentful-paint` |
| **Layout Instability** | CLS scoring | `layout-shift` |
| **Server Timing** | Server-side metrics in response headers | `server-timing` |

### Navigation and Resource Timing — Essential Properties

```javascript
const [entry] = performance.getEntriesByType('navigation');
// entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart
// entry.domComplete
// entry.loadEventEnd
// entry.responseStart - entry.requestStart   (TTFB)
// entry.domInteractive

const resources = performance.getEntriesByType('resource');
resources.forEach(r => {
  console.log(r.name, {
    dns: r.domainLookupEnd - r.domainLookupStart,
    tcp: r.connectEnd - r.connectStart,
    tls: r.secureConnectionStart ? r.connectEnd - r.secureConnectionStart : 0,
    ttfb: r.responseStart - r.requestStart,
    download: r.responseEnd - r.responseStart,
    protocol: r.nextHopProtocol,  // 'h2', 'h3', 'http/1.1'
    transferSize: r.transferSize,
    encodedBodySize: r.encodedBodySize
  });
});
```

### Monitoring Strategy: RUM vs Synthetic

| Aspect | Synthetic (Lab) | RUM (Field) |
|--------|----------------|-------------|
| **Environment** | Controlled (e.g., Lighthouse, WebPageTest) | Real user devices, networks |
| **Repeatability** | ✅ Yes (deterministic) | ❌ No (varies per user) |
| **Coverage** | Single scenario per run | All users, all devices |
| **Bottlenecks** | ✅ Finds them | ❌ Hindsight only |
| **Trends** | ❌ Not for real-world degredation | ✅ Long-term trends |
| **Regression testing** | ✅ Excellent (CI integration) | ❌ Too noisy |
| **Budget enforcement** | ✅ Lighthouse CI, Bundlesize | ❌ High variance |

**Best practice: Use BOTH**:
- Synthetic in CI/CD (prevent regressions)
- RUM in production (understand real users, set baselines)

### Performance Budgets

A **performance budget** is a quantitative limit to prevent regressions.

```json
// Example budget (Lighthouse CI format)
{
  "performance": 0.9,           // Lighthouse performance score ≥ 90
  "resource-summary": {
    "script": { "maxSize": "300KB" },
    "image": { "maxSize": "500KB" },
    "total": { "maxSize": "1MB" }
  },
  "timings": {
    "first-contentful-paint": { "maxNumericValue": 1800 },
    "largest-contentful-paint": { "maxNumericValue": 2500 },
    "total-blocking-time": { "maxNumericValue": 200 },
    "cumulative-layout-shift": { "maxNumericValue": 0.1 },
    "speed-index": { "maxNumericValue": 3000 }
  }
}
```

### Critical Performance Monitoring Checklist

1. **Collect RUM for Core Web Vitals** → identify real-user pain points
2. **Set up Lighthouse CI** → prevent regressions on every PR
3. **Alert on regressions** → integrate with monitoring (Datadog, Grafana, SpeedCurve)
4. **Monitor third-party scripts** → they degrade performance silently
5. **Budget for mobile** → set separate budgets for mobile (lower thresholds)
6. **Track Long Tasks** → frequently the root cause of poor INP

## How

### Performance Observer (Modern, Preferred API)

```javascript
// Observe all relevant metrics in one observer
const observer = new PerformanceObserver((list) => {
  const entries = list.getEntries();
  for (const entry of entries) {
    // Classify by entry type
    switch (entry.entryType) {
      case 'largest-contentful-paint':
        // Send LCP to analytics
        break;
      case 'layout-shift':
        if (!entry.hadRecentInput) {
          // Accumulate CLS
        }
        break;
      case 'event':
        if (entry.interactionId > 0) {
          // Calculate INP = entry.processingStart - entry.startTime
        }
        break;
      case 'long-animation-frame':
        // LoAF includes scripts responsible for the long frame
        // entry.scripts.forEach(s => console.log(s.sourceURL, s.duration));
        break;
    }
  }
});

observer.observe({
  type: 'largest-contentful-paint',
  buffered: true
});
observer.observe({
  type: 'layout-shift',
  buffered: true
});
observer.observe({
  type: 'event',
  buffered: true,
  durationThreshold: 0  // Capture all events for INP
});
observer.observe({
  type: 'long-animation-frame',
  buffered: true
});
```

### Server Timing

```http
# Server response header
Server-Timing: auth;dur=50, db;dur=120, cache;desc="miss"
```

```javascript
// Client-side access
performance.getEntriesByType('navigation')[0].serverTiming
// Returns: [{name: "auth", duration: 50}, {name: "db", duration: 120}, ...]
```

## What to Avoid

- ❌ **`performance.timing` (deprecated Navigation Timing Level 1)** — use `performance.getEntriesByType('navigation')` instead
- ❌ **Relying solely on Lighthouse scores** — they're lab data, not real user experience
- ❌ **Sampling too little** — RUM needs statistical significance (1000s of samples for reliable P75)
- ❌ **Not observing `buffered: true`** — you miss events that fired before observer registration
- ❌ **Ignoring the `nextHopProtocol`** — HTTP/2+ performance differs from HTTP/1.1
- ❌ **Budget only on bundle size** — performance is about loading + interactivity + stability
- ❌ **Measuring from dev tools on a MacBook Pro** — real users are on Moto G4 on 3G

## Key References

- MDN: `guides/navigation_and_resource_timings/index.md`
- MDN: `guides/rum-vs-synthetic/index.md`
- MDN: `guides/performance_budgets/index.md`
- MDN: `index.md` (Performance APIs section)
