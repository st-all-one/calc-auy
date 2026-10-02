# Startup Performance Optimization

## Why

Startup performance is often the highest-value optimization. Users judge an app within 1-2 seconds. Blocking the main thread during startup makes the app appear frozen, leading to abandonment or uninstallation.

## What

Startup is not just about loading **quickly** — it is about loading **asynchronously**. The guiding principle: keep the main thread free for user interaction and rendering by offloading work to background threads.

### Core Metrics

| Threshold | Perception |
|-----------|------------|
| ≤50ms | Unnoticed by user |
| 50-200ms | Perceived as sluggish |
| ≥200ms | Perceived as lag/freeze |
| 1-2s to first content | Perceived as fast |
| 3-4s to first content | Noticeable wait |
| 5s+ on 3G | Target max for TTI |
| 7-8s+ | Users abandon |

## How

### 1. Web Workers for Background Processing

Move data fetching, parsing, and computation to Web Workers. Workers run on a separate thread and cannot access the DOM, but can communicate via `postMessage()`.

```js
// main.js
const worker = new Worker('data-worker.js');
worker.postMessage({ url: '/api/data' });
worker.onmessage = (e) => {
  // worker returned processed data — update UI
  render(e.data);
};

// data-worker.js
self.onmessage = async (e) => {
  const resp = await fetch(e.data.url);
  const data = await resp.json();
  const processed = expensiveTransform(data);
  self.postMessage(processed);
};
```

Workers are ideal for:
- Decoding asset files (JPEG → raw texture data for WebGL)
- Data processing and transformation
- Fetch and cache preparation
- Any pure-computation startup work

**Limitation**: Workers cannot access DOM, WebGL, or most `window` properties.

### 2. Async Script Loading

Use `defer` and `async` to prevent parser blocking:

```html
<!-- Async: download in parallel, execute as soon as downloaded (out of order) -->
<script src="analytics.js" async></script>

<!-- Defer: download in parallel, execute in order after HTML parsing -->
<script src="app.js" defer></script>
<script src="vendor.js" defer></script>
```

| Attribute | Order Preserved | Execute After |
|-----------|----------------|---------------|
| (none) | Yes | Immediately (blocks parser) |
| `async` | No | As soon as downloaded |
| `defer` | Yes | HTML parsing complete |

### 3. Code Splitting

Split JavaScript, CSS, and HTML into smaller chunks. Send only what is needed for the initial render.

**Entry-point splitting**: separate code by app entry points (routes/pages):

```js
// bundler config (webpack example)
module.exports = {
  entry: {
    home: './src/home.js',
    cart: './src/cart.js',
    checkout: './src/checkout.js'
  }
};
```

**Dynamic splitting**: use `import()` to load chunks on demand:

```js
button.addEventListener('click', async () => {
  const module = await import('./heavy-component.js');
  module.init();
});
```

```html
<script type="module">
  // type="module" scripts are deferred by default
  import { init } from './app.js';
  init();
</script>
```

### 4. Exclude Non-Critical Resources

Do not include scripts or stylesheets that do not participate in the Critical Rendering Path in the startup HTML. Load them only when needed via dynamic import or late `<link>` injection.

### 5. Use Browser Built-in Decoders

When decoding image or media data (e.g., JPEG → texture), use the browser's native decoders. They are:
- Significantly faster than JavaScript-based decoders
- Often parallelized automatically by the browser
- Reduce application bundle size

```js
// Good: browser decodes natively
const img = new Image();
img.src = 'photo.jpg';
await img.decode();
// Use with WebGL or Canvas

// Avoid: custom JS-based decoder bundled in app
```

### 6. Parallelize Data Processing

Process independent data chunks concurrently, not sequentially. Use `Promise.all()` or Web Workers for parallel work:

```js
// Sequential (slow)
const a = await process(dataA);
const b = await process(dataB);

// Parallel (fast)
const [a, b] = await Promise.all([process(dataA), process(dataB)]);
```

### 7. Compress and Minify

- Minify JavaScript, CSS, and HTML before serving
- Use Brotli compression (preferred) or Gzip at the server level
- Smaller files download and parse faster

```http
# Server response header
Content-Encoding: br
```

### 8. Resource Hints for Startup

Use `preconnect` and `preload` for critical startup resources:

```html
<link rel="preconnect" href="https://api.example.com">
<link rel="preload" href="critical.css" as="style">
<link rel="preload" href="hero.webp" as="image">
```

### 9. Porting Native Apps (Emscripten)

Apps ported from native platforms (C/C++ via Emscripten) often have a monolithic startup loop. Refactor into small chunks:

```js
// Emscripten API for breaking up startup
emscripten_push_main_loop_blocker(function() {
  // one chunk of startup work
}, 'init step 1');

emscripten_push_main_loop_blocker(function() {
  // next chunk
}, 'init step 2');
```

This allows the main thread to handle user input between chunks.

### 10. Perceived Performance During Startup

- Display a mock splash screen or skeleton UI
- Show progress indicators for heavy loads
- Prioritize above-fold content first; defer below-fold loading
- Use `content-visibility: auto` for off-screen sections

## What to Avoid

- **Blocking the main thread** with a single monolithic startup handler
- **Including all app code** in the initial bundle — use code splitting
- **Custom decoders** when browser-native decoders are available
- **Sequential processing** of independent data chunks
- **Missing resource hints** for critical startup assets
- **No compression** — gzip/Brotli should always be enabled
- **Forcing users to wait** without progress feedback
