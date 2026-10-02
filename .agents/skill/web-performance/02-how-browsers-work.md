# 02 — How Browsers Work: Navigation Pipeline

## Why

Every performance optimization ultimately depends on understanding the sequence the browser follows to turn a URL into pixels. Bottlenecks at any stage degrade user experience.

## What

### Complete Navigation Pipeline

```
[URL Entered]
     ↓
[1. DNS Resolution]       ← Can be pre-resolved via dns-prefetch
     ↓
[2. TCP Handshake]        ← 3-way handshake (SYN, SYN-ACK, ACK)
     ↓
[3. TLS Negotiation]      ← If HTTPS (now ~95%+ of traffic)
     ↓
[4. HTTP Request/Response]
     ↓
[5. HTML Parsing]
     ├── Builds DOM tree (incremental)
     ├── Discovers subresources (CSS, JS, images, fonts)
     └── Blocks on render-blocking resources (CSS, sync JS)
     ↓
[6. CSS Parsing]           ← Builds CSSOM (render-blocking)
     ↓
[7. Render Tree Construction] ← DOM + CSSOM combined
     ↓
[8. Layout (Reflow)]       ← Calculate geometry
     ↓
[9. Paint]                 ← Rasterize pixels
     ↓
[10. Compositing]          ← Combine layers on GPU
```

### DNS Resolution

- **Process**: Domain → IP address (may involve multiple recursive lookups)
- **Cost**: ~20-120ms typical, up to seconds on slow networks
- **Mitigation**: `<link rel="dns-prefetch" href="...">` resolves early without blocking

### TCP Handshake

- **3-way**: SYN → SYN-ACK → ACK
- **Cost**: 1 RTT minimum
- **TCP Slow Start**: Begins with congestion window of ~10 segments, grows exponentially

### TLS Negotiation

- **1-RTT or 0-RTT**: TLS 1.3 reduced to 1 round trip; 0-RTT for repeat connections
- **Cost**: 1-2 RTTs additional on top of TCP
- **Mitigation**: `<link rel="preconnect" href="...">` performs DNS + TCP + TLS in parallel

### HTTP/2 and HTTP/3

| Feature | HTTP/1.1 | HTTP/2 | HTTP/3 (QUIC) |
|---------|----------|--------|---------------|
| Multiplexing | No (1 connection/request) | Yes (streams) | Yes (streams over UDP) |
| Head-of-line blocking | Yes | At TCP level | No (UDP-based) |
| Connection count | 6-8 per origin | 1 per origin | 1 per origin |
| Server push | No | Yes (deprecated in Chrome) | No |
| 0-RTT | No | No | Yes |

### Render-Blocking vs. Parser-Blocking

| Resource Type | Blocks? | Solution |
|--------------|---------|----------|
| CSS (`<link>` in `<head>`) | Render (CSSOM must be complete) | Critical CSS inline, media queries for non-critical, `preload` |
| Sync JS (`<script>` without `async`/`defer`) | Parser + Render | `async` (load-then-execute) or `defer` (execute after parse) |
| Inline JS | Parser | Keep small, or split |
| Images | Neither (but affect LCP) | `loading=lazy`, `fetchpriority=high` for LCP image |

## How

### Critical Network Optimizations

```http
# HTTP headers for early hints
Link: <https://fonts.googleapis.com/>; rel=preconnect
Link: <https://analytics.example.com/>; rel=dns-prefetch
```

```html
<!-- HTML resource hints -->
<link rel="preconnect" href="https://fonts.googleapis.com/" crossorigin />
<link rel="dns-prefetch" href="https://analytics.example.com/" />
<link rel="preload" href="/fonts/myfont.woff2" as="font" crossorigin />
```

### Script Loading Comparison

| Method | Blocks Parser? | Execution Order | Use Case |
|--------|---------------|-----------------|----------|
| `<script>` (sync) | Yes | Immediately when parsed | Legacy, but avoid |
| `<script defer>` | No | After parse, before `DOMContentLoaded` | Most scripts |
| `<script async>` | No | When loaded (any time) | Analytics, ads |
| `<script type="module">` | No (deferred by default) | After parse | Modern JS modules |

### Speculative Parsing

The browser scans HTML for external resources (images, scripts, stylesheets) before the main parser reaches them, pre-connecting and pre-resolving. This is automatic — don't interfere by having server-side conditional resource injection that the speculative parser can't see.

## What to Avoid

- ❌ **Domain sharding** (splitting resources across domains) — anti-pattern since HTTP/2, which multiplexes over one connection
- ❌ **`<script>` tags without `defer`/`async` in `<head>`** — blocks rendering
- ❌ **CSS `@import`** — serializes CSS loading; use `<link>` instead
- ❌ **Relying on Server Push** — Chrome removed support; use `103 Early Hints` or `<link rel="preload">` instead
- ❌ **Forgetting `crossorigin` on preconnected font origins** — fonts are loaded in anonymous mode; without `crossorigin`, only DNS lookup happens

## Key References

- MDN: `guides/how_browsers_work/index.md`
- MDN: `guides/understanding_latency/index.md`
- MDN: `guides/dns-prefetch/index.md`
