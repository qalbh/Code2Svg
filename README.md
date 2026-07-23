# Code2Svg

A web-based SVG → image converter. Paste or upload SVG code, preview it live, and
download it as a **PNG**, **JPG**, **WebP**, or raw **SVG** file. Everything runs
in the browser — no code is ever uploaded to a server.

![Code2Svg](https://img.shields.io/badge/status-ready-6366f1)

## Features

- **Live editor** — syntax-highlighted SVG editing (CodeMirror) with instant preview.
- **Export to raster** — render to PNG, JPG, or WebP at up to 4× scale.
- **Quality control** — adjustable compression for JPG/WebP.
- **Background** — optional solid background color (JPG defaults to white since it
  has no transparency).
- **Preview backdrops** — checkerboard, light, or dark to check transparency.
- **Upload / copy** — load a `.svg` file from disk or copy the code back out.
- **100% client-side** — conversion happens in a `<canvas>`, nothing leaves your browser.

## Getting started

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # type-check and build for production into dist/
npm run preview  # preview the production build
```

## How it works

The SVG markup is parsed to determine its intrinsic size (from `width`/`height` or
`viewBox`), serialized to a data URL, drawn onto a `<canvas>` at the chosen scale,
and encoded with `canvas.toBlob()` in the target format. The resulting blob is
offered as a download. Exporting as SVG simply downloads the source markup.

## Tech stack

React · TypeScript · Vite · CodeMirror

## License

MIT
