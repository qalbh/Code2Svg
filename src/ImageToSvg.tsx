import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { xml } from '@codemirror/lang-xml'
import { code2svgDarkTheme, code2svgLightTheme } from './editorTheme'
import { NavBar, useTheme } from './NavBar'
import { Icon } from './Icon'
import { formatFileSize } from './svgToImage'
import { INFO_PAGES, type InfoPage } from './infoPages'
import {
  DEFAULT_TRACE_OPTIONS,
  fileToImageData,
  traceImageData,
  type TraceOptions,
} from './imageToSvg'

function InfoTip({ text }: { text: string }) {
  return (
    <span className="info-tip" tabIndex={0} role="img" aria-label={text}>
      <Icon name="info" />
      <span className="info-tip-bubble" role="tooltip">{text}</span>
    </span>
  )
}

const ACCEPTED = /^image\/(png|jpeg)$/
const ACCEPTED_EXT = /\.(png|jpe?g)$/i

interface Loaded {
  imageData: ImageData
  width: number
  height: number
}

export default function ImageToSvg() {
  const [theme, setTheme] = useTheme()

  const [file, setFile] = useState<File | null>(null)
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [options, setOptions] = useState<TraceOptions>(DEFAULT_TRACE_OPTIONS)
  const [svg, setSvg] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<{ kind: 'error' | 'info'; text: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [infoPageId, setInfoPageId] = useState<InfoPage['id'] | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragCounter = useRef(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Thumbnail object URL — created/revoked in one effect (StrictMode-safe).
  useEffect(() => {
    if (!file) {
      setSourceUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setSourceUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  // Decode the file to pixels whenever it changes.
  useEffect(() => {
    if (!file) {
      setLoaded(null)
      return
    }
    let cancelled = false
    setBusy(true)
    fileToImageData(file)
      .then((result) => {
        if (cancelled) return
        setLoaded(result)
        setStatus(null)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setLoaded(null)
        setSvg('')
        setStatus({ kind: 'error', text: err instanceof Error ? err.message : 'Could not read the image.' })
      })
      .finally(() => {
        if (!cancelled) setBusy(false)
      })
    return () => {
      cancelled = true
    }
  }, [file])

  // Debounced live retrace whenever the pixels or options change.
  useEffect(() => {
    if (!loaded) {
      setSvg('')
      return
    }
    setBusy(true)
    let cancelled = false
    const id = setTimeout(() => {
      try {
        const result = traceImageData(loaded.imageData, options)
        if (!cancelled) {
          setSvg(result)
          setStatus(null)
        }
      } catch (err) {
        if (!cancelled) {
          setSvg('')
          setStatus({ kind: 'error', text: err instanceof Error ? err.message : 'Could not trace this image.' })
        }
      } finally {
        if (!cancelled) setBusy(false)
      }
    }, 280)
    return () => {
      cancelled = true
      clearTimeout(id)
    }
  }, [loaded, options])

  const loadFile = useCallback((next: File) => {
    if (!ACCEPTED.test(next.type) && !ACCEPTED_EXT.test(next.name)) {
      setStatus({ kind: 'error', text: 'Please choose a PNG or JPG image.' })
      return
    }
    setFile(next)
  }, [])

  const onUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.files?.[0]
    if (next) loadFile(next)
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
    const next = e.dataTransfer.files?.[0]
    if (next) loadFile(next)
  }, [loadFile])

  const clearImage = useCallback(() => {
    setFile(null)
    setLoaded(null)
    setSvg('')
    setStatus(null)
  }, [])

  const setOption = useCallback((key: keyof TraceOptions, value: number) => {
    setOptions((prev) => ({ ...prev, [key]: value }))
  }, [])

  const copySvg = useCallback(async () => {
    if (!svg) return
    try {
      await navigator.clipboard.writeText(svg)
      setStatus({ kind: 'info', text: 'SVG code copied to clipboard.' })
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      setStatus({ kind: 'error', text: 'Clipboard access was denied.' })
    }
  }, [svg])

  const downloadSvg = useCallback(() => {
    if (!svg) return
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'traced.svg'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    setStatus({ kind: 'info', text: `Downloaded traced.svg (${formatFileSize(blob.size)}).` })
  }, [svg])

  const outputSize = useMemo(() => (svg ? formatFileSize(new Blob([svg]).size) : '—'), [svg])
  const editorTheme = theme === 'dark' ? code2svgDarkTheme : code2svgLightTheme

  return (
    <div
      className="app i2s-app"
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="backdrop" aria-hidden="true">
        <div className="aurora aurora-a" />
        <div className="aurora aurora-b" />
        <div className="aurora aurora-c" />
        <div className="noise" />
        <div className="vignette" />
      </div>

      {isDragging && (
        <div className="drop-overlay">
          <div className="drop-overlay-inner">Drop your PNG or JPG to trace it</div>
        </div>
      )}

      <NavBar theme={theme} setTheme={setTheme} active="image-to-svg" />

      <main className="workspace i2s-workspace">
        {/* SOURCE + OPTIONS */}
        <section className="pane">
          <div className="pane-head">
            <span className="pane-title"><span className="dot" />Source</span>
            {file && (
              <button className="ghost" onClick={clearImage}>
                <Icon name="trash" />
                Remove
              </button>
            )}
          </div>
          <div className="i2s-source">
            {sourceUrl ? (
              <div className="i2s-thumb">
                <img src={sourceUrl} alt="Source" />
                <div className="i2s-thumb-meta">
                  <strong>{file?.name}</strong>
                  {loaded && <span>{loaded.width} × {loaded.height}px traced</span>}
                </div>
              </div>
            ) : (
              <button className="i2s-dropzone" onClick={() => fileInputRef.current?.click()}>
                <Icon name="uploadTray" />
                <strong>Upload a PNG or JPG</strong>
                <span>Click to browse, or drag an image anywhere on the page</span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg"
              hidden
              onChange={onUpload}
            />

            {sourceUrl && (
              <button className="ghost wide" onClick={() => fileInputRef.current?.click()}>
                <Icon name="image" />
                Replace image
              </button>
            )}

            <div className="field">
              <div className="field-head">
                <label>Number of colors <span className="muted">{options.numberOfColors}</span></label>
                <InfoTip text="How many distinct colors the image is reduced to before tracing. More colors capture finer shading but produce a larger SVG." />
              </div>
              <input
                type="range"
                min={2}
                max={64}
                step={1}
                value={options.numberOfColors}
                disabled={!loaded}
                onChange={(e) => setOption('numberOfColors', Number(e.target.value))}
              />
            </div>

            <div className="field">
              <div className="field-head">
                <label>Detail <span className="muted">{options.detail}</span></label>
                <InfoTip text="How closely the traced paths follow the image's edges. Higher keeps small shapes and fine detail; lower simplifies them away." />
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={options.detail}
                disabled={!loaded}
                onChange={(e) => setOption('detail', Number(e.target.value))}
              />
            </div>

            <div className="field">
              <div className="field-head">
                <label>Smoothing <span className="muted">{options.smoothing}</span></label>
                <InfoTip text="How much the traced outlines are rounded and simplified. Higher gives smoother curves with fewer points; lower stays crisp and angular." />
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={options.smoothing}
                disabled={!loaded}
                onChange={(e) => setOption('smoothing', Number(e.target.value))}
              />
            </div>

            <p className="hint">
              Tracing works best for logos, icons, and flat or simple graphics — not photographs.
            </p>

            {status && (
              <p className={status.kind === 'error' ? 'msg error' : 'msg info'}>{status.text}</p>
            )}
          </div>
        </section>

        {/* PREVIEW */}
        <section className="pane preview-pane">
          <div className="pane-head">
            <span className="pane-title"><span className="dot" />Preview</span>
            {busy && <span className="i2s-badge">Tracing…</span>}
          </div>
          <div className="preview-canvas bg-checker i2s-preview">
            {svg ? (
              <>
                <div className="i2s-traced" dangerouslySetInnerHTML={{ __html: svg }} />
                {loaded && (
                  <div className="dim-chip">{loaded.width} × {loaded.height}</div>
                )}
              </>
            ) : (
              <p className="empty">
                {loaded ? 'Adjust the options to trace your image.' : 'Upload an image to trace it to SVG.'}
              </p>
            )}
          </div>
        </section>

        {/* SVG OUTPUT */}
        <aside className="pane controls-pane">
          <div className="pane-head">
            <span className="pane-title pink"><span className="dot" />SVG output</span>
          </div>
          <div className="i2s-output">
            <div className="i2s-code">
              {svg ? (
                <CodeMirror
                  value={svg}
                  height="100%"
                  theme={editorTheme}
                  extensions={[xml()]}
                  editable={false}
                  className="output-editor"
                  basicSetup={{ lineNumbers: false, foldGutter: false, highlightActiveLine: false }}
                />
              ) : (
                <p className="empty">The generated SVG code will appear here.</p>
              )}
            </div>

            <div className="summary">
              <div><span>SVG size</span><strong>{outputSize}</strong></div>
              <div><span>Colors</span><strong>{options.numberOfColors}</strong></div>
            </div>

            <button className="primary" onClick={downloadSvg} disabled={!svg}>
              <Icon name="download" />
              Download SVG
            </button>
            <button className="ghost wide" onClick={copySvg} disabled={!svg}>
              <Icon name={copied ? 'check' : 'clipboard'} color={copied ? 'var(--info)' : undefined} />
              {copied ? 'Copied' : 'Copy SVG'}
            </button>
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
    </div>
  )
}
