export type ImageFormat = 'png' | 'jpeg' | 'webp' | 'svg'

export interface RenderOptions {
  format: ImageFormat
  scale: number
  width?: number | null
  height?: number | null
  background: string | null
  quality: number
  trim?: boolean
}

export interface RenderResult {
  blob: Blob
  width: number
  height: number
}

interface Dimensions {
  width: number
  height: number
}

const MIME: Record<ImageFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  svg: 'image/svg+xml',
}

export function fileExtension(format: ImageFormat): string {
  return format === 'jpeg' ? 'jpg' : format
}

export interface XmlError {
  message: string
  line: number
  column: number
}

const FALLBACK_MESSAGE = 'The SVG code is not valid XML.'

// Chrome/Safari (WebKit): "...error on line 2 at column 3: error parsing attribute name..."
const WEBKIT_PATTERN = /error\s+on\s+line\s+(\d+)\s+at\s+column\s+(\d+)\s*:\s*([\s\S]*?)(?:Below is a rendering|This page contains|$)/i

// Firefox: "XML Parsing Error: <description>\nLocation: ...\nLine Number 2, Column 5:"
const FIREFOX_PATTERN = /^([\s\S]*?)Location:[\s\S]*?Line Number\s*(\d+),\s*Column\s*(\d+)/i

export function findXmlError(code: string): XmlError | null {
  if (!code.trim()) return null
  const doc = new DOMParser().parseFromString(code, 'image/svg+xml')
  const errorNode = doc.querySelector('parsererror')
  if (!errorNode) return null

  const text = errorNode.textContent ?? FALLBACK_MESSAGE

  const webkit = text.match(WEBKIT_PATTERN)
  if (webkit) {
    return {
      message: webkit[3].trim() || FALLBACK_MESSAGE,
      line: Number(webkit[1]),
      column: Number(webkit[2]),
    }
  }

  const firefox = text.match(FIREFOX_PATTERN)
  if (firefox) {
    return {
      message: firefox[1].replace(/^XML Parsing Error:\s*/i, '').trim() || FALLBACK_MESSAGE,
      line: Number(firefox[2]),
      column: Number(firefox[3]),
    }
  }

  const generic = text.match(/line\D*?(\d+)[^\d]*column\D*?(\d+)/i)
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean)
  return {
    message: lines[0] || FALLBACK_MESSAGE,
    line: generic ? Number(generic[1]) : 1,
    column: generic ? Number(generic[2]) : 1,
  }
}

function parseSvg(code: string): SVGSVGElement {
  const doc = new DOMParser().parseFromString(code, 'image/svg+xml')
  const parseError = doc.querySelector('parsererror')
  if (parseError) {
    throw new Error('The SVG code is not valid XML.')
  }
  const svg = doc.querySelector('svg')
  if (!svg) {
    throw new Error('No <svg> element found in the code.')
  }
  return svg as unknown as SVGSVGElement
}

function intrinsicSize(svg: SVGSVGElement): Dimensions {
  const width = parseFloat(svg.getAttribute('width') ?? '')
  const height = parseFloat(svg.getAttribute('height') ?? '')
  if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
    return { width, height }
  }

  const viewBox = svg.getAttribute('viewBox')
  if (viewBox) {
    const parts = viewBox.split(/[\s,]+/).map(Number)
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      return { width: parts[2], height: parts[3] }
    }
  }

  return { width: 512, height: 512 }
}

export function getSvgDimensions(code: string): Dimensions {
  return intrinsicSize(parseSvg(code))
}

const COLOR_ATTR_PATTERN = /\b(?:fill|stroke|stop-color)\s*=\s*["']([^"']+)["']/gi
const NON_COLOR_VALUES = new Set(['none', 'transparent', 'currentcolor'])

export function findColors(code: string): string[] {
  const seen = new Set<string>()
  const colors: string[] = []
  for (const match of code.matchAll(COLOR_ATTR_PATTERN)) {
    const raw = match[1].trim()
    const key = raw.toLowerCase()
    if (!raw || NON_COLOR_VALUES.has(key) || key.startsWith('url(')) continue
    if (seen.has(key)) continue
    seen.add(key)
    colors.push(raw)
  }
  return colors
}

export function replaceColor(code: string, oldColor: string, newColor: string): string {
  const escaped = oldColor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`\\b(fill|stroke|stop-color)(\\s*=\\s*)(["'])${escaped}\\3`, 'gi')
  return code.replace(pattern, (_full, attr, eq, quote) => `${attr}${eq}${quote}${newColor}${quote}`)
}

export function normalizeColorToHex(color: string): string | null {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const sentinel = '#010203'
  ctx.fillStyle = sentinel
  ctx.fillStyle = color
  const result = ctx.fillStyle
  if (result === sentinel) return null

  if (result.startsWith('#')) return result
  const match = result.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!match) return null
  const toHex = (n: string) => Number(n).toString(16).padStart(2, '0')
  return `#${toHex(match[1])}${toHex(match[2])}${toHex(match[3])}`
}

function svgToDataUrl(code: string): string {
  const encoded = encodeURIComponent(code)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22')
  return `data:image/svg+xml;charset=utf-8,${encoded}`
}

interface ContentBounds {
  x: number
  y: number
  width: number
  height: number
}

const TRIM_TOLERANCE = 10

function findContentBounds(ctx: CanvasRenderingContext2D, width: number, height: number): ContentBounds | null {
  const { data } = ctx.getImageData(0, 0, width, height)

  // Treat the corner pixel's color as the "background" to strip, whether that's
  // transparent or a solid fill (e.g. a white background box drawn in the SVG itself).
  const bgR = data[0]
  const bgG = data[1]
  const bgB = data[2]
  const bgA = data[3]

  let top = -1
  let bottom = -1
  let left = width
  let right = -1

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const isBackground =
        Math.abs(data[i] - bgR) <= TRIM_TOLERANCE &&
        Math.abs(data[i + 1] - bgG) <= TRIM_TOLERANCE &&
        Math.abs(data[i + 2] - bgB) <= TRIM_TOLERANCE &&
        Math.abs(data[i + 3] - bgA) <= TRIM_TOLERANCE
      if (isBackground) continue
      if (top === -1) top = y
      bottom = y
      if (x < left) left = x
      if (x > right) right = x
    }
  }

  if (top === -1) return null

  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 }
}

export async function renderToBlob(code: string, options: RenderOptions): Promise<RenderResult> {
  const svg = parseSvg(code)

  if (options.format === 'svg') {
    const { width, height } = intrinsicSize(svg)
    return { blob: new Blob([code], { type: MIME.svg }), width, height }
  }

  const { width, height } = intrinsicSize(svg)
  const targetWidth = Math.max(1, Math.round(options.width ?? width * options.scale))
  const targetHeight = Math.max(1, Math.round(options.height ?? height * options.scale))

  const image = new Image()
  image.crossOrigin = 'anonymous'
  const url = svgToDataUrl(code)

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('Could not render the SVG. Check for external references or malformed markup.'))
    image.src = url
  })

  // Render transparently first so trim (and any background fill) can be applied afterward.
  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas is not supported in this browser.')
  }
  ctx.drawImage(image, 0, 0, targetWidth, targetHeight)

  let content: CanvasImageSource = canvas
  let outWidth = targetWidth
  let outHeight = targetHeight

  if (options.trim) {
    const bounds = findContentBounds(ctx, targetWidth, targetHeight)
    if (bounds) {
      const trimmed = document.createElement('canvas')
      trimmed.width = bounds.width
      trimmed.height = bounds.height
      const trimmedCtx = trimmed.getContext('2d')
      if (!trimmedCtx) {
        throw new Error('Canvas is not supported in this browser.')
      }
      trimmedCtx.drawImage(canvas, bounds.x, bounds.y, bounds.width, bounds.height, 0, 0, bounds.width, bounds.height)
      content = trimmed
      outWidth = bounds.width
      outHeight = bounds.height
    }
  }

  const finalCanvas = document.createElement('canvas')
  finalCanvas.width = outWidth
  finalCanvas.height = outHeight
  const finalCtx = finalCanvas.getContext('2d')
  if (!finalCtx) {
    throw new Error('Canvas is not supported in this browser.')
  }

  // JPEG has no alpha channel, so a transparent SVG becomes black without a fill.
  const background = options.background ?? (options.format === 'jpeg' ? '#ffffff' : null)
  if (background) {
    finalCtx.fillStyle = background
    finalCtx.fillRect(0, 0, outWidth, outHeight)
  }
  finalCtx.drawImage(content, 0, 0)

  const blob = await new Promise<Blob | null>((resolve) =>
    finalCanvas.toBlob(resolve, MIME[options.format], options.quality),
  )
  if (!blob) {
    throw new Error('Failed to encode the image.')
  }
  return { blob, width: outWidth, height: outHeight }
}
