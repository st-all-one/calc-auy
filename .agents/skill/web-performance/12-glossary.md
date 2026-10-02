# Web Performance Glossary

Terms from the [MDN Web Performance documentation](https://developer.mozilla.org/en-US/docs/Web/Performance), consolidated for reference.

---

### A

**AOM (Accessibility Object Model)**
: A semantic tree built alongside the DOM that exposes page structure to assistive technologies. Constructed during the rendering pipeline; its size affects parse and style costs.

---

### B

**Beacon**
: A small, asynchronous HTTP request sent via the `navigator.sendBeacon()` API. Used to send analytics or diagnostic data to a server without blocking page unload. Guaranteed to be sent even if the page is being closed.

**Brotli compression**
: A lossless compression algorithm (successor to Gzip) with better compression ratios. Supported by all modern browsers. Prefer `br` over `gzip` for text assets (HTML, CSS, JS).

---

### C

**CDN (Content Delivery Network)**
: A geographically distributed network of servers that cache and serve static assets from locations closer to the user, reducing latency and improving load times.

**CLS (Cumulative Layout Shift)**
: A Core Web Vital measuring visual stability. Quantifies how much visible content shifts during the page lifecycle. Target: ≤ **0.1**.

**Code splitting**
: Splitting a codebase into smaller bundles that can be loaded on demand, reducing initial bundle size. Two approaches: entry-point splitting (per route/page) and dynamic splitting (`import()`).

**CSSOM (CSS Object Model)**
: A tree representation of all CSS rules for a page, built by the browser alongside the DOM. Required before the render tree can be constructed. Render-blocking by default.

---

### D

**DNS (Domain Name System)**
: The system that translates human-readable hostnames (e.g., `example.com`) into IP addresses. DNS lookup adds ~20-120ms to a first request.

**Domain sharding**
: Splitting resources across multiple domains to bypass the browser's per-domain connection limit (6 over HTTP/1.1). Antipattern with HTTP/2 and HTTP/3.

---

### E

**Effective connection type (ECT)**
: A value from the Network Information API (`navigator.connection.effectiveType`) describing the observed connection quality: `slow-2g`, `2g`, `3g`, or `4g`. Used for adaptive loading.

---

### F

**FCP (First Contentful Paint)**
: The time when the browser renders the first piece of DOM content (text, image, SVG, canvas). Marks the first visual feedback. Target: ≤ **1.8s**.

**First CPU idle**
: The time when the page's main thread becomes quiet enough to handle user input. Measured when at least 95% of long tasks have completed.

**First paint (FP)**
: The time when the browser first renders any visual difference from the default background. Earlier than FCP but less meaningful.

---

### G

**Gzip compression**
: A widely supported lossless compression algorithm for HTTP responses. Superseded by Brotli for better ratios, but still a valid fallback.

---

### H

**HTTP (Hypertext Transfer Protocol)**
: The foundation protocol for data communication on the web. HTTP/2 introduced multiplexing (multiple streams over one connection). HTTP/3 uses QUIC over UDP for even lower latency.

**HTTP/2**
: Major revision of HTTP that enables request multiplexing, header compression (HPACK), and server push. Eliminates the 6-connection-per-domain bottleneck of HTTP/1.1.

---

### I

**INP (Interaction to Next Paint)**
: A Core Web Vital (replaced FID in March 2024) measuring the latency of all interactions (click, tap, key) from user input to the next paint. Target: ≤ **200ms**.

---

### J

**Jank**
: Visible stuttering or juddering during animations or scrolling caused by the browser failing to render at 60fps. Often due to long tasks on the main thread or expensive layout recalculations.

---

### L

**Largest Contentful Paint (LCP)**
: A Core Web Vital measuring when the largest content element (image, video, text block) becomes visible. Target: ≤ **2.5s**.

**Latency**
: The time it takes for a data packet to travel from source to destination. One-way latency and round-trip time (RTT) are both measured. High latency multiplies the cost of multiple asset requests.

**Lazy load**
: Deferring the loading of non-critical resources (images, iframes, scripts) until they are needed (e.g., when scrolled into view). Reduces initial page weight and speeds up the critical rendering path.

**Long task**
: Any JavaScript task that monopolizes the main thread for **50ms or more**. Blocks user interaction and can cause jank. Detected via the Long Tasks API.

**Lossless compression**
: Data compression that allows the original data to be perfectly reconstructed from the compressed data. Used for text assets (HTML, CSS, JS). Examples: Gzip, Brotli.

**Lossy compression**
: Data compression that achieves smaller file sizes by discarding some data. Used for images (JPEG, WebP lossy) and audio. The quality loss is designed to be imperceptible.

---

### M

**Main thread**
: The single thread in a browser where HTML parsing, CSS recalculations, layout, painting, and JavaScript execution all run. Long tasks on the main thread cause jank and unresponsiveness.

**Minification**
: Removing unnecessary characters (whitespace, comments, newlines) from source code without changing functionality. Reduces file size and parse time.

---

### N

**Network throttling**
: Emulating slower network conditions (latency, bandwidth) in DevTools or testing tools to simulate how real users with poor connections experience the page.

---

### P

**Packet**
: A formatted unit of data carried over a packet-switched network. Each request and response is broken into packets. Packet loss triggers TCP retransmission and slows throughput.

**Page load time**
: The time from navigation start to `load` event. A traditional metric but insufficient — does not capture perceived performance or interactivity.

**Page prediction**
: Techniques for anticipating which pages a user will visit next and performing pre-fetching or pre-rendering. Includes the Speculation Rules API.

**Parse**
: The process of converting raw HTML into the DOM tree (and CSS into the CSSOM). Parse time increases with document size and complexity.

**Perceived performance**
: How fast the user *feels* the page is, which may differ from actual timings. Influenced by first paint, feedback latency, skeleton screens, and progress indicators.

**Prefetch**
: A resource hint (`<link rel="prefetch">`) that fetches a resource for a *future* navigation and stores it in the HTTP cache. Subject to cache partitioning.

**Prerender**
: A mechanism (deprecated `<link rel="prerender">` → replaced by Speculation Rules API) that renders an entire page in advance for near-instant navigation.

---

### Q

**QUIC**
: A transport protocol built on UDP (replacing TCP for HTTP/3). Reduces connection establishment to 0-1 RTT and eliminates head-of-line blocking inherent in TCP.

---

### R

**RAIL**
: A user-centric performance model with four focus areas: **R**esponse (≤100ms), **A**nimation (≤16.7ms), **I**dle (≤50ms chunks), **L**oad (≤5s on 3G).

**Real User Monitoring (RUM)**
: Collecting performance data from actual users in production. Captures real-world device, network, and geographic diversity. Essential for understanding true user experience.

**Resource Timing**
: A Performance API (`PerformanceResourceTiming`) providing detailed network timing for each individual resource (CSS, JS, images, etc.) loaded by a page.

**RTT (Round Trip Time)**
: The time it takes for a packet to travel from client to server and back. The fundamental unit of network latency. Each network handshake (TCP, TLS) costs at least 1 RTT.

---

### S

**Server Timing**
: A Performance API (`PerformanceServerTiming`) and HTTP header (`Server-Timing`) that allows servers to communicate backend timing metrics (DB query time, cache hit/miss, etc.) to the browser.

**Speculative parsing**
: The browser's technique of scanning HTML ahead of the main parser to discover and download resources early. Also called "preload scanner."

**Speed Index**
: A metric measuring how quickly the visual content of a page is displayed (computed by Lighthouse). Lower is better. Perceptual Speed Index is a variant weighted by human perception.

**SSL (Secure Sockets Layer)**
: The predecessor to TLS. Modern browsers require TLS. Both provide encrypted HTTP connections (HTTPS).

**Synthetic monitoring**
: Measuring performance in a controlled, lab environment (e.g., Lighthouse, WebPageTest). Repeatable and comparable but does not reflect real user conditions.

---

### T

**TCP (Transmission Control Protocol)**
: A reliable, connection-oriented transport protocol. Requires a 3-way handshake (SYN, SYN-ACK, ACK) costing 1 RTT. Uses slow start to ramp up throughput.

**TCP handshake**
: The 3-step process to establish a TCP connection: Client sends SYN → Server replies SYN-ACK → Client sends ACK.

**TCP slow start**
: A congestion control algorithm that gradually increases the amount of data sent until network capacity is found. Begins with a congestion window (CWND) of ~14KB.

**TLS (Transport Layer Security)**
: The cryptographic protocol that secures HTTPS traffic. TLS 1.3 requires 1 RTT for the handshake (down from 2 RTT in TLS 1.2).

**TTFB (Time to First Byte)**
: The time from the request being made to the first byte of the response being received. Includes DNS, TCP, TLS, and server processing time. Target: ≤ **800ms**.

**TTI (Time to Interactive)**
: The time when the page is fully interactive (visible content rendered, main thread idle enough to handle user input). Target: ≤ **3.8s** on mobile.

**Tree shaking**
: A dead-code elimination technique used by bundlers (Webpack, Rollup) to remove unused exports from JavaScript bundles. Reduces bundle size.

---

### W

**Web performance**
: The objective measurements and perceived user experience of a site's load time, runtime, responsiveness, and smoothness. Encompasses metrics, APIs, tools, and best practices.

---

### Metric Thresholds Summary

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| **LCP** | ≤ 2.5s | 2.5s - 4.0s | > 4.0s |
| **INP** | ≤ 200ms | 200ms - 500ms | > 500ms |
| **CLS** | ≤ 0.1 | 0.1 - 0.25 | > 0.25 |
| **FCP** | ≤ 1.8s | 1.8s - 3.0s | > 3.0s |
| **TTFB** | ≤ 800ms | 800ms - 1.8s | > 1.8s |
| **TTI** | ≤ 3.8s | 3.8s - 7.3s | > 7.3s |
