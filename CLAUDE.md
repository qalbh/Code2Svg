# CLAUDE.md

Guidance for Claude Code (and other AI assistants) when working in this repository.

## Project

**Code2Svg** — a browser-based SVG → image converter and inspector. Users paste or
upload SVG markup, preview it live (with zoom/pan, rotate/flip, and background
backdrops), and export it as **PNG**, **JPG**, **WebP**, raw **SVG**, or an
animated **GIF**. A bottom "Output" drawer also shows the SVG as **React**,
**React Native**, or a **Data URI**. An **Optimize** button runs SVGO minification
alongside the non-destructive **Format** (pretty-print) button. The footer links to
in-app **About**, **Terms & Conditions**, and **Privacy Policy** pages. All
processing happens client-side in a `<canvas>` / `DOMParser`; nothing is ever
uploaded to a server.

## Tech stack

- **React 18** + **TypeScript** (function components + hooks only)
- **Vite 6** for dev server and build
- **CodeMirror** (`@uiw/react-codemirror`, `@codemirror/lang-xml`,
  `@codemirror/lint`, `@uiw/codemirror-themes`, `@lezer/highlight`) — the SVG
  editor, its inline XML linter, and the read-only syntax-highlighted output
  drawer. Syntax colors come from a custom theme in `editorTheme.ts`, not a
  stock CodeMirror theme package.
- **Space Grotesk** (UI) + **JetBrains Mono** (code/numeric text), loaded via
  `<link>` tags in `index.html` — see `--font-ui`/`--font-mono` in `index.css`.
- **gifenc** — encoder dependency used for animated-GIF export
- **svgo** — SVG minification for the Optimize button. Imported from **`svgo/browser`**
  (not the package's default `.` entry), which is a pure-browser build with no Node
  built-ins (`fs`, `path`, etc.) — importing the default entry breaks the Vite bundle.
- No backend, no router, no state library — plain React `useState`/`useEffect`

## Commands

```bash
npm install      # install dependencies
npm run dev      # dev server at http://localhost:5173
npm run build    # type-check (tsc -b) then production build into dist/
npm run preview  # serve the production build locally
npm run lint     # ESLint — currently NON-FUNCTIONAL (no eslint.config.js present)
```

**`npm run build` is the gate — always run it before committing.** It type-checks
under strict mode and must pass. `npm run lint` currently fails because the repo
has no `eslint.config.js` (ESLint 9 flat-config); don't rely on it, and don't
treat its failure as your change breaking something.

## Project structure

The app is a **multi-page** Vite build (two real HTML entries, NOT a client-side
router) so each tool is its own crawlable URL:

- `/` (`index.html` → `main.tsx` → `App.tsx`) — the SVG → Image tool.
- `/image-to-svg` (`image-to-svg.html` → `main-image.tsx` → `ImageToSvg.tsx`) —
  the Image → SVG (raster tracing) tool. The clean URL comes from `cleanUrls: true`
  in `vercel.json`; in dev it's served at `/image-to-svg.html`.

Both entries are declared in `vite.config.ts` under `build.rollupOptions.input`.
Each HTML file carries its own SEO `<title>`/`<meta description>` and the inline
theme-bootstrap script — keep those in sync if you touch one.

```
index.html            # Vite entry (SVG→Image); mounts #root, sets initial theme before paint
image-to-svg.html     # Vite entry (Image→SVG); same structure + its own SEO <head>
vercel.json           # Vercel: framework=vite, output=dist, cleanUrls=true
vite.config.ts        # @vitejs/plugin-react + rollupOptions.input (both html entries)
public/favicon.svg    # app icon
src/
  main.tsx            # React root for App (StrictMode)
  main-image.tsx      # React root for ImageToSvg (StrictMode)
  App.tsx             # ~1250 lines: the ENTIRE SVG→Image UI + all its React state
  ImageToSvg.tsx      # the Image→SVG page: upload/trace UI + state (logic in imageToSvg.ts)
  NavBar.tsx          # shared top nav + logo + Dark/Light toggle + useTheme() hook (both pages)
  Icon.tsx            # shared inline-SVG Icon component + ICON_PATHS (used by both pages)
  svgToImage.ts       # raster/SVG export, dimensions, colors, prettify, XML errors
  svgToGif.ts         # animated SVG → GIF encoding
  svgToCode.ts        # SVG → React / React Native / Data URI code generation
  optimizeSvg.ts      # SVGO minification: options, plugin metadata, optimizeSvg()
  imageToSvg.ts       # raster → SVG tracing (imagetracerjs): fileToImageData + traceImageData
  infoPages.ts        # static copy for the About / Terms / Privacy footer modals
  editorTheme.ts      # custom CodeMirror theme (dark + light) matching index.css tokens
  changelog.ts        # in-app "What's new" changelog data (see workflow below)
  index.css           # all styling (CSS variables, light + dark themes)
  gifenc.d.ts         # local type declarations for gifenc (no bundled types)
  imagetracerjs.d.ts  # local type declarations for imagetracerjs (no bundled types)
  vite-env.d.ts
```

## Architecture

Keep the separation: **`App.tsx` owns UI and state; the `svgTo*.ts` modules are
pure, DOM-free-where-possible logic.** Rendering/encoding/parsing/transform logic
belongs in a `svgTo*` module, not inline in the component. The modules use browser
APIs (`DOMParser`, `canvas`, `Image`, `btoa`/`TextEncoder`) but hold no React state.

- **`svgToImage.ts`** — the core exporter. `renderToBlob(code, options)` parses,
  draws to canvas, applies trim / background / rotate+flip transforms, and encodes.
  Also exports helpers used across the app: `getSvgDimensions`, `findXmlError`
  (inline editor linting), `findColors` / `replaceColor` / `normalizeColorToHex`
  (recolor), `prettifySvg` (Format button), `formatFileSize`.
- **`svgToGif.ts`** — `hasAnimation(code)` detects SMIL/CSS animation;
  `renderToGif(code, options)` records frames and encodes a GIF.
- **`svgToCode.ts`** — `toDataUri`, `toReact`, `toReactNative`. Pure string
  generation via `DOMParser`.
- **`optimizeSvg.ts`** — `optimizeSvg(code, options)` runs SVGO's `preset-default`
  with per-plugin overrides, `multipass: true`, and `js2svg` pretty-printing. Also
  exports `DEFAULT_OPTIMIZE_OPTIONS` and `PLUGIN_GROUPS` (labels/hints/grouping for
  the settings popover) — all SVGO-specific knowledge lives here, not in `App.tsx`.
- **`infoPages.ts`** — static `INFO_PAGES` array (id/label/title/sections) rendered
  by a single generic modal in `App.tsx`, keyed off `infoPageId` state.
- **`editorTheme.ts`** — `code2svgDarkTheme` / `code2svgLightTheme`, built with
  `@uiw/codemirror-themes`'s `createTheme` + `@lezer/highlight` tags
  (`tagName`/`attributeName`/`attributeValue`/`angleBracket`/`blockComment`).
  Passed as the `theme` prop to both `CodeMirror` instances in `App.tsx` (the
  main editor and the read-only output-drawer editor) — keep both in sync if you
  change one.

## How image conversion works (`svgToImage.ts`)

1. `parseSvg` — parses with `DOMParser`, throws on invalid XML or a missing `<svg>`.
2. `intrinsicSize` — dimensions from `width`/`height`, falling back to `viewBox`,
   then to 512×512.
3. `renderToBlob` — serializes to a data URL, draws onto a `<canvas>` at the chosen
   scale/size, optionally trims and applies rotate/flip, then `canvas.toBlob()`.
   Returns `{ blob, width, height }` (the actual output size).
   - `format: 'svg'` short-circuits to the raw markup — UNLESS a rotate/flip
     transform is active, in which case it wraps the original in an outer `<svg>`
     with a matching group transform so the vector export carries the transform.
   - **JPEG has no alpha** — a background is always applied (white by default) to
     avoid a black fill. Preserve this.
   - Rotation of 90°/270° swaps the output width/height.

## Non-obvious behaviors — preserve these

These were each found the hard way (often via decode-and-verify testing). Don't
"simplify" them away without understanding why they exist.

- **Object URLs:** always pair `URL.createObjectURL` with `revokeObjectURL`. The
  preview URL is created and revoked inside a single `useEffect` so StrictMode's
  double-invoke doesn't leave a revoked URL in use — don't move it back to `useMemo`.
- **GIF frame capture:** `canvas.drawImage()` of an animated SVG `<img>` captures
  the INITIAL frame, not the live timeline. `svgToGif.ts` works around this by
  rewriting each frame's animations to start at `-t` (SMIL `begin="-ts"`, CSS
  `animation-delay:-ts` + paused) so the image's initial frame *is* the state at
  time `t`. Do not "revert" to real-time sampling — it silently produces frozen GIFs.
- **Preview wheel-zoom:** the wheel listener is attached natively with
  `{ passive: false }` (not React `onWheel`), because React binds wheel handlers
  passive and silently drops `preventDefault()`.
- **Recolor swatches:** the color `<input>` is uncontrolled and listens to native
  `input`/`change` via a ref, keyed by position not value. A controlled input keyed
  by color value remounts mid-drag and closes the native picker.
- **Preview toolbar wraps, not scrolls:** `overflow-x: auto` would force the cross
  axis to `auto` too and clip the palette popover; `flex-wrap` avoids hiding
  controls and clipping.
- **Rotate/flip carry through to the export**, not just the preview — the same
  transform is applied in `renderToBlob` (canvas for raster, group-wrapper for SVG).
- **SVGO preset-default plugin membership:** only some plugins are actually part of
  `preset-default` (verify against the installed version's `plugins/preset-default.js`
  before assuming). Passing a `preset-default` override for a plugin that isn't a
  member (e.g. `removeViewBox`, `removeDimensions`, `removeTitle` in this SVGO
  version) doesn't error — it silently logs a console warning and is ignored.
  `optimizeSvg.ts` splits toggles into `PRESET_PLUGINS` (passed via `overrides`) and
  `STANDALONE_PLUGINS` (added as their own `plugins` array entries, only when
  enabled). Keep this split in sync if SVGO is upgraded.
- **`removeViewBox` defaults off:** the app relies on `viewBox` for scaling in the
  preview and raster export sizing — never flip its default to enabled.
- **Selected/active states use `color-mix()`**, not a hardcoded rgba: e.g.
  `.seg-btn.active`/`.icon-btn.active`/`.output-tab.active` use
  `color-mix(in srgb, var(--accent) 16%, transparent)` so the tinted look tracks
  `--accent` automatically in both themes. This assumes a `color-mix()`-capable
  browser (all current evergreen browsers) — there's no fallback.
- **`Icon` (in `App.tsx`) supports `filled`/`color` props** for the handful of
  icons that aren't plain `currentColor` strokes (the filled bolt/star icons, the
  themed sun/moon). Don't add a new stroke-only icon without checking whether it
  actually needs `filled`.

## Conventions

- TypeScript strict mode is on (`noUnusedLocals`, `noUnusedParameters`) — no unused
  variables or dead code. Wire new state/handlers into JSX before building.
- **No semicolons; single quotes; 2-space indent** (match existing files).
- Keep it dependency-light. Prefer platform APIs (`DOMParser`, `canvas`, `Blob`,
  `URL.createObjectURL`, `TextEncoder`/`btoa`) over new libraries. New dependencies
  are a deliberate, justified decision — only `gifenc` (GIF encoding), `svgo`
  (Optimize/minify), and `imagetracerjs` (raster → SVG tracing) have been added.
- Reuse existing patterns: the clipboard-copy + `setStatus` message pattern, the
  segmented-control (`.seg`/`.seg-btn`) and icon-button (`.icon-btn`) styles, the
  `.modal-overlay`/`.modal` structure (changelog, About/Terms/Privacy all share it),
  and localStorage-persisted settings (theme, Optimize plugin options).
- All styling lives in `src/index.css` using the CSS variables in `:root` (and the
  `:root[data-theme='light']` overrides). No CSS-in-JS or utility framework. The
  app supports light + dark themes — style both.

## Feature workflow (follow this for each shipped feature)

The project keeps an in-app changelog and semver. When you finish a user-facing
feature:

1. Bump `version` in `package.json` (minor for features, patch for fixes).
2. Prepend an entry to `CHANGELOG` in `src/changelog.ts` (newest first) with the
   matching version, date, and a short user-facing bullet.
3. Run `npm run build` (must pass).
4. Commit with a descriptive message and push to `main` (auto-deploys — see below).

## Verifying UI changes

There is no unit-test suite. UI/behavior changes are validated by driving the dev
server with Playwright (headless Chromium is cached locally) and, crucially,
**verifying the actual output** — e.g. decode an exported PNG/GIF and check pixels,
or read a Copy button's clipboard text — rather than trusting that something
"rendered" or "downloaded." Several bugs here passed every surface check while
being wrong (frozen GIFs, transform-less exports).

## Deployment

Vercel is connected to the GitHub repo and auto-deploys on push to `main`
(`framework: vite`, build `npm run build`, output `dist/`). The app is fully
client-side — no environment variables or backend to configure.
