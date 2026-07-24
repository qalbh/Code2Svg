import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'
import { zipBlobs } from './zipBlobs'

type ItemState = 'pending' | 'processing' | 'done' | 'error'

interface Item {
  name: string
  state: ItemState
  message?: string
}

interface BatchModalProps {
  title: string
  files: File[]
  // Convert one input file to a named output blob. Throwing marks that file as
  // failed without aborting the rest of the batch.
  convert: (file: File) => Promise<{ name: string; blob: Blob }>
  zipName: string
  onClose: () => void
}

// Generic batch runner shared by both tools: it processes the queue one file at a
// time (keeping memory bounded and the UI responsive), shows per-file progress,
// and zips the successful outputs. The per-file conversion is supplied by the
// caller, so no tool logic is duplicated here.
export function BatchModal({ title, files, convert, zipName, onClose }: BatchModalProps) {
  const [items, setItems] = useState<Item[]>(() => files.map((f) => ({ name: f.name, state: 'pending' })))
  const [running, setRunning] = useState(true)
  const [zipping, setZipping] = useState(false)
  const resultsRef = useRef<{ name: string; blob: Blob }[]>([])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      for (let i = 0; i < files.length; i++) {
        if (cancelled) return
        setItems((prev) => prev.map((it, j) => (j === i ? { ...it, state: 'processing' } : it)))
        try {
          const result = await convert(files[i])
          if (cancelled) return
          resultsRef.current.push(result)
          setItems((prev) => prev.map((it, j) => (j === i ? { ...it, state: 'done' } : it)))
        } catch (err) {
          if (cancelled) return
          const message = err instanceof Error ? err.message : 'Could not convert this file.'
          setItems((prev) => prev.map((it, j) => (j === i ? { ...it, state: 'error', message } : it)))
        }
      }
      if (!cancelled) setRunning(false)
    }
    run()
    return () => {
      cancelled = true
    }
    // Files/convert are captured for the lifetime of one modal instance.
  }, [files, convert])

  const doneCount = items.filter((it) => it.state === 'done').length

  const downloadZip = async () => {
    if (!resultsRef.current.length) return
    setZipping(true)
    try {
      const blob = await zipBlobs(resultsRef.current)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = zipName
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } finally {
      setZipping(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span className="pane-title">{title}</span>
          <button className="ghost" onClick={onClose}>Close</button>
        </div>
        <div className="modal-body">
          <p className="hint">
            {running
              ? `Converting… ${doneCount} / ${files.length}`
              : `Converted ${doneCount} of ${files.length} file${files.length === 1 ? '' : 's'}.`}
          </p>
          <ul className="batch-list">
            {items.map((it, i) => (
              <li key={i} className={`batch-item ${it.state}`}>
                <span className="batch-status" aria-hidden="true">
                  {it.state === 'done' && <Icon name="check" color="var(--info)" />}
                  {it.state === 'processing' && <span className="batch-spinner" />}
                  {it.state === 'error' && '!'}
                </span>
                <span className="batch-name">{it.name}</span>
                {it.message && <span className="batch-msg">{it.message}</span>}
              </li>
            ))}
          </ul>
          <button
            className="primary"
            onClick={downloadZip}
            disabled={running || zipping || doneCount === 0}
          >
            <Icon name="download" />
            {zipping ? 'Zipping…' : `Download ZIP (${doneCount})`}
          </button>
        </div>
      </div>
    </div>
  )
}
