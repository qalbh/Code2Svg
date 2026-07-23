export interface ChangelogEntry {
  version: string
  date: string
  changes: string[]
}

export const CHANGELOG: ChangelogEntry[] = [
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
