import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // Multi-page: two real HTML entries. Relative paths resolve from the
      // project root — no node:path/__dirname, so vite.config.ts type-checks
      // without @types/node (which the project doesn't depend on).
      input: {
        main: 'index.html',
        imageToSvg: 'image-to-svg.html',
      },
    },
  },
})
