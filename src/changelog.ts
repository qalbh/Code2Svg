export interface ChangelogEntry {
  version: string
  date: string
  changes: string[]
}

export const CHANGELOG: ChangelogEntry[] = [
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
    version: '1.5.0',
    date: '2026-07-24',
    changes: [
      'Local autosave — your code now persists to this browser, so a refresh no longer wipes your work.',
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
