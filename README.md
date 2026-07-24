# Code2Svg

A free, browser-based **SVG toolkit**. Convert SVG markup into images, trace raster
images back into SVG, and inspect/optimize/recolor along the way. Everything runs
client-side in a `<canvas>` / `DOMParser` — nothing is ever uploaded to a server.

![Code2Svg](https://img.shields.io/badge/status-ready-6366f1)

<img width="1691" height="974" alt="Code2Svg screenshot" src="https://github.com/user-attachments/assets/56222d6f-c464-42fa-a162-23b47dc32385" />

**Live:** https://codetosvg.vercel.app

## Two tools

Code2Svg is a two-tool toolkit with a shared header, footer, and top navigation:

- **SVG → Image** (`/`) — paste/upload SVG and export it as PNG, JPG, WebP, raw SVG,
  or an animated GIF.
- **Image → SVG** (`/image-to-svg`) — upload a PNG/JPG and trace it into a scalable
  SVG in your browser.

## Features

### SVG → Image (`/`)

- **Live editor** — CodeMirror with XML syntax highlighting, a custom theme, and
  inline XML error highlighting (gutter marker + hover tooltip) as you type.
- **Export** — PNG, JPG, WebP, raw SVG, or an animated **GIF** (for animated SVGs).
- **Sizing** — scale presets (0.5×–4×, with an `@2x`/`@3x` filename suffix) or exact
  custom width/height with an aspect-ratio lock.
- **Quality slider** for JPG/WebP, optional **background color** (six presets + custom
  picker), and **auto-crop to content** (trims transparent *and* solid-color padding).
- **Estimated output file size**, updating live with format/scale/quality/trim.
- **Copy image (PNG)** to the clipboard, and **Copy** the SVG source.
- **Recolor** — detects fill/stroke/gradient colors and remaps them via a palette
  popover, updating live while you drag the picker.
- **Format** (non-destructive pretty-print) and **Optimize** (SVGO minify) with a
  per-plugin settings popover and a byte-savings readout.
- **Preview** — zoom (scroll/buttons), pan (drag), fit, fullscreen, rotate 90° L/R,
  flip H/V, and reset; rotate/flip carry through to the export. Grid / Light / Dark
  backdrops, a floating dimension chip, and a drop-shadow.
- **Output drawer** — view the SVG as **React**, **React Native**, or a **Data URI**,
  each with Copy; updates live as you edit.
- **Draggable divider** to resize the code vs. preview panes (double-click resets).

### Image → SVG (`/image-to-svg`)

- Upload or drag a PNG/JPG and trace it to a scalable SVG client-side
  (`imagetracerjs`); large images are downscaled first for speed.
- Adjustable **Number of colors / Detail / Smoothing** (each with a hover info
  tooltip), live retrace, a source thumbnail, and a live traced preview.
- Copy the SVG code or download the `.svg`. Best for logos, icons, and flat
  graphics — not photos.

### Conversion landing pages

Dedicated, search-friendly pages that open a tool pre-set to a conversion:
`/svg-to-png`, `/svg-to-jpg`, `/svg-to-webp`, and `/png-to-svg`. Each is its own
crawlable URL with tailored copy and FAQ, and interlinks the others.

### Shared / app-wide

- Light + dark themes with a segmented Dark/Light switch, remembered across visits
  and pages (`localStorage`).
- Identical glassmorphic header (logo, tool nav, theme toggle, "What's new"
  changelog) and footer (About / Terms / Privacy) on every page.
- Full SEO layer — per-page meta/OG/Twitter, JSON-LD, `og-image.png`, `robots.txt`,
  `sitemap.xml`, and static crawlable content on every page.

## Getting started

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # type-check (tsc -b) and build for production into dist/
npm run preview  # preview the production build
```

## How it works

**SVG → Image:** the markup is parsed to determine its intrinsic size (from
`width`/`height` or `viewBox`), serialized to a data URL, drawn onto a `<canvas>` at
the chosen scale, optionally trimmed and rotated/flipped, and encoded with
`canvas.toBlob()` in the target format. Exporting as SVG downloads the source markup
(wrapping it in a transform group if a rotate/flip is active). Animated SVGs are
recorded frame-by-frame into a GIF.

**Image → SVG:** the uploaded raster is decoded to pixel data on a `<canvas>`
(downscaled if large) and traced into vector paths with `imagetracerjs`, driven by
the color/detail/smoothing controls.

It's a multi-page Vite build — each tool and landing page is a real HTML entry (its
own crawlable URL), not a client-side router.

## Tech stack

React 18 · TypeScript · Vite 6 · CodeMirror · SVGO · imagetracerjs · gifenc

## License

MIT
