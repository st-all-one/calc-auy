# 05 — Rendering and Animation Performance

## Why

Animations and visual transitions are critical for perceived performance and user delight. But poorly implemented animations cause jank (dropped frames), making the app feel sluggish and unresponsive. Users expect 60fps smoothness.

## What

### The Rendering Waterfall (Per Frame)

```
[Frame Start — 16.7ms budget]
     ↓
[JavaScript]             ← requestAnimationFrame, event handlers
     ↓
[Recalculate Style]      ← CSS property changes cascade
     ↓
[Layout (Reflow)]        ← Geometry calculation (IF properties affect layout)
     ↓
[Paint (Rasterize)]      ← Pixel filling (IF not compositor-only)
     ↓
[Composite]              ← Layer composition on GPU
     ↓
[Frame End]
```

### Property Cost Classification

| Class | Properties | Cost | Triggers |
|-------|-----------|------|----------|
| **Layout-triggering** | `width`, `height`, `left`, `top`, `margin`, `padding`, `border-width`, `font-size`, `display`, `position` | ❌ Highest | Style + Layout + Paint + Composite |
| **Paint-triggering** | `color`, `background-color`, `box-shadow`, `border-radius`, `outline`, `text-decoration` | ⚠️ Medium | Style + Paint + Composite |
| **Compositor-only** | `transform`, `opacity` | ✅ Lowest | Style + Composite only (GPU) |

### CSS Animations vs JavaScript Animations

| Aspect | CSS Animations/Transitions | JS (`requestAnimationFrame`) |
|--------|---------------------------|------------------------------|
| Syntax | Declarative (CSS only) | Imperative (JS) |
| Browser optimization | Can be offloaded to compositor thread | Runs on main thread |
| Frame pacing | Browser-controlled (smooth) | Developer-controlled |
| Pause on background | Yes (auto) | Yes (with rAF) |
| Complex sequences | Hard (needs keyframes) | Easy (full control) |
| Performance | **Better** for simple `transform`/`opacity` animations | Better for complex, state-driven animation |

### Off-Main-Thread Animation (OMTA)

When animating `transform` or `opacity`, modern browsers can run the animation entirely on the compositor thread. This means:

- **No main thread contention** — smooth even during JS execution
- **No layout invalidation** — the element is a composited layer
- **GPU-accelerated** — uses GPU for scaling/rotation/translation

This happens **automatically** for CSS animations of `transform`/`opacity` on elements that are composited layers.

## How

### Animation Decision Framework

```
Do you need to animate?
│
├─ Simple state transition (hover, focus, toggle)?
│   └─ Use CSS transitions
│       e.g., transition: transform 200ms ease;
│
├─ Keyframed animation (loop, multi-step)?
│   └─ Use CSS @keyframes
│       e.g., @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } }
│
├─ Complex, state-driven, physics-based?
│   └─ Use requestAnimationFrame + JS
│       e.g., drag-and-drop with spring physics, canvas/WebGL animations
│
└─ Scroll-driven animation?
    └─ Use Scroll-Driven Animations (modern) or IntersectionObserver
        e.g., animation-timeline: scroll()
```

### Performance-First Animation Rules

```css
/* DO: Animate compositor-only properties */
.element {
  transition: transform 200ms ease, opacity 200ms ease;
}

/* DO: Promote to layer if animating (but only when needed) */
.element {
  will-change: transform;  /* Only set this on elements you WILL animate */
}

/* DON'T: Animate layout-triggering properties */
/* .element { transition: width 200ms, height 200ms, left 200ms; } */
```

```javascript
// DO: Use requestAnimationFrame for JS animations
function animate(timestamp) {
  element.style.transform = `translateX(${Math.sin(timestamp / 1000) * 100}px)`;
  if (shouldContinue) requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

// DON'T: Use setInterval/setTimeout for animations
// setInterval(() => { element.style.left = `${x++}px`; }, 16);
```

### Ensuring Smooth 60fps

```
Per-frame budget: 16.7ms
├── JavaScript:           < 5ms  (leave room for browser work)
├── Style + Layout:       < 3ms
├── Paint + Composite:    < 5ms
└── Browser overhead:     ~3-4ms
```

Checklist for smooth animations:
1. **Animate only `transform` and `opacity`** — no layout/repaint
2. **Ensure the element is composited** — test in DevTools (Layers panel)
3. **Avoid creating hundreds of animated elements** — each composited layer costs GPU memory
4. **Use `content-visibility: auto`** for off-screen sections to skip rendering
5. **Keep animated element count reasonable** — benchmark with your target devices
6. **Avoid heavy paint effects on animated elements** — no `box-shadow` blur, no `backdrop-filter`
7. **Use GPU profiling** — check for GPU memory pressure

## What to Avoid

- ❌ **`setTimeout`/`setInterval` for animations** — no frame synchronization, runs regardless of visibility
- ❌ **Animating `top`/`left`** — forces layout per frame (use `transform: translate()`)
- ❌ **`translateZ(0)` on every element** ("GPU boost hack") — creates unnecessary layers; modern browsers handle this
- ❌ **Heavy `box-shadow` or `filter` on animated elements** — expensive repaint
- ❌ **Animating too many elements simultaneously** — 50+ composited layers can cause GPU memory pressure on mobile
- ❌ **Forgetting `will-change` is a hint, not a directive** — the browser may ignore it; measure
- ❌ **Using JS animation libraries when CSS would suffice** — CSS animations are more efficient for simple transitions
- ❌ **Assuming `opacity: 0` + animation is free** — the element still paints if not promoted to layer

## Key References

- MDN: `guides/css_javascript_animation_performance/index.md`
- MDN: `guides/animation_performance_and_frame_rate/index.md`
- https://csstriggers.com/
