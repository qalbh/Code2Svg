export type ImageFormat = 'png' | 'jpeg' | 'webp' | 'svg'

export type Rotation = 0 | 90 | 180 | 270

export interface RenderOptions {
  format: ImageFormat
  scale: number
  width?: number | null
  height?: number | null
  background: string | null
  quality: number
  trim?: boolean
  rotation?: Rotation
  flipH?: boolean
  flipV?: boolean
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

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
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

function escapeAttrValue(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

function serializeAttrs(el: Element): string {
  return Array.from(el.attributes)
    .map((attr) => ` ${attr.name}="${escapeAttrValue(attr.value)}"`)
    .join('')
}

function serializeStandalone(node: Element): string {
  const serialized = new XMLSerializer().serializeToString(node)
  const hadOwnXmlns = Array.from(node.attributes).some((attr) => attr.name === 'xmlns')
  if (hadOwnXmlns) return serialized
  // XMLSerializer adds a default-namespace declaration when a node is
  // serialized outside its parent's context, even if it didn't have one in
  // the original source — strip it back out so formatting stays whitespace-only.
  return serialized.replace(/ xmlns="http:\/\/www\.w3\.org\/2000\/svg"(?=[\s/>])/, '')
}

function prettifyNode(node: Element, depth: number, indentUnit: string): string {
  const indent = indentUnit.repeat(depth)
  const tagName = node.tagName
  const attrs = serializeAttrs(node)
  const children = Array.from(node.childNodes)

  const hasMeaningfulText = children.some(
    (c) => c.nodeType === Node.TEXT_NODE && (c.textContent ?? '').trim() !== '',
  )
  if (hasMeaningfulText) {
    // Whitespace inside text content is rendered, so leave text-bearing (and
    // mixed-content) elements exactly as the browser serializes them rather
    // than risk shifting visible text by re-indenting around it.
    return `${indent}${serializeStandalone(node)}`
  }

  const structuralChildren = children.filter(
    (c) => c.nodeType === Node.ELEMENT_NODE || c.nodeType === Node.COMMENT_NODE,
  )
  if (structuralChildren.length === 0) {
    return `${indent}<${tagName}${attrs}/>`
  }

  const inner = structuralChildren
    .map((child) =>
      child.nodeType === Node.COMMENT_NODE
        ? `${indentUnit.repeat(depth + 1)}<!--${(child as Comment).data}-->`
        : prettifyNode(child as Element, depth + 1, indentUnit),
    )
    .join('\n')

  return `${indent}<${tagName}${attrs}>\n${inner}\n${indent}</${tagName}>`
}

export function prettifySvg(code: string): string {
  const declMatch = code.match(/^\s*(<\?xml[^?]*\?>)\s*/i)
  const declaration = declMatch ? declMatch[1] : ''
  const body = declMatch ? code.slice(declMatch[0].length) : code

  const svg = parseSvg(body)
  const formatted = prettifyNode(svg, 0, '  ')
  return declaration ? `${declaration}\n${formatted}\n` : `${formatted}\n`
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

function normalizeRotation(rotation?: Rotation): Rotation {
  return ((((rotation ?? 0) % 360) + 360) % 360) as Rotation
}

function hasTransform(options: RenderOptions): boolean {
  return normalizeRotation(options.rotation) !== 0 || Boolean(options.flipH) || Boolean(options.flipV)
}

// Wrap the original SVG in an outer <svg> whose group transform reproduces the
// same center-based rotate/flip used for the raster path, so the vector export
// carries the transform too. Output width/height swap for 90°/270°.
function buildTransformedSvg(code: string, width: number, height: number, options: RenderOptions): string {
  const rotation = normalizeRotation(options.rotation)
  const swap = rotation === 90 || rotation === 270
  const outW = swap ? height : width
  const outH = swap ? width : height
  const sx = options.flipH ? -1 : 1
  const sy = options.flipV ? -1 : 1
  const transform =
    `translate(${outW / 2} ${outH / 2}) rotate(${rotation}) ` +
    `scale(${sx} ${sy}) translate(${-width / 2} ${-height / 2})`

  // Give the nested copy an explicit size so it renders at width×height even if
  // the original relied on viewBox alone.
  const inner = new DOMParser().parseFromString(code, 'image/svg+xml').querySelector('svg')!
  inner.setAttribute('width', String(width))
  inner.setAttribute('height', String(height))
  const innerStr = new XMLSerializer().serializeToString(inner)

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${outW}" height="${outH}" ` +
    `viewBox="0 0 ${outW} ${outH}"><g transform="${transform}">${innerStr}</g></svg>`
  )
}

export async function renderToBlob(code: string, options: RenderOptions): Promise<RenderResult> {
  const svg = parseSvg(code)

  if (options.format === 'svg') {
    const { width, height } = intrinsicSize(svg)
    if (!hasTransform(options)) {
      return { blob: new Blob([code], { type: MIME.svg }), width, height }
    }
    const swap = normalizeRotation(options.rotation) === 90 || normalizeRotation(options.rotation) === 270
    const transformed = buildTransformedSvg(code, width, height, options)
    return {
      blob: new Blob([transformed], { type: MIME.svg }),
      width: swap ? height : width,
      height: swap ? width : height,
    }
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

  // Rotation of 90°/270° swaps the output canvas dimensions; flips and rotation
  // are applied as a center-based transform matching the vector path above.
  const rotation = normalizeRotation(options.rotation)
  const swap = rotation === 90 || rotation === 270
  const finalWidth = swap ? outHeight : outWidth
  const finalHeight = swap ? outWidth : outHeight

  const finalCanvas = document.createElement('canvas')
  finalCanvas.width = finalWidth
  finalCanvas.height = finalHeight
  const finalCtx = finalCanvas.getContext('2d')
  if (!finalCtx) {
    throw new Error('Canvas is not supported in this browser.')
  }

  // JPEG has no alpha channel, so a transparent SVG becomes black without a fill.
  const background = options.background ?? (options.format === 'jpeg' ? '#ffffff' : null)
  if (background) {
    finalCtx.fillStyle = background
    finalCtx.fillRect(0, 0, finalWidth, finalHeight)
  }

  finalCtx.save()
  finalCtx.translate(finalWidth / 2, finalHeight / 2)
  finalCtx.rotate((rotation * Math.PI) / 180)
  finalCtx.scale(options.flipH ? -1 : 1, options.flipV ? -1 : 1)
  finalCtx.drawImage(content, -outWidth / 2, -outHeight / 2, outWidth, outHeight)
  finalCtx.restore()

  const blob = await new Promise<Blob | null>((resolve) =>
    finalCanvas.toBlob(resolve, MIME[options.format], options.quality),
  )
  if (!blob) {
    throw new Error('Failed to encode the image.')
  }
  return { blob, width: finalWidth, height: finalHeight }
}
