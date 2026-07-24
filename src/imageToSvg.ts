import ImageTracer from 'imagetracerjs'

// Raster → SVG tracing. All tracing/canvas logic lives here; ImageToSvg.tsx
// only holds UI state.

export const MAX_TRACE_DIMENSION = 1000

export interface TraceOptions {
  // All UI-facing: higher = more detail / more colors / more smoothing.
  numberOfColors: number
  detail: number
  smoothing: number
  scale: number
}

export const DEFAULT_TRACE_OPTIONS: TraceOptions = {
  numberOfColors: 16,
  detail: 60,
  smoothing: 30,
  scale: 1,
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min))

function loadHtmlImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('That file could not be loaded as an image.'))
    img.src = url
  })
}

// Draw an uploaded file onto a canvas and read its pixels, downscaling to
// maxDim on the longest edge first so large photos don't stall the tracer.
export async function fileToImageData(
  file: File,
  maxDim = MAX_TRACE_DIMENSION,
): Promise<{ imageData: ImageData; width: number; height: number }> {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadHtmlImage(url)
    let width = img.naturalWidth
    let height = img.naturalHeight
    if (!width || !height) throw new Error('Could not read the image dimensions.')

    const longest = Math.max(width, height)
    if (longest > maxDim) {
      const ratio = maxDim / longest
      width = Math.max(1, Math.round(width * ratio))
      height = Math.max(1, Math.round(height * ratio))
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas is not supported in this browser.')
    ctx.drawImage(img, 0, 0, width, height)
    return { imageData: ctx.getImageData(0, 0, width, height), width, height }
  } finally {
    URL.revokeObjectURL(url)
  }
}

// Map the UI options (higher = more detail) onto ImageTracer's parameters
// (some of which are inverted — e.g. pathomit drops small paths).
export function traceImageData(data: ImageData, options: TraceOptions): string {
  const detail = clamp(options.detail, 0, 100)
  const smoothing = clamp(options.smoothing, 0, 100)
  const numberofcolors = clamp(Math.round(options.numberOfColors), 2, 64)
  const scale = options.scale > 0 ? options.scale : 1

  const svg = ImageTracer.imagedataToSVG(data, {
    numberofcolors,
    // Higher detail → omit fewer small paths.
    pathomit: Math.max(0, Math.round((100 - detail) / 8)),
    // Higher smoothing → larger straight/curve error thresholds.
    ltres: 0.1 + (smoothing / 100) * 4,
    qtres: 0.1 + (smoothing / 100) * 4,
    scale,
    roundcoords: 1,
    linefilter: true,
    viewbox: true,
  })
  return svg
}
