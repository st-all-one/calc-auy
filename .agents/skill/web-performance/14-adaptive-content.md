# Adaptive Content — Responsive Images, Network Information, Device Memory, Client Hints

## Why

Not all users have the same device capabilities — screen size, network speed, memory, and pixel density vary dramatically. Serving the same content to everyone wastes bytes on constrained devices and degrades the user experience. Adaptive content matches what you send to what the user can handle.

## What

### 1. Responsive Images

Serve different image files based on screen size, resolution, and format support:

```html
<!-- Resolution switching: same aspect ratio, different sizes -->
<img
  src="photo-800.jpg"
  srcset="
    photo-400.jpg 400w,
    photo-800.jpg 800w,
    photo-1200.jpg 1200w
  "
  sizes="(max-width: 600px) 100vw, 800px"
  alt="Description"
>

<!-- Art direction: different crops/aspect ratios -->
<picture>
  <source media="(max-width: 600px)" srcset="photo-mobile.jpg">
  <source media="(max-width: 1024px)" srcset="photo-tablet.jpg">
  <img src="photo-desktop.jpg" alt="Description">
</picture>

<!-- Format selection + resolution -->
<picture>
  <source type="image/avif" srcset="photo.avif">
  <source type="image/webp" srcset="photo.webp">
  <img src="photo.jpg" alt="Description">
</picture>
```

| Attribute | Purpose |
|-----------|---------|
| `srcset` | Lists image candidates with descriptors (`w` = width, `x` = pixel density) |
| `sizes` | Tells the browser how wide the image will be displayed (CSS-like media conditions) |
| `<picture>` + `<source>` | Art direction or format-based selection |
| `type` attribute | Format negotiation (AVIF → WebP → JPEG fallback) |

### 2. Network Information API

Query the user's connection quality and adapt behavior:

```js
const connection = navigator.connection;

// Observe changes
connection.addEventListener('change', () => {
  adjustContent(connection);
});

function adjustContent(conn) {
  // Effective type: 'slow-2g', '2g', '3g', '4g'
  switch (conn.effectiveType) {
    case 'slow-2g':
    case '2g':
      loadLowQuality();
      break;
    case '3g':
      loadMediumQuality();
      break;
    case '4g':
      loadHighQuality();
      break;
  }
}

// Initial values
console.log({
  type: connection.type,        // 'wifi', 'cellular', 'ethernet', etc.
  effectiveType: connection.effectiveType,
  downlink: connection.downlink,  // Mbps
  rtt: connection.rtt             // ms
});
```

**Use cases**:
- Load lower-resolution images on slow connections
- Defer non-critical JavaScript bundles on 2G/3G
- Reduce video quality or initial bitrate
- Skip analytics or tracking scripts on constrained networks
- Disable autoplay videos or heavy animations

### 3. Navigator.deviceMemory

Approximate device memory (RAM) in gigabytes:

```js
const memoryGB = navigator.deviceMemory; // 0.25, 0.5, 1, 2, 4, 8
```

**Use cases**:
- Disable memory-intensive features on low-RAM devices (< 2GB)
- Reduce worker thread count
- Choose image quality tier
- Limit DOM size or in-memory cache

**Combine with Network Information**:

```js
function isLowPerformingDevice() {
  const mem = navigator.deviceMemory || 8;
  const conn = navigator.connection || {};
  return mem <= 2 || conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g';
}
```

### 4. Client Hints

HTTP Client Hints allow servers to request device characteristics proactively, avoiding the need for JS detection:

```http
# Server asks for hints via Accept-CH header
Accept-CH: DPR, Width, Viewport-Width, Downlink, ECT, RTT, Device-Memory, Sec-CH-UA, Sec-CH-UA-Mobile

# Client includes hints in subsequent requests
GET /image.jpg HTTP/1.1
DPR: 2.0
Width: 800
Viewport-Width: 412
Downlink: 1.5
ECT: 3g
RTT: 150
Device-Memory: 4
```

```html
<!-- HTML equivalent: meta tag for Content Negotiation -->
<meta http-equiv="Accept-CH" content="DPR, Width, Viewport-Width, Downlink, ECT">
```

| Hint | Description |
|------|-------------|
| `DPR` | Device pixel ratio (1, 2, 3) |
| `Width` | Resource width desired (in CSS px) |
| `Viewport-Width` | Viewport width (CSS px) |
| `Downlink` | Effective bandwidth (Mbps) |
| `ECT` | Effective connection type (`slow-2g`, `2g`, `3g`, `4g`) |
| `RTT` | Round-trip time (ms) |
| `Device-Memory` | Approximate device RAM (GB) |
| `Sec-CH-UA` | Browser brand/version |
| `Sec-CH-UA-Mobile` | Whether the device is mobile |

**Server-side image selection with Client Hints**:

```js
// Express-like server example
app.get('/image.jpg', (req, res) => {
  const dpr = req.headers['dpr'] || 1;
  const width = req.headers['width'] || 1200;
  const ect = req.headers['ect'] || '4g';

  // Choose image based on hints
  const quality = ect === '4g' ? 80 : ect === '3g' ? 50 : 20;
  const resizedWidth = Math.min(width * dpr, 2000);
  const image = optimizeImage(req.params, resizedWidth, quality);

  res.setHeader('Vary', 'DPR, Width, ECT');
  res.send(image);
});
```

## How

### Image Loading Decision Tree

```
1. Is the image the LCP hero element?
   → YES: <link rel="preload">, fetchpriority="high", no lazy loading
   → NO:  Continue

2. Can you use modern formats?
   → Use <picture> with AVIF + WebP + JPEG fallback

3. Is the viewport width variable?
   → Use srcset with 'w' descriptors + sizes

4. Is the image below the fold?
   → Add loading="lazy"

5. Do you need art direction?
   → Use <picture> with <source media="...">
```

### Adaptive Loading Pattern

```html
<!-- Adaptive hero image using Client Hints + picture -->
<picture>
  <source
    type="image/avif"
    srcset="/img/hero.avif"
    media="(min-width: 1024px)"
  >
  <source
    type="image/webp"
    srcset="/img/hero-800.webp 800w, /img/hero-1200.webp 1200w"
    sizes="(max-width: 600px) 100vw, 800px"
  >
  <img
    src="/img/hero-800.jpg"
    srcset="/img/hero-400.jpg 400w, /img/hero-800.jpg 800w"
    sizes="(max-width: 600px) 100vw, 800px"
    loading="eager"
    fetchpriority="high"
    alt="Hero image"
    width="1200"
    height="600"
  >
</picture>

<script>
  // JS-based adaptive logic for non-image resources
  if ('connection' in navigator) {
    const conn = navigator.connection;
    if (conn.effectiveType === '4g' && navigator.deviceMemory >= 4) {
      loadHighQualityApp();
    } else {
      loadStandardApp();
    }
  }
</script>
```

## What to Avoid

- **Loading all image sizes** — let the browser choose via `srcset`/`sizes`
- **Ignoring `sizes` attribute** — without it, the browser assumes `100vw`, often leading to oversized image downloads
- **Serving 4K images to mobile users** — use responsive breakpoints
- **Relying only on User-Agent** — Client Hints and Network Information are more reliable
- **Not providing format fallbacks** — always include JPEG as last `<source>` or `src` fallback
- **Missing `width` and `height` on images** — causes CLS
- **Assuming all users have 4G and 8GB RAM** — test and adapt for constrained devices
