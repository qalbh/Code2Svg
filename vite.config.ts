import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Production origin — defined once. Change this (and public/robots.txt +
// public/sitemap.xml) when a custom domain is added. Every %ORIGIN% token in
// the HTML entries (canonical, Open Graph, Twitter, JSON-LD) is replaced with
// this value at build time.
const ORIGIN = 'https://codetosvg.vercel.app'

function injectOrigin() {
  return {
    name: 'inject-origin',
    transformIndexHtml(html: string) {
      return html.replaceAll('%ORIGIN%', ORIGIN)
    },
  }
}

export default defineConfig({
  plugins: [react(), injectOrigin()],
  build: {
    rollupOptions: {
      // Multi-page: two real HTML entries. Relative paths resolve from the
      // project root — no node:path/__dirname, so vite.config.ts type-checks
      // without @types/node (which the project doesn't depend on).
      input: {
        main: 'index.html',
        imageToSvg: 'image-to-svg.html',
        // Keyword-targeted landing pages (see src/conversions.ts). Add one line
        // here for each new <slug>.html.
        svgToPng: 'svg-to-png.html',
        svgToJpg: 'svg-to-jpg.html',
        svgToWebp: 'svg-to-webp.html',
        pngToSvg: 'png-to-svg.html',
      },
    },
  },
})
