# 03 — Critical Rendering Path (CRP)

## Why

The CRP is the sequence the browser uses to convert HTML, CSS, and JavaScript into pixels. Optimizing it directly reduces time to first render, improves LCP, and prevents jank during interactions and animations.

## What

### The Five Stages

```
HTML ──► DOM ──┐
               ├──► Render Tree ──► Layout ──► Paint ──► Composite
CSS  ──► CSSOM ┘
```

### 1. DOM (Document Object Model)

- Constructed incrementally as HTML is parsed
- Each `startTag`/`endTag` pair creates a node
- Greater node count → longer subsequent stages
- JavaScript can modify DOM at any time (triggering reflows)

### 2. CSSOM (CSS Object Model)

- Constructed from CSS rules
- **Render-blocking**: page won't render until CSSOM is complete (because rules cascade and later rules override earlier ones)
- Selector specificity has negligible performance impact (microseconds) — don't obsess
- Media queries can make CSS non-blocking: `<link rel="stylesheet" href="print.css" media="print">`

### 3. Render Tree

- DOM + CSSOM combined
- Only includes **visible** content (no `<head>`, no `display: none`)
- `visibility: hidden` elements ARE included (they take up space)
- `opacity: 0` elements ARE included (they don't trigger visibility optimization)

### 4. Layout (Reflow)

- Calculates geometry: width, height, position of every element
- Triggers on:
  - DOM mutations (add/remove elements, change content)
  - Style changes affecting geometry (width, height, margin, padding, border, font-size, top, left)
  - Window resize / device orientation change
  - Scroll position changes
- **Expensive**: every layout-affected element must be recalculated

### 5. Paint (Rasterization)

- Converts each node to pixels
- Split into layers for independent painting
- Final step: compositing layers on the GPU

### Layer Creation

Browsers automatically promote elements to their own compositor layer when:
- They have `will-change: transform` (or `opacity`)
- They have CSS 3D transforms (`translateZ(0)`, `translate3d()`)
- They use `<video>`, `<canvas>`, or WebGL
- They are animating `transform` or `opacity`

Layers are **good for animation performance** but **cost memory** — don't overuse.

## How

### CRP Optimization Checklist

```
Priority 1: Critical Resources
  └─ Minimize number of critical resources
  └─ Defer non-critical resources (async/defer/lazy)
  └─ Inline critical CSS (< 14KB)
  └─ Eliminate unnecessary resources

Priority 2: Critical Path Length
  └─ Reduce number of round trips
  └─ Use preload for late-discovered critical resources
  └─ Optimize resource order (critical first)

Priority 3: Resource Size
  └─ Minify HTML, CSS, JS
  └─ Compress with Brotli (preferred) or gzip
  └─ Remove unused CSS/JS (tree shaking, coverage tools)
```

### Critical CSS Inlining

```html
<head>
  <!-- Inline critical styles directly in <head> -->
  <style>
    /* All styles needed for above-the-fold content */
    .hero { display: flex; ... }
  </style>
  <!-- Defer non-critical CSS -->
  <link rel="preload" href="/styles/full.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="/styles/full.css"></noscript>
</head>
```

### Avoiding Layout Thrashing

Bad pattern (forces synchronous layout):
```javascript
// DON'T — interleaving reads and writes forces reflow each time
el1.style.width = `${el2.offsetWidth}px`;
el3.style.height = `${el4.offsetHeight}px`;
```

Good pattern (batch reads, then writes):
```javascript
// DO — batch reads first, then writes
const w = el2.offsetWidth;
const h = el4.offsetHeight;
el1.style.width = `${w}px`;
el3.style.height = `${h}px`;
```

### CRP-Aware Resource Loading

```
<head>
  └─ Critical CSS (inline or <link>)
  └─ <link rel="preload"> for hero images, fonts
  └─ <script defer>...</script> or <script async>...</script>
<body>
  └─ DOM content
  └─ <img> with loading="lazy" for below-fold images
  └─ Non-critical scripts at end of <body>
```

## What to Avoid

- ❌ **`@import` in CSS** — serializes loading instead of parallel `<link>` tags
- ❌ **Sync `<script>` in `<head>`** — blocks parser and rendering
- ❌ **Forcing layout with `offsetWidth`/`offsetHeight` between DOM writes** — layout thrashing
- ❌ **Animating `width`, `height`, `left`, `top`, `margin`, `padding`** — triggers layout every frame
- ❌ **`display: none` for off-screen elements** — still keeps nodes in DOM; use `content-visibility: auto` instead
- ❌ **`will-change: transform` on every element** — creates too many layers, exhausting GPU memory
- ❌ **Assuming `translateZ(0)` is a free performance boost** — it creates a layer; use only when animating

## Key References

- MDN: `guides/critical_rendering_path/index.md`
- MDN: `guides/how_browsers_work/index.md`
- https://csstriggers.com/ (which CSS properties trigger layout/paint/composite)
