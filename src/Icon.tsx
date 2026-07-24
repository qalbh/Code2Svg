// Inline stroke icons (24-grid, currentColor) — keeps the app dependency-light.
// Shared across the SVG→Image and Image→SVG pages.
export const ICON_PATHS: Record<string, string> = {
  zoomOut: 'M11 11m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0 M21 21l-4.3-4.3 M8 11h6',
  zoomIn: 'M11 11m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0 M21 21l-4.3-4.3 M11 8v6 M8 11h6',
  fit: 'M8 3H5a2 2 0 0 0-2 2v3 M16 3h3a2 2 0 0 1 2 2v3 M21 16v3a2 2 0 0 1-2 2h-3 M3 16v3a2 2 0 0 0 2 2h3',
  fullscreen: 'M15 3h6v6 M9 21H3v-6 M21 3l-7 7 M3 21l7-7',
  rotateLeft: 'M3 12a9 9 0 1 0 3-6.7L3 8 M3 3v5h5',
  rotateRight: 'M21 12a9 9 0 1 1-3-6.7L21 8 M21 3v5h-5',
  flipH: 'M12 3v18 M7 8l-4 4 4 4 M17 8l4 4-4 4',
  flipV: 'M3 12h18 M8 7l4-4 4 4 M8 17l4 4 4-4',
  resetTransform: 'M9 14L4 9l5-5 M4 9h11a4 4 0 0 1 0 8h-1',
  palette:
    'M12 3a9 9 0 1 0 0 18h1.5a2.5 2.5 0 0 0 2.45-3 2.5 2.5 0 0 1 2.45-3H20a2 2 0 0 0 2-2 9 9 0 0 0-10-8z M7.5 10.5h.01 M12 7.5h.01 M16.5 10.5h.01',
  settings:
    'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37c1 .608 2.296.07 2.572-1.065z M9 12a3 3 0 1 0 6 0a3 3 0 0 0-6 0',
  sun: 'M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0 M12 2v2 M12 20v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M2 12h2 M20 12h2 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  star: 'M12 2l1.8 4.4L18.5 8.2 14 10 12 14.5 10 10 5.5 8.2 10.2 6.4z',
  folderOpen:
    'M4 8V6a2 2 0 0 1 2-2h3l2 2h6a2 2 0 0 1 2 2v1 M3.6 9h16.8l-1.9 8.8a1 1 0 0 1-1 .8H6.5a1 1 0 0 1-1-.8z',
  trash: 'M4 7h16 M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2 M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13',
  formatIcon: 'M15 4V2 M15 22v-2 M19 6h2 M3 6h2 M4.5 19.5 15 9 M13.5 7.5l3 3',
  bolt: 'M13 2 4 14h6l-1 8 9-12h-6z',
  uploadTray: 'M12 15V4 M8 8l4-4 4 4 M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2',
  clipboard:
    'M11 9H18A2 2 0 0 1 20 11V18A2 2 0 0 1 18 20H11A2 2 0 0 1 9 18V11A2 2 0 0 1 11 9Z M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1',
  image:
    'M5 3H19A2 2 0 0 1 21 5V19A2 2 0 0 1 19 21H5A2 2 0 0 1 3 19V5A2 2 0 0 1 5 3Z M8.5 8.5m-1.6 0a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0 -3.2 0 M21 15l-5-5L5 21',
  download: 'M12 3v12 M8 11l4 4 4-4 M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2',
  check: 'M20 6 9 17l-5-5',
  info: 'M12 12m-10 0a10 10 0 1 0 20 0a10 10 0 1 0 -20 0 M12 16v-4 M12 8h.01',
  shield: 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z M9 12l2 2 4-4',
  code: 'M16 18 22 12 16 6 M8 6 2 12 8 18',
  wand: 'M15 4V2 M15 22v-2 M19 6h2 M3 6h2 M4.5 19.5 15 9 M13.5 7.5l3 3',
  arrowRight: 'M5 12h14 M13 6l6 6-6 6',
}

export function Icon({ name, filled, color }: { name: string; filled?: boolean; color?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={color ? { color } : undefined}
      aria-hidden="true"
    >
      {ICON_PATHS[name].split(' M').map((seg, i) => (
        <path key={i} d={i === 0 ? seg : `M${seg}`} />
      ))}
    </svg>
  )
}
