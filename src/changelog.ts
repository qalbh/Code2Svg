export interface ChangelogEntry {
  version: string
  date: string
  changes: string[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.18.0',
    date: '2026-07-24',
    changes: [
      'Added About, Terms & Conditions, and Privacy Policy pages, linked from the footer.',
    ],
  },
  {
    version: '1.17.0',
    date: '2026-07-24',
    changes: [
      'New Optimize button — minify SVGs with SVGO, with a byte-savings readout and a settings popover to toggle individual plugins (viewBox removal stays off by default) and pretty-print the output. Runs alongside the existing non-destructive Format button.',
    ],
  },
  {
    version: '1.16.0',
    date: '2026-07-24',
    changes: [
      'New Output drawer under the preview — switch between Preview, React, React Native, and Data URI representations of your SVG, each with a Copy button. Updates live as you edit.',
    ],
  },
  {
    version: '1.15.0',
    date: '2026-07-24',
    changes: [
      'New consolidated preview toolbar — icon buttons for zoom, fit, and fullscreen (view only), plus rotate 90° left/right, flip horizontal/vertical, and reset that carry through to the exported PNG/JPG/WebP/SVG.',
      'Detected colors moved into a compact palette popover to keep the toolbar tidy.',
    ],
  },
  {
    version: '1.14.0',
    date: '2026-07-24',
    changes: [
      'Removed local autosave — the editor no longer persists your code to the browser between sessions.',
    ],
  },
  {
    version: '1.13.0',
    date: '2026-07-24',
    changes: [
      'Drag the divider between the code and preview panes to resize them; double-click it to reset to an even split.',
    ],
  },
  {
    version: '1.12.0',
    date: '2026-07-24',
    changes: [
      'Animated SVG → GIF export — animated SVGs (SMIL or CSS) now reveal an "Animated export" panel to record the motion as a downloadable GIF, with adjustable duration and frame rate.',
    ],
  },
  {
    version: '1.11.0',
    date: '2026-07-24',
    changes: [
      'Estimated file size now shows in the Export panel, updating live as you change format, scale, quality, or trim settings.',
    ],
  },
  {
    version: '1.10.0',
    date: '2026-07-24',
    changes: [
      'Format button — pretty-prints the SVG code with consistent indentation, without changing what it renders.',
    ],
  },
  {
    version: '1.9.0',
    date: '2026-07-24',
    changes: [
      'Zoom and pan the preview — scroll to zoom toward your cursor, drag to pan, double-click or the zoom badge to reset. View-only; does not affect the exported image.',
    ],
  },
  {
    version: '1.8.0',
    date: '2026-07-24',
    changes: [
      'Scaled exports now download with a @2x/@3x filename suffix, so they drop straight into design-tool asset pipelines.',
    ],
  },
  {
    version: '1.7.3',
    date: '2026-07-24',
    changes: [
      'Recolor swatches now update the preview live while dragging in the color picker, instead of only on close.',
    ],
  },
  {
    version: '1.7.2',
    date: '2026-07-24',
    changes: [
      'Fixed the recolor swatch picker closing immediately on click — it now stays open while dragging and only commits when you finish picking a color.',
    ],
  },
  {
    version: '1.7.1',
    date: '2026-07-24',
    changes: [
      'Redesigned recolor swaps as an always-visible swatch bar under the preview, showing color codes directly instead of a button + popup.',
    ],
  },
  {
    version: '1.7.0',
    date: '2026-07-24',
    changes: [
      'Recolor swaps — detect fill/stroke/gradient colors in the SVG and remap them via color pickers before export.',
    ],
  },
  {
    version: '1.6.1',
    date: '2026-07-24',
    changes: [
      'Fixed auto-crop to also trim solid-color padding (e.g. a white background box drawn inside the SVG), not just fully transparent edges.',
    ],
  },
  {
    version: '1.6.0',
    date: '2026-07-24',
    changes: [
      'Trim transparent edges — crop PNG/JPG/WebP exports to the visible content, removing empty padding.',
    ],
  },
  {
    version: '1.4.0',
    date: '2026-07-24',
    changes: [
      'Invalid XML is now highlighted inline in the editor as you type, with a gutter marker and hover tooltip explaining the error.',
    ],
  },
  {
    version: '1.3.0',
    date: '2026-07-24',
    changes: [
      'Drag and drop an .svg file anywhere on the page to load it.',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-07-24',
    changes: [
      'Light/dark app theme toggle, remembered across visits.',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-07-24',
    changes: [
      'Export at an exact pixel width/height, with an aspect-ratio lock.',
      'Copy the rendered PNG straight to the clipboard.',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-07-24',
    changes: [
      'Convert SVG to PNG, JPG, WebP, or raw SVG.',
      'Live preview with grid, light, and dark backgrounds.',
      'Adjustable export scale, quality, and background color.',
      'Upload an .svg file or paste code directly.',
      'Copy SVG source to the clipboard.',
    ],
  },
]
