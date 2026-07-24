import { GIFEncoder, quantize, applyPalette } from 'gifenc'
import { getSvgDimensions } from './svgToImage'

export interface GifOptions {
  scale: number
  duration: number
  fps: number
  background: string | null
  onProgress?: (fraction: number) => void
}

const ANIMATION_PATTERN =
  /<animate\b|<animateTransform\b|<animateMotion\b|<set\b|@keyframes|animation\s*:|animation-name\s*:/i

const SMIL_TAGS = ['animate', 'animateTransform', 'animateMotion', 'set']

export function hasAnimation(code: string): boolean {
  return ANIMATION_PATTERN.test(code)
}

// Seek the animation to time `t` by rewriting it so time t becomes its starting
// (initial) frame. This is the crux of the whole feature: browsers render an
// animated SVG loaded into an <img> as a STILL of its initial frame when drawn
// to a canvas — the live timeline is never captured. So instead of sampling a
// playing image, we bake each moment into its own SVG whose t=0 IS that moment:
//   - SMIL: begin="-{t}s" starts every timed element t seconds "ago".
//   - CSS: animation-delay:-{t}s, paused, does the same for keyframe animations.
function buildFrameSvg(baseSvg: SVGSVGElement, t: number): string {
  const svg = baseSvg.cloneNode(true) as SVGSVGElement

  for (const tag of SMIL_TAGS) {
    for (const el of Array.from(svg.getElementsByTagName(tag))) {
      el.setAttribute('begin', `${-t}s`)
    }
  }

  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style')
  style.textContent =
    `*,*::before,*::after{` +
    `animation-delay:${-t}s!important;-webkit-animation-delay:${-t}s!important;` +
    `animation-play-state:paused!important;-webkit-animation-play-state:paused!important;}`
  svg.insertBefore(style, svg.firstChild)

  return new XMLSerializer().serializeToString(svg)
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () =>
      reject(new Error('Could not render the SVG. Check for external references or malformed markup.'))
    img.src = url
  })
}

export async function renderToGif(code: string, options: GifOptions): Promise<Blob> {
  const doc = new DOMParser().parseFromString(code, 'image/svg+xml')
  if (doc.querySelector('parsererror')) {
    throw new Error('The SVG code is not valid XML.')
  }
  const baseSvg = doc.querySelector('svg')
  if (!baseSvg) {
    throw new Error('No <svg> element found in the code.')
  }

  const { width, height } = getSvgDimensions(code)
  const targetWidth = Math.max(1, Math.round(width * options.scale))
  const targetHeight = Math.max(1, Math.round(height * options.scale))

  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    throw new Error('Canvas is not supported in this browser.')
  }

  const frameCount = Math.max(2, Math.round(options.duration * options.fps))
  const delayMs = Math.round(1000 / options.fps)
  const encoder = GIFEncoder()
  // GIF has only 1-bit transparency, so composite onto a solid background
  // (white by default) rather than emitting ragged half-transparent edges.
  const background = options.background ?? '#ffffff'

  for (let i = 0; i < frameCount; i++) {
    const t = (i / frameCount) * options.duration
    const frameSvg = buildFrameSvg(baseSvg as SVGSVGElement, t)
    const url = URL.createObjectURL(new Blob([frameSvg], { type: 'image/svg+xml' }))
    try {
      const image = await loadImage(url)
      ctx.fillStyle = background
      ctx.fillRect(0, 0, targetWidth, targetHeight)
      ctx.drawImage(image, 0, 0, targetWidth, targetHeight)
    } finally {
      URL.revokeObjectURL(url)
    }

    const { data } = ctx.getImageData(0, 0, targetWidth, targetHeight)
    const palette = quantize(data, 256)
    const indexed = applyPalette(data, palette)
    encoder.writeFrame(indexed, targetWidth, targetHeight, { palette, delay: delayMs })

    options.onProgress?.((i + 1) / frameCount)
  }

  encoder.finish()
  const bytes = encoder.bytes()
  return new Blob([bytes.slice().buffer], { type: 'image/gif' })
}
