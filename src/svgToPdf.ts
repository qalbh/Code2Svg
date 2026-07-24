import { getSvgDimensions } from './svgToImage'

// True vector PDF export. jspdf + svg2pdf.js are heavy (~350 kB together) and
// only needed when the user actually exports a PDF, so they're dynamically
// imported here rather than pulled into the main bundle.
export async function renderToPdf(code: string): Promise<Blob> {
  const { width, height } = getSvgDimensions(code)

  const doc = new DOMParser().parseFromString(code, 'image/svg+xml')
  if (doc.querySelector('parsererror')) {
    throw new Error('The SVG code is not valid XML.')
  }
  const svgEl = doc.querySelector('svg')
  if (!svgEl) {
    throw new Error('No <svg> element found in the code.')
  }

  const [{ jsPDF }, svg2pdfMod] = await Promise.all([import('jspdf'), import('svg2pdf.js')])
  // svg2pdf.js exposes the renderer as a named export in current versions; fall
  // back to the default export for safety across builds.
  const svg2pdf = (svg2pdfMod as { svg2pdf?: unknown; default?: unknown }).svg2pdf
    ?? (svg2pdfMod as { default?: unknown }).default
  if (typeof svg2pdf !== 'function') {
    throw new Error('Could not load the PDF renderer.')
  }

  // svg2pdf measures the element (getBBox / computed styles), so it must be in
  // the document — mount it off-screen while we render, then remove it.
  const holder = document.createElement('div')
  holder.style.cssText = 'position:absolute;left:-99999px;top:0;width:0;height:0;overflow:hidden'
  const liveSvg = document.importNode(svgEl, true) as SVGSVGElement
  liveSvg.setAttribute('width', String(width))
  liveSvg.setAttribute('height', String(height))
  holder.appendChild(liveSvg)
  document.body.appendChild(holder)

  try {
    const pdf = new jsPDF({
      unit: 'pt',
      format: [width, height],
      orientation: width >= height ? 'landscape' : 'portrait',
    })
    await (svg2pdf as (el: Element, pdf: unknown, opts: unknown) => Promise<unknown>)(liveSvg, pdf, {
      x: 0,
      y: 0,
      width,
      height,
    })
    return pdf.output('blob')
  } finally {
    holder.remove()
  }
}
