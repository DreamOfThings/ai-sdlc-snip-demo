# Snip — Design Language

> Borrowed from the Lovable.dev visual system (look & feel only).
> This file is the single source of truth for styling; paste it into any future styling prompt.

---

## Color Tokens

| Token | Value | Usage |
|---|---|---|
| `--bg` | `#09090b` | Page background (near-black) |
| `--surface` | `rgba(255,255,255,0.04)` | Card and input backgrounds |
| `--surface-hi` | `rgba(255,255,255,0.07)` | Hover state for surface rows |
| `--border` | `rgba(255,255,255,0.09)` | All borders |
| `--text` | `#fafafa` | Primary text |
| `--muted` | `rgba(250,250,250,0.50)` | Subtitles, placeholders, secondary text |
| `--accent-a` | `#ff6b35` | Gradient start — coral-orange |
| `--accent-b` | `#f72585` | Gradient mid — vivid pink |
| `--accent-c` | `#9b5de5` | Gradient end — purple |
| `--gradient` | `linear-gradient(135deg, var(--accent-a), var(--accent-b), var(--accent-c))` | Button bg, hero text-fill |

## Hero Glow

A fixed, full-viewport overlay (`pointer-events: none`, `z-index: 0`) that sits behind the content layer. Creates the warm ambient light at the top of the page:

```css
background: radial-gradient(
  ellipse 90% 55% at 50% -5%,
  rgba(255, 107, 53, 0.20) 0%,
  rgba(247, 37, 133, 0.12) 45%,
  transparent 70%
);
```

## Typography

| Role | Size | Weight | Notes |
|---|---|---|---|
| Hero heading | `clamp(2.5rem, 6vw, 3.5rem)` | 700 | `letter-spacing: -0.04em`; gradient text-fill |
| Hero subtitle | `1.05rem` | 400 | `color: var(--muted)` |
| Card label | `0.8rem` | 600 | Uppercase, `letter-spacing: 0.08em`, muted |
| Table header | `0.75rem` | 600 | Uppercase, `letter-spacing: 0.06em`, muted |
| Table body | `0.875rem` | 400 | |
| Short code | `0.8rem` | 400 | Monospace, `color: var(--accent-a)` |

**Sans stack:** `'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
**Mono stack:** `'JetBrains Mono', 'Fira Code', ui-monospace, monospace`

## Spacing Scale (`0.25 rem × n`)

`--space-1` 0.25 · `--space-2` 0.5 · `--space-3` 0.75 · `--space-4` 1 · `--space-6` 1.5 · `--space-8` 2 · `--space-12` 3 · `--space-16` 4

## Border Radii

| Token | Value | Used on |
|---|---|---|
| `--radius-pill` | `9999px` | Form wrapper, submit button |
| `--radius-card` | `16px` | Content cards |
| `--radius-sm` | `10px` | Notice / alert strips |

## Shadows & Glow

| Token | Value |
|---|---|
| `--shadow-card` | `0 1px 3px rgba(0,0,0,0.5), 0 0 0 1px var(--border)` |
| `--shadow-glow` | `0 0 0 3px rgba(255,107,53,0.25), 0 0 28px rgba(255,107,53,0.10)` |

The `.chat-form` gains `--shadow-glow` on `:focus-within`.

---

## Snip Element Map

| Snip element | Design role | Key rules |
|---|---|---|
| `<h1>Snip</h1>` | Hero headline | Gradient text-fill, `-0.04em` tracking, fluid `clamp` size |
| `.hero-sub` | Hero subline | `var(--muted)`, normal weight |
| `.hero-glow` | Ambient backdrop | Fixed overlay, radial gradient, `pointer-events:none` |
| `.chat-form` | Chat-style pill input | `border-radius: var(--radius-pill)`, surface bg, focus glow |
| `.chat-input` | URL text field | Transparent bg, flex-grow, no outline |
| `.chat-btn` | Primary CTA | `background: var(--gradient)`, pill radius, `brightness()` on hover |
| `.notice.success` | Short-URL result strip | Green-tinted surface + border, monospace link |
| `.notice.error` | Inline error | Red-tinted surface + border |
| `.card` (links) | Content card below hero | `--surface` bg, `--radius-card`, `--shadow-card` |
| `.card-title` | Card label | Uppercase muted small caps |
| `th` | Table column headers | Uppercase, muted, `0.06em` tracking |
| `.code-link` | Short code cell | Monospace, `var(--accent-a)` |
| `.url-cell a` | Original URL cell | `var(--muted)`, ellipsis truncation |
