# Network Deep Dive — TCP Slow Start, Latency Components, Throttling Presets, Preload Scanner

## Why

Network latency dominates the initial page load experience. Every round trip (RTT) between browser and server adds delay. Understanding the mechanics — TCP slow start, congestion window, and each latency component — enables precise optimization targeting.

## What

### TCP Slow Start and Congestion Window (CWND)

TCP does not send a full response at once. It uses **slow start** to probe network capacity:

1. Server initializes a **congestion window (CWND)** — typically 1, 2, 4, or 10 **MSS** (Maximum Segment Size = 1460 bytes over Ethernet)
2. Server sends CWND bytes, then waits for the client's ACK
3. On each ACK received, CWND **doubles**
4. If no ACK arrives (packet loss), CWND is **halved**

```text
Initial CWND = 10 MSS ≈ 14KB
After 1 RTT:  CWND = 20 MSS ≈ 28KB
After 2 RTT:  CWND = 40 MSS ≈ 56KB
After 3 RTT:  CWND = 80 MSS ≈ 112KB
```

**Practical implication**: The first **14KB** of a response can be sent immediately. This is why inlining critical CSS and HTML in the first 14KB is so important — it fits in the initial CWND and can be rendered before subsequent packets arrive.

**First 14KB Rule**: The browser can begin parsing and rendering after receiving the first 14KB packet. Ensure all critical CSS and above-fold HTML fits within this budget.

### Latency Components (Per-Request Breakdown)

DevTools network tab breaks request time into phases:

| Phase | What Happens | Cost |
|-------|-------------|------|
| **Blocked** | Request queued waiting for an available connection (browser limit: 6 per domain over HTTP/1.1) | Variable |
| **DNS resolution** | Hostname → IP address lookup | ~20-120ms |
| **Connecting** | TCP 3-way handshake (SYN-SYN/ACK-ACK) | 1 RTT |
| **TLS handshake** | Secure connection setup (certificate exchange, key agreement) | 1-2 RTT (TLS 1.3 = 1 RTT; TLS 1.2 = 2 RTT) |
| **Sending** | HTTP request transmission to server | Negligible |
| **Waiting (TTFB)** | Server processing time (disk latency, DB queries, compute) | Variable |
| **Receiving** | Downloading the response body (affected by bandwidth + file size) | Depends on network |

**First request total**: Up to **8 round trips** before the first byte of the response arrives (DNS: 1, TCP: 1, TLS: 2, HTTP: 1, plus accumulated CWND waits).

### Network Throttling Presets

Browser DevTools throttling presets emulate real-world network conditions:

| Selection | Download | Upload | Min Latency |
|-----------|----------|--------|-------------|
| GPRS | 50 kbps | 20 kbps | 500 ms |
| Regular 2G | 250 kbps | 50 kbps | 300 ms |
| Good 2G | 450 kbps | 150 kbps | 150 ms |
| Regular 3G | 750 kbps | 250 kbps | 100 ms |
| Good 3G | 1.5 Mbps | 750 kbps | 40 ms |
| Regular 4G/LTE | 4 Mbps | 3 Mbps | 20 ms |
| DSL | 2 Mbps | 1 Mbps | 5 ms |
| Wi-Fi | 30 Mbps | 15 Mbps | 2 ms |

**Testing guidance**: Always test on Regular 3G (750/250 kbps, 100ms latency) as a realistic baseline for mobile users.

### Preload Scanner

The browser's **preload scanner** is a secondary HTML parser that runs on the main thread alongside the primary parser. It scans ahead for resource references (CSS, scripts, fonts, images) and starts downloading them immediately — without waiting for the primary parser to reach those references.

```html
<!-- The preload scanner finds and requests these before the main parser reaches them -->
<link rel="stylesheet" href="styles.css">
<script src="app.js" async></script>
<img src="hero.jpg" alt="">
```

**Key behavior**:
- Does not block on `<script>` tags (it ignores parser-blocking semantics)
- Requests CSS, JS, fonts, and `<img>` src attributes
- Cannot discover resources loaded by JavaScript (e.g., `new Image()`, dynamic `import()`)
- Makes `async` and `defer` scripts even more effective — they start downloading sooner

### Network Latency Types

| Type | Definition | Impact |
|------|-----------|--------|
| **Network latency** | Round-trip time for a data packet between browser and server | Delays every request/response cycle |
| **Disk latency** | Server-side time from receiving request to completing response (I/O, CPU) | Affects TTFB; improved by faster hardware/memory |

## How

### Optimize Against TCP Slow Start

1. **Inline critical CSS** in `<style>` within `<head>` — fits in first 14KB
2. **Inline above-fold HTML** — don't wait for second packet
3. **Minimize total critical bytes** — smaller first packet = faster render
4. **Preconnect to critical origins** — DNS + TCP + TLS done before needed

### Minimize Each Latency Component

| Component | Strategy |
|-----------|----------|
| DNS | `<link rel="dns-prefetch">` for cross-origin domains |
| TCP + TLS | `<link rel="preconnect">` for critical origins |
| Blocked | Use HTTP/2 or HTTP/3 (multiplexing removes 6-connection limit) |
| Waiting | Optimize server response time, use CDN, edge caching |
| Receiving | Compress (Brotli), serve modern image formats, cache aggressively |

### Network Throttling in Testing

Always test under constrained networks, not just on your dev machine:

```js
// Programmatic throttling via CDP (Chrome DevTools Protocol)
// Not available in standard web APIs — use DevTools UI or WebPageTest
```

### Leverage the Preload Scanner

- Place `<link rel="stylesheet">` and `<script defer>` early in `<head>`
- Prefer declarative resource references over JS-created ones
- Add `async` or `defer` to all scripts so the scanner can discover them
- List `<img>` tags in early HTML (not after JS-rendered content)

## What to Avoid

- **Counting on Server Push** — deprecated in Chrome, low adoption
- **Domain sharding** — counterproductive with HTTP/2 (multiple connections negate multiplexing)
- **Ignoring the first 14KB budget** — every byte beyond it costs an extra RTT
- **Testing only on fast connections** — real users on 3G with 300ms+ latency
- **JavaScript-discovered resources** — the preload scanner cannot see them
- **Relying solely on TTFB** — it is only one part of the latency story
