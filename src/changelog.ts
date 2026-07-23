export interface ChangelogEntry {
  version: string
  date: string
  changes: string[]
}

export const CHANGELOG: ChangelogEntry[] = [
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
