import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { xml } from '@codemirror/lang-xml'
import { tokyoNight } from '@uiw/codemirror-theme-tokyo-night'
import {
  fileExtension,
  getSvgDimensions,
  renderToBlob,
  type ImageFormat,
} from './svgToImage'
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

type PreviewBg = 'checker' | 'white' | 'black'
type AppTheme = 'dark' | 'light'

function getInitialTheme(): AppTheme {
  const stored = localStorage.getItem('code2svg-theme')
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
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
  const [previewBg, setPreviewBg] = useState<PreviewBg>('checker')
  const [status, setStatus] = useState<{ kind: 'error' | 'info'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [showChangelog, setShowChangelog] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
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

  const supportsQuality = format === 'jpeg' || format === 'webp'

  const download = useCallback(async () => {
    if (!trimmed) {
      setStatus({ kind: 'error', text: 'Add some SVG code first.' })
      return
    }
    setBusy(true)
    setStatus(null)
    try {
      const blob = await renderToBlob(trimmed, {
        format,
        scale,
        width: sizeMode === 'custom' ? customWidth : null,
        height: sizeMode === 'custom' ? customHeight : null,
        quality,
        background: format === 'svg' ? null : useBackground ? background : null,
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `code2svg.${fileExtension(format)}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setStatus({ kind: 'info', text: `Downloaded as ${fileExtension(format).toUpperCase()}.` })
    } catch (err) {
      setStatus({ kind: 'error', text: err instanceof Error ? err.message : 'Something went wrong.' })
    } finally {
      setBusy(false)
    }
  }, [trimmed, format, scale, sizeMode, customWidth, customHeight, quality, useBackground, background])

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
      const blob = await renderToBlob(trimmed, {
        format: 'png',
        scale,
        width: sizeMode === 'custom' ? customWidth : null,
        height: sizeMode === 'custom' ? customHeight : null,
        quality,
        background: useBackground ? background : null,
      })
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
      setStatus({ kind: 'info', text: 'Image copied to clipboard as PNG.' })
    } catch (err) {
      setStatus({ kind: 'error', text: err instanceof Error ? err.message : 'Could not copy the image.' })
    } finally {
      setBusy(false)
    }
  }, [trimmed, scale, sizeMode, customWidth, customHeight, quality, useBackground, background])

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

  const loadFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      setCode(String(reader.result ?? ''))
      setStatus({ kind: 'info', text: `Loaded ${file.name}.` })
    }
    reader.onerror = () => setStatus({ kind: 'error', text: 'Could not read the file.' })
    reader.readAsText(file)
  }, [])

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

  const outputSize = dimensions
    ? format === 'svg'
      ? `${Math.round(dimensions.width)} × ${Math.round(dimensions.height)}`
      : sizeMode === 'custom'
        ? `${Math.round(customWidth)} × ${Math.round(customHeight)} px`
        : `${Math.round(dimensions.width * scale)} × ${Math.round(dimensions.height * scale)} px`
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
          <button className="ghost" onClick={() => setCode(SAMPLE_SVG)}>Load sample</button>
          <button className="ghost" onClick={() => { setCode(''); setStatus(null) }}>Clear</button>
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

      <main className="workspace">
        <section className="pane editor-pane">
          <div className="pane-head">
            <span className="pane-title">SVG code</span>
            <div className="pane-tools">
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
            extensions={[xml()]}
            onChange={setCode}
            className="editor"
            basicSetup={{ lineNumbers: true, foldGutter: true }}
          />
        </section>

        <section className="pane preview-pane">
          <div className="pane-head">
            <span className="pane-title">Preview</span>
            <div className="seg">
              {(['checker', 'white', 'black'] as PreviewBg[]).map((bg) => (
                <button
                  key={bg}
                  className={previewBg === bg ? 'seg-btn active' : 'seg-btn'}
                  onClick={() => setPreviewBg(bg)}
                >
                  {bg === 'checker' ? 'Grid' : bg === 'white' ? 'Light' : 'Dark'}
                </button>
              ))}
            </div>
          </div>
          <div className={`preview-canvas bg-${previewBg}`}>
            {previewUrl ? (
              <img src={previewUrl} alt="SVG preview" />
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
            </div>

            <button className="primary" onClick={download} disabled={busy || !trimmed}>
              {busy ? 'Rendering…' : `Download ${fileExtension(format).toUpperCase()}`}
            </button>

            <button className="ghost wide" onClick={copyImage} disabled={busy || !trimmed}>
              Copy image (PNG)
            </button>

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
