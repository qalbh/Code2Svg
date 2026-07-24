import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { xml } from '@codemirror/lang-xml'
import { linter, lintGutter, type Diagnostic } from '@codemirror/lint'
import { code2svgDarkTheme, code2svgLightTheme } from './editorTheme'
import {
  fileExtension,
  findColors,
  findXmlError,
  formatFileSize,
  getSvgDimensions,
  normalizeColorToHex,
  prettifySvg,
  renderToBlob,
  replaceColor,
  type ImageFormat,
  type Rotation,
} from './svgToImage'
import { toDataUri, toReact, toReactNative } from './svgToCode'
import { hasAnimation, renderToGif } from './svgToGif'
import { DEFAULT_OPTIMIZE_OPTIONS, PLUGIN_GROUPS, optimizeSvg, type OptimizeOptions } from './optimizeSvg'
import { CHANGELOG } from './changelog'
import { INFO_PAGES, type InfoPage } from './infoPages'

const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6366f1"/>
      <stop offset="1" stop-color="#ec4899"/>
    </linearGradient>
  </defs>
  <rect width="240" height="240" rx="32" fill="url(#g)"/>
  <circle cx="120" cy="100" r="46" fill="#ffffff" opacity="0.95"/>
  <path d="M70 170 Q120 130 170 170" stroke="#ffffff" stroke-width="10"
        fill="none" stroke-linecap="round"/>
</svg>
`

const FORMATS: { id: ImageFormat; label: string }[] = [
  { id: 'png', label: 'PNG' },
  { id: 'jpeg', label: 'JPG' },
  { id: 'webp', label: 'WebP' },
  { id: 'svg', label: 'SVG' },
]

const SCALES = [0.5, 1, 2, 3, 4]

const BG_PRESETS = ['#0f172a', '#ffffff', '#000000', '#6366f1', '#ec4899', '#10b981']

const xmlLinter = linter((view): Diagnostic[] => {
  const error = findXmlError(view.state.doc.toString())
  if (!error) return []

  const lineNumber = Math.min(Math.max(error.line, 1), view.state.doc.lines)
  const line = view.state.doc.line(lineNumber)
  const from = Math.min(line.from + Math.max(error.column - 1, 0), line.to)
  const to = Math.max(from + 1, line.to)

  return [
    {
      from,
      to: Math.min(to, view.state.doc.length),
      severity: 'error',
      message: error.message,
    },
  ]
})

type PreviewBg = 'checker' | 'white' | 'black'
type AppTheme = 'dark' | 'light'
type OutputTab = 'preview' | 'react' | 'reactNative' | 'dataUri'

const OUTPUT_TABS: { id: OutputTab; label: string }[] = [
  { id: 'preview', label: 'Preview' },
  { id: 'react', label: 'React' },
  { id: 'reactNative', label: 'React Native' },
  { id: 'dataUri', label: 'Data URI' },
]

// Inline stroke icons (24-grid, currentColor) — keeps the app dependency-light.
const ICON_PATHS: Record<string, string> = {
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
  shield: 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z M9 12l2 2 4-4',
}

function Icon({ name, filled, color }: { name: string; filled?: boolean; color?: string }) {
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

function getInitialTheme(): AppTheme {
  const stored = localStorage.getItem('code2svg-theme')
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

const OPTIMIZE_OPTIONS_KEY = 'code2svg-optimize-options'

function getInitialOptimizeOptions(): OptimizeOptions {
  try {
    const stored = localStorage.getItem(OPTIMIZE_OPTIONS_KEY)
    if (!stored) return DEFAULT_OPTIMIZE_OPTIONS
    const parsed = JSON.parse(stored)
    return {
      prettify: typeof parsed.prettify === 'boolean' ? parsed.prettify : DEFAULT_OPTIMIZE_OPTIONS.prettify,
      plugins: { ...DEFAULT_OPTIMIZE_OPTIONS.plugins, ...parsed.plugins },
    }
  } catch {
    return DEFAULT_OPTIMIZE_OPTIONS
  }
}

interface ColorSwatchProps {
  value: string
  hex: string
  onCommit: (oldColor: string, newColor: string) => void
}

function ColorSwatch({ value, hex, onCommit }: ColorSwatchProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  // Mirror the latest props in refs so the listener below (attached once) never
  // reads stale values, without needing to reattach it — reattaching on every
  // color tick would fight the native picker the same way a remount would.
  const valueRef = useRef(value)
  const onCommitRef = useRef(onCommit)
  useEffect(() => {
    valueRef.current = value
    onCommitRef.current = onCommit
  })

  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    // 'input' fires continuously while dragging inside the native picker, giving
    // a live preview; 'change' fires once more on dismissal as a safety net.
    // The input stays uncontrolled (defaultValue) and this listener is attached
    // once — never remounted or rebound — so nothing external touches the
    // element's own value while the native picker is open, which is what was
    // closing it prematurely before.
    const handleInput = (e: Event) => {
      const newValue = (e.target as HTMLInputElement).value
      onCommitRef.current(valueRef.current, newValue)
      valueRef.current = newValue
    }
    el.addEventListener('input', handleInput)
    el.addEventListener('change', handleInput)
    return () => {
      el.removeEventListener('input', handleInput)
      el.removeEventListener('change', handleInput)
    }
  }, [])

  return (
    <label className="swatch-chip" title={value}>
      <input ref={inputRef} type="color" defaultValue={hex} />
      <span>{value}</span>
    </label>
  )
}

function useFlash(duration = 1400) {
  const [active, setActive] = useState(false)
  const trigger = useCallback(() => {
    setActive(true)
    setTimeout(() => setActive(false), duration)
  }, [duration])
  return [active, trigger] as const
}

interface CheckRowProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}

function CheckRow({ checked, onChange, label }: CheckRowProps) {
  return (
    <button
      type="button"
      className="check-row"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
    >
      <span className={checked ? 'check-box on' : 'check-box'}>
        {checked && <Icon name="check" />}
      </span>
      {label}
    </button>
  )
}

export default function App() {
  const [theme, setTheme] = useState<AppTheme>(getInitialTheme)
  const [code, setCode] = useState(SAMPLE_SVG)
  const [format, setFormat] = useState<ImageFormat>('png')
  const [scale, setScale] = useState(2)
  const [sizeMode, setSizeMode] = useState<'scale' | 'custom'>('scale')
  const [customWidth, setCustomWidth] = useState(512)
  const [customHeight, setCustomHeight] = useState(512)
  const [lockAspect, setLockAspect] = useState(true)
  const [quality, setQuality] = useState(0.92)
  const [useBackground, setUseBackground] = useState(false)
  const [background, setBackground] = useState('#ffffff')
  const [trimTransparent, setTrimTransparent] = useState(false)
  const [previewBg, setPreviewBg] = useState<PreviewBg>('checker')
  const [status, setStatus] = useState<{ kind: 'error' | 'info'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [showChangelog, setShowChangelog] = useState(false)
  const [infoPageId, setInfoPageId] = useState<InfoPage['id'] | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [gifDuration, setGifDuration] = useState(2)
  const [gifFps, setGifFps] = useState(20)
  const [gifProgress, setGifProgress] = useState<number | null>(null)
  const [optimizeOptions, setOptimizeOptions] = useState<OptimizeOptions>(getInitialOptimizeOptions)
  const [showOptimizeSettings, setShowOptimizeSettings] = useState(false)
  const [optimizeResult, setOptimizeResult] = useState<{ originalBytes: number; optimizedBytes: number } | null>(null)
  const [codeCopied, flashCodeCopied] = useFlash()
  const [outputCopied, flashOutputCopied] = useFlash()
  const [downloaded, flashDownloaded] = useFlash()
  const [imageCopied, flashImageCopied] = useFlash()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounter = useRef(0)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('code2svg-theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem(OPTIMIZE_OPTIONS_KEY, JSON.stringify(optimizeOptions))
  }, [optimizeOptions])

  const trimmed = code.trim()

  const dimensions = useMemo(() => {
    if (!trimmed) return null
    try {
      return getSvgDimensions(trimmed)
    } catch {
      return null
    }
  }, [trimmed])

  const colorSwatches = useMemo(() => {
    return findColors(trimmed).map((value) => ({
      value,
      hex: normalizeColorToHex(value) ?? '#000000',
    }))
  }, [trimmed])

  const updateColor = useCallback((oldColor: string, newColor: string) => {
    setCode((prev) => replaceColor(prev, oldColor, newColor))
  }, [])

  const isAnimated = useMemo(() => hasAnimation(trimmed), [trimmed])

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!trimmed) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(new Blob([trimmed], { type: 'image/svg+xml' }))
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [trimmed])

  const [preview, setPreview] = useState({ zoom: 1, pan: { x: 0, y: 0 } })
  const [isPanning, setIsPanning] = useState(false)
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const previewPaneRef = useRef<HTMLElement>(null)
  const panDragRef = useRef<{ startX: number; startY: number; startPan: { x: number; y: number } } | null>(null)

  // Export transform (rotate/flip) — applied to the downloaded image, not just preview.
  const [rotation, setRotation] = useState<Rotation>(0)
  const [flipH, setFlipH] = useState(false)
  const [flipV, setFlipV] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showPalette, setShowPalette] = useState(false)

  const hasTransform = rotation !== 0 || flipH || flipV

  const rotateBy = useCallback((deg: number) => {
    setRotation((prev) => ((((prev + deg) % 360) + 360) % 360) as Rotation)
  }, [])

  const resetTransform = useCallback(() => {
    setRotation(0)
    setFlipH(false)
    setFlipV(false)
  }, [])

  // Output drawer (React / React Native / Data URI representations).
  const [outputTab, setOutputTab] = useState<OutputTab>('preview')
  const [drawerHeight, setDrawerHeight] = useState(260)
  const lastCodeTab = useRef<Exclude<OutputTab, 'preview'>>('react')
  const drawerOpen = outputTab !== 'preview'

  const selectOutputTab = useCallback((tab: OutputTab) => {
    if (tab !== 'preview') lastCodeTab.current = tab
    setOutputTab(tab)
  }, [])

  const toggleDrawer = useCallback(() => {
    setOutputTab((prev) => (prev === 'preview' ? lastCodeTab.current : 'preview'))
  }, [])

  const startDrawerResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const pane = previewPaneRef.current
    const startY = e.clientY
    const startHeight = drawerHeight
    const handleMove = (moveEvent: MouseEvent) => {
      const paneHeight = pane?.getBoundingClientRect().height ?? 600
      // Dragging up (smaller clientY) grows the drawer.
      const next = startHeight + (startY - moveEvent.clientY)
      setDrawerHeight(Math.max(120, Math.min(next, paneHeight - 140)))
    }
    const handleUp = () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }, [drawerHeight])

  const [editorWidth, setEditorWidth] = useState<number | null>(null)
  const workspaceRef = useRef<HTMLElement>(null)

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const workspace = workspaceRef.current
    if (!workspace) return
    const rect = workspace.getBoundingClientRect()
    const CONTROLS_WIDTH = 320
    const MIN_PANE = 220
    const handleMove = (moveEvent: MouseEvent) => {
      const max = rect.width - CONTROLS_WIDTH - MIN_PANE
      const next = Math.max(MIN_PANE, Math.min(moveEvent.clientX - rect.left, max))
      setEditorWidth(next)
    }
    const handleUp = () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }, [])

  const resetPreviewView = useCallback(() => {
    setPreview({ zoom: 1, pan: { x: 0, y: 0 } })
  }, [])

  const zoomBy = useCallback((factor: number) => {
    setPreview((prev) => {
      const nextZoom = Math.min(8, Math.max(0.1, prev.zoom * factor))
      const ratio = nextZoom / prev.zoom
      // Pan is measured from the pane centre, so scaling it by the zoom ratio
      // keeps the centre point fixed as the zoom level changes.
      return { zoom: nextZoom, pan: { x: prev.pan.x * ratio, y: prev.pan.y * ratio } }
    })
  }, [])

  const resetZoom = useCallback(() => {
    setPreview((prev) => ({ ...prev, zoom: 1 }))
  }, [])

  const toggleFullscreen = useCallback(() => {
    const pane = previewPaneRef.current
    if (!pane) return
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      pane.requestFullscreen?.()
    }
  }, [])

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === previewPaneRef.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  useEffect(() => {
    const container = previewContainerRef.current
    if (!container) return

    // React's onWheel is bound as a passive listener, so e.preventDefault() inside
    // it is silently ignored (and logs a warning) — attach natively as non-passive
    // instead, which is required to stop the page/pane from scrolling while zooming.
    const handleWheel = (e: WheelEvent) => {
      if (!container.querySelector('img')) return
      e.preventDefault()
      const rect = container.getBoundingClientRect()
      const cursorX = e.clientX - rect.left - rect.width / 2
      const cursorY = e.clientY - rect.top - rect.height / 2

      setPreview((prev) => {
        const factor = Math.exp(-e.deltaY * 0.001)
        const nextZoom = Math.min(8, Math.max(0.1, prev.zoom * factor))
        // Keep the point under the cursor fixed as the zoom level changes.
        const worldX = (cursorX - prev.pan.x) / prev.zoom
        const worldY = (cursorY - prev.pan.y) / prev.zoom
        return {
          zoom: nextZoom,
          pan: { x: cursorX - worldX * nextZoom, y: cursorY - worldY * nextZoom },
        }
      })
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [])

  const handlePreviewPanStart = useCallback((e: React.MouseEvent) => {
    if (!previewUrl) return
    e.preventDefault()
    panDragRef.current = { startX: e.clientX, startY: e.clientY, startPan: preview.pan }
    setIsPanning(true)

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const drag = panDragRef.current
      if (!drag) return
      setPreview((prev) => ({
        ...prev,
        pan: {
          x: drag.startPan.x + (moveEvent.clientX - drag.startX),
          y: drag.startPan.y + (moveEvent.clientY - drag.startY),
        },
      }))
    }
    const handleMouseUp = () => {
      panDragRef.current = null
      setIsPanning(false)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [previewUrl, preview.pan])

  const supportsQuality = format === 'jpeg' || format === 'webp'

  const download = useCallback(async () => {
    if (!trimmed) {
      setStatus({ kind: 'error', text: 'Add some SVG code first.' })
      return
    }
    setBusy(true)
    setStatus(null)
    try {
      const { blob, width, height } = await renderToBlob(trimmed, {
        format,
        scale,
        width: sizeMode === 'custom' ? customWidth : null,
        height: sizeMode === 'custom' ? customHeight : null,
        quality,
        background: format === 'svg' ? null : useBackground ? background : null,
        trim: format !== 'svg' && trimTransparent,
        rotation,
        flipH,
        flipV,
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      // @2x/@3x-style suffix so scaled exports drop straight into design-tool
      // asset pipelines. Only meaningful for scale-based (not custom-pixel) sizing.
      const scaleSuffix = format !== 'svg' && sizeMode === 'scale' && scale !== 1 ? `@${scale}x` : ''
      link.download = `code2svg${scaleSuffix}.${fileExtension(format)}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      const sizeNote = format !== 'svg' && trimTransparent ? ` (${width} × ${height}, trimmed)` : ''
      setStatus({ kind: 'info', text: `Downloaded as ${fileExtension(format).toUpperCase()}${sizeNote}.` })
      flashDownloaded()
    } catch (err) {
      setStatus({ kind: 'error', text: err instanceof Error ? err.message : 'Something went wrong.' })
    } finally {
      setBusy(false)
    }
  }, [trimmed, format, scale, sizeMode, customWidth, customHeight, quality, useBackground, background, trimTransparent, rotation, flipH, flipV, flashDownloaded])

  const downloadGif = useCallback(async () => {
    if (!trimmed) {
      setStatus({ kind: 'error', text: 'Add some SVG code first.' })
      return
    }
    setBusy(true)
    setStatus(null)
    setGifProgress(0)
    try {
      const blob = await renderToGif(trimmed, {
        scale,
        duration: gifDuration,
        fps: gifFps,
        background: useBackground ? background : null,
        onProgress: (fraction) => setGifProgress(fraction),
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'code2svg.gif'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setStatus({ kind: 'info', text: `Downloaded animated GIF (${formatFileSize(blob.size)}).` })
    } catch (err) {
      setStatus({ kind: 'error', text: err instanceof Error ? err.message : 'Could not create the GIF.' })
    } finally {
      setBusy(false)
      setGifProgress(null)
    }
  }, [trimmed, scale, gifDuration, gifFps, useBackground, background])

  const [estimatedSize, setEstimatedSize] = useState<number | null>(null)

  useEffect(() => {
    if (!trimmed) {
      setEstimatedSize(null)
      return
    }
    let cancelled = false
    const id = setTimeout(() => {
      renderToBlob(trimmed, {
        format,
        scale,
        width: sizeMode === 'custom' ? customWidth : null,
        height: sizeMode === 'custom' ? customHeight : null,
        quality,
        background: format === 'svg' ? null : useBackground ? background : null,
        trim: format !== 'svg' && trimTransparent,
        rotation,
        flipH,
        flipV,
      })
        .then(({ blob }) => {
          if (!cancelled) setEstimatedSize(blob.size)
        })
        .catch(() => {
          if (!cancelled) setEstimatedSize(null)
        })
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(id)
    }
  }, [trimmed, format, scale, sizeMode, customWidth, customHeight, quality, useBackground, background, trimTransparent, rotation, flipH, flipV])

  const copyImage = useCallback(async () => {
    if (!trimmed) {
      setStatus({ kind: 'error', text: 'Add some SVG code first.' })
      return
    }
    if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
      setStatus({ kind: 'error', text: 'Clipboard image copy is not supported in this browser.' })
      return
    }
    setBusy(true)
    setStatus(null)
    try {
      const { blob, width, height } = await renderToBlob(trimmed, {
        format: 'png',
        scale,
        width: sizeMode === 'custom' ? customWidth : null,
        height: sizeMode === 'custom' ? customHeight : null,
        quality,
        background: useBackground ? background : null,
        trim: trimTransparent,
        rotation,
        flipH,
        flipV,
      })
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
      const sizeNote = trimTransparent ? ` (${width} × ${height}, trimmed)` : ''
      setStatus({ kind: 'info', text: `Image copied to clipboard as PNG${sizeNote}.` })
      flashImageCopied()
    } catch (err) {
      setStatus({ kind: 'error', text: err instanceof Error ? err.message : 'Could not copy the image.' })
    } finally {
      setBusy(false)
    }
  }, [trimmed, scale, sizeMode, customWidth, customHeight, quality, useBackground, background, trimTransparent, rotation, flipH, flipV, flashImageCopied])

  const handleWidthChange = useCallback((value: number) => {
    setCustomWidth(value)
    if (lockAspect && dimensions) {
      setCustomHeight(Math.max(1, Math.round(value / (dimensions.width / dimensions.height))))
    }
  }, [lockAspect, dimensions])

  const handleHeightChange = useCallback((value: number) => {
    setCustomHeight(value)
    if (lockAspect && dimensions) {
      setCustomWidth(Math.max(1, Math.round(value * (dimensions.width / dimensions.height))))
    }
  }, [lockAspect, dimensions])

  const copyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
      setStatus({ kind: 'info', text: 'SVG code copied to clipboard.' })
      flashCodeCopied()
    } catch {
      setStatus({ kind: 'error', text: 'Clipboard access was denied.' })
    }
  }, [code, flashCodeCopied])

  const outputContent = useMemo(() => {
    if (outputTab === 'preview') return { text: '', label: '', error: null as string | null }
    const label = outputTab === 'react' ? 'React' : outputTab === 'reactNative' ? 'React Native' : 'Data URI'
    if (!trimmed) {
      return { text: '', label, error: `Add some SVG code to generate the ${label} output.` }
    }
    try {
      const text =
        outputTab === 'react'
          ? toReact(trimmed)
          : outputTab === 'reactNative'
            ? toReactNative(trimmed)
            : toDataUri(trimmed)
      return { text, label, error: null }
    } catch {
      return { text: '', label, error: "This SVG isn't valid, so it can't be converted." }
    }
  }, [trimmed, outputTab])

  const copyOutput = useCallback(async () => {
    if (!outputContent.text) return
    try {
      await navigator.clipboard.writeText(outputContent.text)
      setStatus({ kind: 'info', text: `${outputContent.label} output copied to clipboard.` })
      flashOutputCopied()
    } catch {
      setStatus({ kind: 'error', text: 'Clipboard access was denied.' })
    }
  }, [outputContent, flashOutputCopied])

  const formatCode = useCallback(() => {
    if (!trimmed) {
      setStatus({ kind: 'error', text: 'Add some SVG code first.' })
      return
    }
    try {
      setCode(prettifySvg(trimmed))
      setStatus({ kind: 'info', text: 'Formatted the SVG code.' })
    } catch (err) {
      setStatus({ kind: 'error', text: err instanceof Error ? err.message : 'Could not format the code.' })
    }
  }, [trimmed])

  const runOptimize = useCallback(() => {
    if (!trimmed) {
      setStatus({ kind: 'error', text: 'Add some SVG code first.' })
      return
    }
    try {
      const result = optimizeSvg(trimmed, optimizeOptions)
      setCode(result.data)
      setOptimizeResult({ originalBytes: result.originalBytes, optimizedBytes: result.optimizedBytes })
      setStatus({ kind: 'info', text: 'Optimized the SVG code.' })
    } catch (err) {
      setOptimizeResult(null)
      setStatus({ kind: 'error', text: err instanceof Error ? err.message : 'Could not optimize the SVG.' })
    }
  }, [trimmed, optimizeOptions])

  const togglePlugin = useCallback((key: string, enabled: boolean) => {
    setOptimizeOptions((prev) => ({ ...prev, plugins: { ...prev.plugins, [key]: enabled } }))
  }, [])

  const optimizeReadout = useMemo(() => {
    if (!optimizeResult) return null
    const { originalBytes, optimizedBytes } = optimizeResult
    if (optimizedBytes >= originalBytes) {
      return { text: 'Already optimized.', shrank: false }
    }
    const pct = Math.round((1 - optimizedBytes / originalBytes) * 100)
    return {
      text: `${formatFileSize(originalBytes)} → ${formatFileSize(optimizedBytes)} (−${pct}%)`,
      shrank: true,
    }
  }, [optimizeResult])

  const loadFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      setCode(String(reader.result ?? ''))
      setStatus({ kind: 'info', text: `Loaded ${file.name}.` })
      resetPreviewView()
    }
    reader.onerror = () => setStatus({ kind: 'error', text: 'Could not read the file.' })
    reader.readAsText(file)
  }, [resetPreviewView])

  const onUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    loadFile(file)
    e.target.value = ''
  }, [loadFile])

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!e.dataTransfer.types.includes('Files')) return
    dragCounter.current += 1
    setIsDragging(true)
  }, [])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current = Math.max(0, dragCounter.current - 1)
    if (dragCounter.current === 0) setIsDragging(false)
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current = 0
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    if (!/\.svg$/i.test(file.name) && file.type !== 'image/svg+xml') {
      setStatus({ kind: 'error', text: 'Drop an .svg file to load it.' })
      return
    }
    loadFile(file)
  }, [loadFile])

  const swapDims = rotation === 90 || rotation === 270
  const fmtSize = (w: number, h: number, unit: string) => {
    const [a, b] = swapDims ? [h, w] : [w, h]
    return `${Math.round(a)} × ${Math.round(b)}${unit}`
  }
  const outputSize = dimensions
    ? format === 'svg'
      ? fmtSize(dimensions.width, dimensions.height, '')
      : trimTransparent
        ? 'Trimmed to content'
        : sizeMode === 'custom'
          ? fmtSize(customWidth, customHeight, ' px')
          : fmtSize(dimensions.width * scale, dimensions.height * scale, ' px')
    : '—'

  return (
    <div
      className="app"
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {isDragging && (
        <div className="drop-overlay">
          <div className="drop-overlay-inner">Drop your .svg file to load it</div>
        </div>
      )}

      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </span>
          <div>
            <h1>Code2Svg</h1>
            <p>SVG to image converter</p>
          </div>
        </div>
        <div className="topbar-actions">
          <button
            className="ghost"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          >
            {theme === 'dark' ? (
              <Icon name="moon" color="#9fa8da" />
            ) : (
              <Icon name="sun" color="#f4c04d" />
            )}
            {theme === 'dark' ? 'Dark' : 'Light'}
          </button>
          <button className="ghost" onClick={() => setShowChangelog(true)}>
            <Icon name="star" filled color="#c9a9ff" />
            What's new
          </button>
          <button className="ghost" onClick={() => { setCode(SAMPLE_SVG); resetPreviewView() }}>
            <Icon name="folderOpen" />
            Load sample
          </button>
          <button className="ghost danger" onClick={() => { setCode(''); setStatus(null); resetPreviewView() }}>
            <Icon name="trash" />
            Clear
          </button>
        </div>
      </header>

      {showChangelog && (
        <div className="modal-overlay" onClick={() => setShowChangelog(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <span className="pane-title">What's new</span>
              <button className="ghost" onClick={() => setShowChangelog(false)}>Close</button>
            </div>
            <div className="modal-body">
              {CHANGELOG.map((entry) => (
                <div className="changelog-entry" key={entry.version}>
                  <div className="changelog-entry-head">
                    <strong>v{entry.version}</strong>
                    <span className="muted">{entry.date}</span>
                  </div>
                  <ul>
                    {entry.changes.map((change) => (
                      <li key={change}>{change}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {infoPageId && (() => {
        const infoPage = INFO_PAGES.find((p) => p.id === infoPageId)
        if (!infoPage) return null
        return (
          <div className="modal-overlay" onClick={() => setInfoPageId(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-head">
                <span className="pane-title">{infoPage.title}</span>
                <button className="ghost" onClick={() => setInfoPageId(null)}>Close</button>
              </div>
              <div className="modal-body">
                <p className="hint">Last updated {infoPage.updated}</p>
                {infoPage.sections.map((section, i) => (
                  <div className="info-section" key={i}>
                    {section.heading && <h3>{section.heading}</h3>}
                    {section.paragraphs.map((para, j) => (
                      <p key={j}>{para}</p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })()}

      <main
        className="workspace"
        ref={workspaceRef}
        style={editorWidth != null ? ({ '--editor-w': `${editorWidth}px` } as React.CSSProperties) : undefined}
      >
        <section className="pane editor-pane">
          <div className="pane-head">
            <span className="pane-title">SVG code</span>
            <div className="pane-tools">
              <button className="ghost" onClick={formatCode}>
                <Icon name="formatIcon" />
                Format
              </button>
              <div className="optimize-group">
                <button className="ghost" onClick={runOptimize}>
                  <Icon name="bolt" filled />
                  Optimize
                </button>
                <button
                  className={showOptimizeSettings ? 'icon-btn active' : 'icon-btn'}
                  onClick={() => setShowOptimizeSettings((v) => !v)}
                  title="Optimize settings"
                >
                  <Icon name="settings" />
                </button>
                {showOptimizeSettings && (
                  <>
                    <div className="popover-backdrop" onClick={() => setShowOptimizeSettings(false)} />
                    <div className="optimize-popover">
                      <label className="checkbox">
                        <input
                          type="checkbox"
                          checked={optimizeOptions.prettify}
                          onChange={(e) =>
                            setOptimizeOptions((prev) => ({ ...prev, prettify: e.target.checked }))
                          }
                        />
                        Prettify output
                      </label>
                      <div className="optimize-plugin-groups">
                        {PLUGIN_GROUPS.map((group) => (
                          <div className="optimize-plugin-group" key={group.title}>
                            <span className="optimize-group-title">{group.title}</span>
                            {group.plugins.map((p) => (
                              <label className="checkbox" key={p.key} title={p.hint}>
                                <input
                                  type="checkbox"
                                  checked={optimizeOptions.plugins[p.key] ?? false}
                                  onChange={(e) => togglePlugin(p.key, e.target.checked)}
                                />
                                {p.label}
                              </label>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
              <span className="divider-v" />
              <button className="ghost" onClick={() => fileInputRef.current?.click()}>
                <Icon name="uploadTray" />
                Upload
              </button>
              <button className="ghost" onClick={copyCode}>
                <Icon name={codeCopied ? 'check' : 'clipboard'} color={codeCopied ? 'var(--info)' : undefined} />
                {codeCopied ? 'Copied' : 'Copy'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".svg,image/svg+xml"
                hidden
                onChange={onUpload}
              />
            </div>
          </div>
          {optimizeReadout && (
            <div className={optimizeReadout.shrank ? 'optimize-readout shrank' : 'optimize-readout'}>
              {optimizeReadout.text}
            </div>
          )}
          <CodeMirror
            value={code}
            height="100%"
            theme={theme === 'dark' ? code2svgDarkTheme : code2svgLightTheme}
            extensions={[xml(), xmlLinter, lintGutter()]}
            onChange={setCode}
            className="editor"
            basicSetup={{ lineNumbers: true, foldGutter: true }}
          />
        </section>

        <div
          className="pane-resizer"
          onMouseDown={startResize}
          onDoubleClick={() => setEditorWidth(null)}
          title="Drag to resize · double-click to reset"
        />

        <section className="pane preview-pane" ref={previewPaneRef}>
          <div className="preview-toolbar">
            <div className="tb-group pill">
              <button className="icon-btn" onClick={() => zoomBy(1 / 1.2)} title="Zoom out">
                <Icon name="zoomOut" />
              </button>
              <button className="icon-btn zoom-label" onClick={resetZoom} title="Reset zoom to 100%">
                {Math.round(preview.zoom * 100)}%
              </button>
              <button className="icon-btn" onClick={() => zoomBy(1.2)} title="Zoom in">
                <Icon name="zoomIn" />
              </button>
            </div>
            <button className="icon-btn boxed" onClick={resetPreviewView} title="Fit to screen">
              <Icon name="fit" />
            </button>
            <button
              className={isFullscreen ? 'icon-btn boxed active' : 'icon-btn boxed'}
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen preview'}
            >
              <Icon name="fullscreen" />
            </button>

            <span className="tb-divider" />

            <div className="tb-group">
              <button className="icon-btn" onClick={() => rotateBy(-90)} title="Rotate 90° left">
                <Icon name="rotateLeft" />
              </button>
              <button className="icon-btn" onClick={() => rotateBy(90)} title="Rotate 90° right">
                <Icon name="rotateRight" />
              </button>
              <button
                className={flipH ? 'icon-btn active' : 'icon-btn'}
                onClick={() => setFlipH((v) => !v)}
                title="Flip horizontal"
              >
                <Icon name="flipH" />
              </button>
              <button
                className={flipV ? 'icon-btn active' : 'icon-btn'}
                onClick={() => setFlipV((v) => !v)}
                title="Flip vertical"
              >
                <Icon name="flipV" />
              </button>
              <button
                className="icon-btn"
                onClick={resetTransform}
                disabled={!hasTransform}
                title="Reset transform"
              >
                <Icon name="resetTransform" />
              </button>
            </div>

            <span className="tb-divider" />

            <div className="tb-group seg">
              {(['checker', 'white', 'black'] as PreviewBg[]).map((bg) => (
                <button
                  key={bg}
                  className={previewBg === bg ? 'seg-btn active' : 'seg-btn'}
                  onClick={() => setPreviewBg(bg)}
                  title={`${bg === 'checker' ? 'Grid' : bg === 'white' ? 'Light' : 'Dark'} background`}
                >
                  {bg === 'checker' ? 'Grid' : bg === 'white' ? 'Light' : 'Dark'}
                </button>
              ))}
            </div>

            {colorSwatches.length > 0 && (
              <div className="tb-group tb-right">
                <button
                  className={showPalette ? 'icon-btn active' : 'icon-btn'}
                  onClick={() => setShowPalette((v) => !v)}
                  title="Recolor"
                >
                  <Icon name="palette" />
                </button>
                {showPalette && (
                  <>
                    <div className="popover-backdrop" onClick={() => setShowPalette(false)} />
                    <div className="palette-popover">
                      {colorSwatches.map(({ value, hex }, index) => (
                        <ColorSwatch key={index} value={value} hex={hex} onCommit={updateColor} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div
            className={`preview-canvas bg-${previewBg}`}
            ref={previewContainerRef}
            onDoubleClick={resetPreviewView}
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="SVG preview"
                draggable={false}
                onMouseDown={handlePreviewPanStart}
                style={{
                  transform:
                    `translate(${preview.pan.x}px, ${preview.pan.y}px) scale(${preview.zoom}) ` +
                    `rotate(${rotation}deg) scale(${flipH ? -1 : 1}, ${flipV ? -1 : 1})`,
                  cursor: isPanning ? 'grabbing' : 'grab',
                }}
              />
            ) : (
              <p className="empty">Your SVG preview will appear here.</p>
            )}
            {previewUrl && dimensions && (
              <div className="dim-chip">
                {Math.round(dimensions.width)} × {Math.round(dimensions.height)}
              </div>
            )}
          </div>

          <div className="output-area">
            {drawerOpen && (
              <div className="output-drawer" style={{ height: drawerHeight }}>
                <div className="output-resizer" onMouseDown={startDrawerResize} />
                <div className="output-head">
                  <span className="output-lang">{outputContent.label}</span>
                  <button className="ghost" onClick={copyOutput} disabled={!outputContent.text}>
                    <Icon name={outputCopied ? 'check' : 'clipboard'} color={outputCopied ? 'var(--info)' : undefined} />
                    {outputCopied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="output-code">
                  {outputContent.error ? (
                    <p className="empty">{outputContent.error}</p>
                  ) : (
                    <CodeMirror
                      value={outputContent.text}
                      height="100%"
                      theme={theme === 'dark' ? code2svgDarkTheme : code2svgLightTheme}
                      extensions={[xml()]}
                      editable={false}
                      className="output-editor"
                      basicSetup={{ lineNumbers: false, foldGutter: false, highlightActiveLine: false }}
                    />
                  )}
                </div>
              </div>
            )}
            <div className="output-tabs">
              {OUTPUT_TABS.map((t) => (
                <button
                  key={t.id}
                  className={outputTab === t.id ? 'output-tab active' : 'output-tab'}
                  onClick={() => selectOutputTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
              <button
                className="icon-btn output-chevron"
                onClick={toggleDrawer}
                title={drawerOpen ? 'Collapse output' : 'Expand output'}
              >
                {drawerOpen ? '▾' : '▴'}
              </button>
            </div>
          </div>
        </section>

        <aside className="pane controls-pane">
          <div className="pane-head">
            <span className="pane-title">Export</span>
          </div>
          <div className="controls">
            <div className="field">
              <label>Format</label>
              <div className="seg wide">
                {FORMATS.map((f) => (
                  <button
                    key={f.id}
                    className={format === f.id ? 'seg-btn active' : 'seg-btn'}
                    onClick={() => setFormat(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {format !== 'svg' && (
              <div className="field">
                <label>Size</label>
                <div className="seg wide">
                  <button
                    className={sizeMode === 'scale' ? 'seg-btn active' : 'seg-btn'}
                    onClick={() => setSizeMode('scale')}
                  >
                    Scale
                  </button>
                  <button
                    className={sizeMode === 'custom' ? 'seg-btn active' : 'seg-btn'}
                    onClick={() => {
                      setSizeMode('custom')
                      if (dimensions) {
                        setCustomWidth(Math.round(dimensions.width))
                        setCustomHeight(Math.round(dimensions.height))
                      }
                    }}
                  >
                    Custom
                  </button>
                </div>

                {sizeMode === 'scale' ? (
                  <div className="seg wide">
                    {SCALES.map((s) => (
                      <button
                        key={s}
                        className={scale === s ? 'seg-btn active' : 'seg-btn'}
                        onClick={() => setScale(s)}
                      >
                        {s}×
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="dimension-row">
                    <label className="dimension-field">
                      <span className="micro-label">Width</span>
                      <input
                        type="number"
                        min={1}
                        value={customWidth}
                        onChange={(e) => handleWidthChange(Number(e.target.value))}
                      />
                    </label>
                    <button
                      type="button"
                      className={lockAspect ? 'lock-btn active' : 'lock-btn'}
                      onClick={() => setLockAspect((v) => !v)}
                      title={lockAspect ? 'Aspect ratio locked' : 'Aspect ratio unlocked'}
                    >
                      {lockAspect ? '🔒' : '🔓'}
                    </button>
                    <label className="dimension-field">
                      <span className="micro-label">Height</span>
                      <input
                        type="number"
                        min={1}
                        value={customHeight}
                        onChange={(e) => handleHeightChange(Number(e.target.value))}
                      />
                    </label>
                  </div>
                )}
              </div>
            )}

            {format !== 'svg' && (
              <div className="field">
                <CheckRow checked={trimTransparent} onChange={setTrimTransparent} label="Auto-crop to content" />
                <p className="hint">Crops the export to the visible artwork, removing transparent or solid-color padding.</p>
              </div>
            )}

            {supportsQuality && (
              <div className="field">
                <label>Quality <span className="muted">{Math.round(quality * 100)}%</span></label>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.01}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                />
              </div>
            )}

            {format !== 'svg' && (
              <div className="field">
                <CheckRow checked={useBackground} onChange={setUseBackground} label="Background color" />
                {useBackground && (
                  <>
                    <div className="bg-swatches">
                      {BG_PRESETS.map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          className={background === hex ? 'bg-swatch active' : 'bg-swatch'}
                          style={{ background: hex }}
                          title={hex}
                          onClick={() => setBackground(hex)}
                        />
                      ))}
                    </div>
                    <div className="color-row">
                      <input
                        type="color"
                        value={background}
                        onChange={(e) => setBackground(e.target.value)}
                      />
                      <input
                        type="text"
                        value={background}
                        onChange={(e) => setBackground(e.target.value)}
                        spellCheck={false}
                      />
                    </div>
                  </>
                )}
                {format === 'jpeg' && !useBackground && (
                  <p className="hint">JPG has no transparency — a white background is applied.</p>
                )}
              </div>
            )}

            <div className="summary">
              <div><span>Output size</span><strong>{outputSize}</strong></div>
              <div><span>Format</span><strong>{fileExtension(format).toUpperCase()}</strong></div>
              <div>
                <span>Estimated file size</span>
                <strong>{estimatedSize === null ? '—' : formatFileSize(estimatedSize)}</strong>
              </div>
              {hasTransform && (
                <div><span>Transform</span><strong className="tag-transformed">Transformed</strong></div>
              )}
            </div>

            <button className="primary" onClick={download} disabled={busy || !trimmed}>
              <Icon name={downloaded ? 'check' : 'download'} />
              {busy ? 'Rendering…' : downloaded ? 'Downloaded' : `Download ${fileExtension(format).toUpperCase()}`}
            </button>

            <button className="ghost wide" onClick={copyImage} disabled={busy || !trimmed}>
              <Icon name={imageCopied ? 'check' : 'image'} color={imageCopied ? 'var(--info)' : undefined} />
              {imageCopied ? 'Copied' : 'Copy image (PNG)'}
            </button>

            {isAnimated && (
              <div className="animated-export">
                <div className="animated-export-head">
                  <span className="pane-title">Animated export</span>
                  <span className="badge">GIF</span>
                </div>
                <p className="hint">This SVG is animated — export the motion as a GIF.</p>
                <div className="field">
                  <label>Duration <span className="muted">{gifDuration}s</span></label>
                  <input
                    type="range"
                    min={0.5}
                    max={10}
                    step={0.5}
                    value={gifDuration}
                    onChange={(e) => setGifDuration(Number(e.target.value))}
                  />
                </div>
                <div className="field">
                  <label>Frame rate <span className="muted">{gifFps} fps</span></label>
                  <input
                    type="range"
                    min={5}
                    max={30}
                    step={1}
                    value={gifFps}
                    onChange={(e) => setGifFps(Number(e.target.value))}
                  />
                </div>
                {gifProgress !== null && (
                  <div className="progress">
                    <div className="progress-bar" style={{ width: `${Math.round(gifProgress * 100)}%` }} />
                  </div>
                )}
                <button className="primary" onClick={downloadGif} disabled={busy || !trimmed}>
                  {gifProgress !== null ? `Recording… ${Math.round(gifProgress * 100)}%` : 'Download GIF'}
                </button>
              </div>
            )}

            {status && (
              <p className={status.kind === 'error' ? 'msg error' : 'msg info'}>{status.text}</p>
            )}
          </div>
        </aside>
      </main>

      <footer className="footer">
        <span className="footer-status">
          <Icon name="shield" />
          Runs entirely in your browser — nothing is uploaded.
        </span>
        <nav className="footer-links">
          {INFO_PAGES.map((p) => (
            <button key={p.id} className="link-btn" onClick={() => setInfoPageId(p.id)}>
              {p.label}
            </button>
          ))}
        </nav>
      </footer>
    </div>
  )
}
