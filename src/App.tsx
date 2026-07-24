import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { xml } from '@codemirror/lang-xml'
import { linter, lintGutter, type Diagnostic } from '@codemirror/lint'
import { tokyoNight } from '@uiw/codemirror-theme-tokyo-night'
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
import { hasAnimation, renderToGif } from './svgToGif'
import { CHANGELOG } from './changelog'

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

// Inline stroke icons (24-grid, currentColor) — keeps the app dependency-light.
const ICON_PATHS: Record<string, string> = {
  zoomOut: 'M11 11m-8 0a8 8 0 1 0 16 0a8 8 0 1 0 -16 0 M21 21l-4.35-4.35 M8 11h6',
  zoomIn: 'M11 11m-8 0a8 8 0 1 0 16 0a8 8 0 1 0 -16 0 M21 21l-4.35-4.35 M8 11h6 M11 8v6',
  fit: 'M4 9V5a1 1 0 0 1 1-1h4 M20 9V5a1 1 0 0 0-1-1h-4 M4 15v4a1 1 0 0 0 1 1h4 M20 15v4a1 1 0 0 1-1 1h-4',
  fullscreen: 'M8 3H5a2 2 0 0 0-2 2v3 M16 3h3a2 2 0 0 1 2 2v3 M8 21H5a2 2 0 0 1-2-2v-3 M16 21h3a2 2 0 0 0 2-2v-3',
  rotateLeft: 'M4 12a8 8 0 1 0 2.34-5.66 M3 4v4h4',
  rotateRight: 'M20 12a8 8 0 1 1-2.34-5.66 M21 4v4h-4',
  flipH: 'M12 2v20 M8 6H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3 M16 6h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-3',
  flipV: 'M2 12h20 M6 8V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3 M6 16v3a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-3',
  resetTransform: 'M9 14L4 9l5-5 M4 9h11a4 4 0 0 1 0 8h-1',
  palette:
    'M12 3a9 9 0 1 0 0 18h1.5a2.5 2.5 0 0 0 2.45-3 2.5 2.5 0 0 1 2.45-3H20a2 2 0 0 0 2-2 9 9 0 0 0-10-8z M7.5 10.5h.01 M12 7.5h.01 M16.5 10.5h.01',
}

function Icon({ name }: { name: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
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
  const [isDragging, setIsDragging] = useState(false)
  const [gifDuration, setGifDuration] = useState(2)
  const [gifFps, setGifFps] = useState(20)
  const [gifProgress, setGifProgress] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounter = useRef(0)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('code2svg-theme', theme)
  }, [theme])

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
    } catch (err) {
      setStatus({ kind: 'error', text: err instanceof Error ? err.message : 'Something went wrong.' })
    } finally {
      setBusy(false)
    }
  }, [trimmed, format, scale, sizeMode, customWidth, customHeight, quality, useBackground, background, trimTransparent, rotation, flipH, flipV])

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
    } catch (err) {
      setStatus({ kind: 'error', text: err instanceof Error ? err.message : 'Could not copy the image.' })
    } finally {
      setBusy(false)
    }
  }, [trimmed, scale, sizeMode, customWidth, customHeight, quality, useBackground, background, trimTransparent, rotation, flipH, flipV])

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
    } catch {
      setStatus({ kind: 'error', text: 'Clipboard access was denied.' })
    }
  }, [code])

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
            <svg viewBox="0 0 32 32" width="26" height="26">
              <rect width="32" height="32" rx="7" fill="#6366f1" />
              <path d="M11 9 L6 16 L11 23" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M21 9 L26 16 L21 23" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="18" y1="7" x2="14" y2="25" stroke="#a5b4fc" strokeWidth="2.4" strokeLinecap="round" />
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
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
          <button className="ghost" onClick={() => setShowChangelog(true)}>What's new</button>
          <button className="ghost" onClick={() => { setCode(SAMPLE_SVG); resetPreviewView() }}>Load sample</button>
          <button className="ghost" onClick={() => { setCode(''); setStatus(null); resetPreviewView() }}>Clear</button>
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

      <main
        className="workspace"
        ref={workspaceRef}
        style={editorWidth != null ? ({ '--editor-w': `${editorWidth}px` } as React.CSSProperties) : undefined}
      >
        <section className="pane editor-pane">
          <div className="pane-head">
            <span className="pane-title">SVG code</span>
            <div className="pane-tools">
              <button className="ghost" onClick={formatCode}>Format</button>
              <button className="ghost" onClick={() => fileInputRef.current?.click()}>Upload</button>
              <button className="ghost" onClick={copyCode}>Copy</button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".svg,image/svg+xml"
                hidden
                onChange={onUpload}
              />
            </div>
          </div>
          <CodeMirror
            value={code}
            height="100%"
            theme={theme === 'dark' ? tokyoNight : 'light'}
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
            <div className="tb-group">
              <button className="icon-btn" onClick={() => zoomBy(1 / 1.2)} title="Zoom out">
                <Icon name="zoomOut" />
              </button>
              <button className="icon-btn zoom-label" onClick={resetZoom} title="Reset zoom to 100%">
                {Math.round(preview.zoom * 100)}%
              </button>
              <button className="icon-btn" onClick={() => zoomBy(1.2)} title="Zoom in">
                <Icon name="zoomIn" />
              </button>
              <button className="icon-btn" onClick={resetPreviewView} title="Fit to screen">
                <Icon name="fit" />
              </button>
              <button
                className={isFullscreen ? 'icon-btn active' : 'icon-btn'}
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen preview'}
              >
                <Icon name="fullscreen" />
              </button>
            </div>

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
                    <input
                      type="number"
                      min={1}
                      value={customWidth}
                      onChange={(e) => handleWidthChange(Number(e.target.value))}
                    />
                    <button
                      type="button"
                      className={lockAspect ? 'lock-btn active' : 'lock-btn'}
                      onClick={() => setLockAspect((v) => !v)}
                      title={lockAspect ? 'Aspect ratio locked' : 'Aspect ratio unlocked'}
                    >
                      {lockAspect ? '🔒' : '🔓'}
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={customHeight}
                      onChange={(e) => handleHeightChange(Number(e.target.value))}
                    />
                  </div>
                )}
              </div>
            )}

            {format !== 'svg' && (
              <div className="field">
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={trimTransparent}
                    onChange={(e) => setTrimTransparent(e.target.checked)}
                  />
                  Auto-crop to content
                </label>
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
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={useBackground}
                    onChange={(e) => setUseBackground(e.target.checked)}
                  />
                  Background color
                </label>
                {useBackground && (
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
              {busy ? 'Rendering…' : `Download ${fileExtension(format).toUpperCase()}`}
            </button>

            <button className="ghost wide" onClick={copyImage} disabled={busy || !trimmed}>
              Copy image (PNG)
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
        <span>Runs entirely in your browser — nothing is uploaded.</span>
      </footer>
    </div>
  )
}
