export type ImageFormat = 'png' | 'jpeg' | 'webp' | 'svg'

export interface RenderOptions {
  format: ImageFormat
  scale: number
  width?: number | null
  height?: number | null
  background: string | null
  quality: number
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

function svgToDataUrl(code: string): string {
  const encoded = encodeURIComponent(code)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22')
  return `data:image/svg+xml;charset=utf-8,${encoded}`
}

export async function renderToBlob(code: string, options: RenderOptions): Promise<Blob> {
  const svg = parseSvg(code)

  if (options.format === 'svg') {
    return new Blob([code], { type: MIME.svg })
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

  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas is not supported in this browser.')
  }

  // JPEG has no alpha channel, so a transparent SVG becomes black without a fill.
  const background = options.background ?? (options.format === 'jpeg' ? '#ffffff' : null)
  if (background) {
    ctx.fillStyle = background
    ctx.fillRect(0, 0, targetWidth, targetHeight)
  }

  ctx.drawImage(image, 0, 0, targetWidth, targetHeight)

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, MIME[options.format], options.quality),
  )
  if (!blob) {
    throw new Error('Failed to encode the image.')
  }
  return blob
}
