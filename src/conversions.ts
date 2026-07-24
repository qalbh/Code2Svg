import type { ImageFormat } from './svgToImage'

// Keyword-targeted landing pages. Each entry is one crawlable URL (/<slug>) that
// reuses an existing tool (the SVG→Image converter or the Image→SVG tracer),
// pre-set to a conversion, wrapped in SEO copy.
//
// To add a new landing page:
//   1. Add one entry to CONVERSIONS below (slug + tool + copy).
//   2. Copy an existing <slug>.html at the project root to <new-slug>.html and
//      edit its <head> meta, JSON-LD, and the static <section class="seo-content">
//      to match the new entry (keep the copy identical to this config).
//   3. Add one line to build.rollupOptions.input in vite.config.ts.
//   4. Add one <url> to public/sitemap.xml.
// The shared runtime entry (src/main-landing.tsx) needs no changes — it looks the
// conversion up by the #root data-conversion slug and renders the right tool.

export interface ConversionFaq {
  q: string
  a: string
}

export interface Conversion {
  slug: string // e.g. 'svg-to-png' → URL /svg-to-png
  tool: 'svgToImage' | 'imageToSvg'
  defaultFormat?: ImageFormat // for svgToImage pages (sets the initial format)
  label: string // short label for interlink rows, e.g. 'SVG to PNG'
  title: string // <title>
  description: string // meta description
  h1: string
  intro: string[] // 1–2 paragraphs
  howto: string[] // ordered steps
  faq: ConversionFaq[] // 4–6 items
}

export const CONVERSIONS: Conversion[] = [
  {
    slug: 'svg-to-png',
    tool: 'svgToImage',
    defaultFormat: 'png',
    label: 'SVG to PNG',
    title: 'SVG to PNG Converter — Convert SVG to PNG Online Free | Code2Svg',
    description:
      'Convert SVG to PNG online for free. Paste SVG code or upload a file, set an exact size or scale, add a background, and download a crisp, transparent PNG — all in your browser.',
    h1: 'SVG to PNG Converter',
    intro: [
      'Convert SVG to PNG right in your browser — no uploads, no sign-up, no watermark. Paste your SVG markup or drop in an .svg file and Code2Svg renders it to a pixel-perfect PNG using the canvas API, so your artwork never leaves your device.',
      'PNG keeps a transparent background by default, which makes it the go-to format for logos, icons, and UI assets. Export at an exact width and height or scale up to 4× for retina screens, add a solid background if you need one, and auto-crop the transparent padding before you download.',
    ],
    howto: [
      'Paste your SVG code into the editor, or upload / drag in an .svg file.',
      'Keep the format on PNG and set the size — a scale factor (up to @4×) or exact pixel width and height.',
      'Optionally add a background color or auto-crop to the artwork, then click Download PNG (or copy the PNG straight to your clipboard).',
    ],
    faq: [
      {
        q: 'How do I convert an SVG to PNG?',
        a: 'Paste your SVG code or upload an .svg file, leave the format on PNG, choose a size, and click Download PNG. The conversion happens instantly in your browser.',
      },
      {
        q: 'Does the PNG keep a transparent background?',
        a: 'Yes. PNG supports transparency, so unless you turn on a background color the exported PNG keeps the transparent areas of your SVG.',
      },
      {
        q: 'Can I export a high-resolution or retina PNG?',
        a: 'Yes. Use the scale presets up to @4×, or switch to Custom size and enter an exact pixel width and height with an optional aspect-ratio lock.',
      },
      {
        q: 'Is my SVG uploaded to a server?',
        a: 'No. Code2Svg renders the PNG locally with the canvas API — your SVG code and the exported image never leave your browser.',
      },
      {
        q: 'Is the SVG to PNG converter free?',
        a: 'Completely free, with no account, no watermark, and no limits on how many files you convert.',
      },
    ],
  },
  {
    slug: 'svg-to-jpg',
    tool: 'svgToImage',
    defaultFormat: 'jpeg',
    label: 'SVG to JPG',
    title: 'SVG to JPG Converter — Convert SVG to JPG Online Free | Code2Svg',
    description:
      'Convert SVG to JPG online for free. Paste SVG code or upload a file, pick a size and quality, choose a background, and download a compact JPG image — entirely in your browser.',
    h1: 'SVG to JPG Converter',
    intro: [
      'Turn SVG into a JPG image in seconds, entirely in your browser. Paste your SVG or upload a file and Code2Svg rasterizes it to a JPEG with an adjustable quality slider, so you can trade a little sharpness for a much smaller file when you need it.',
      'JPG has no transparency, so a background color is always applied (white by default) to avoid a black fill — pick any color to match where the image will live. It is a great fit for photos, social thumbnails, and email where a small, universally-supported raster wins over a vector.',
    ],
    howto: [
      'Paste your SVG code into the editor, or upload / drag in an .svg file.',
      'Keep the format on JPG, set the size, and drag the Quality slider to balance sharpness against file size.',
      'Choose a background color (JPG has no transparency), then click Download JPG.',
    ],
    faq: [
      {
        q: 'How do I convert an SVG to JPG?',
        a: 'Paste your SVG or upload an .svg file, set the format to JPG, choose a size and quality, and click Download JPG. It all runs in your browser.',
      },
      {
        q: 'Why does my JPG have a white background?',
        a: 'JPG cannot store transparency, so Code2Svg fills the transparent areas with a background color — white by default. You can pick any color in the Background option.',
      },
      {
        q: 'Can I control the JPG quality and file size?',
        a: 'Yes. The Quality slider (10–100%) lets you trade image sharpness for a smaller file, and the estimated file size updates live as you adjust it.',
      },
      {
        q: 'Should I use JPG or PNG for my SVG?',
        a: 'Use PNG when you need transparency or crisp edges (logos, icons); use JPG for photographic content or when you need the smallest possible file and do not need transparency.',
      },
      {
        q: 'Is the SVG to JPG converter free and private?',
        a: 'Yes. It is free with no watermark, and the conversion happens locally — nothing is uploaded to a server.',
      },
    ],
  },
  {
    slug: 'svg-to-webp',
    tool: 'svgToImage',
    defaultFormat: 'webp',
    label: 'SVG to WebP',
    title: 'SVG to WebP Converter — Convert SVG to WebP Online Free | Code2Svg',
    description:
      'Convert SVG to WebP online for free. Paste SVG code or upload a file, set the size and quality, and download a small, modern WebP image with transparency — all in your browser.',
    h1: 'SVG to WebP Converter',
    intro: [
      'Convert SVG to WebP in your browser and get the best of both worlds: WebP supports transparency like PNG but compresses far smaller, which makes it ideal for fast-loading websites. Paste your SVG or upload a file and export a modern WebP in one click.',
      'Use the quality slider to dial in the trade-off between crispness and file size, scale up for high-density displays, and keep a transparent background or add a solid color. Everything renders locally with the canvas API — your artwork is never uploaded.',
    ],
    howto: [
      'Paste your SVG code into the editor, or upload / drag in an .svg file.',
      'Set the format to WebP, choose a size, and use the Quality slider to balance sharpness and file size.',
      'Keep transparency or add a background color, then click Download WebP.',
    ],
    faq: [
      {
        q: 'How do I convert an SVG to WebP?',
        a: 'Paste your SVG or upload an .svg file, set the format to WebP, choose a size and quality, and click Download WebP — it runs entirely in your browser.',
      },
      {
        q: 'Does WebP support transparency?',
        a: 'Yes. WebP keeps the transparent areas of your SVG, so you get PNG-style transparency at a much smaller file size.',
      },
      {
        q: 'Why choose WebP over PNG or JPG?',
        a: 'WebP typically produces smaller files than both PNG and JPG at similar quality while still supporting transparency, which helps pages load faster. It is supported by all modern browsers.',
      },
      {
        q: 'Can I adjust WebP quality and size?',
        a: 'Yes. Use the Quality slider and either a scale preset or an exact custom width and height. The estimated file size updates live.',
      },
      {
        q: 'Is the SVG to WebP converter free and private?',
        a: 'Yes — free, no watermark, and fully client-side. Your SVG never leaves your device.',
      },
    ],
  },
  {
    slug: 'png-to-svg',
    tool: 'imageToSvg',
    label: 'PNG to SVG',
    title: 'PNG to SVG Converter — Vectorize PNG Online Free | Code2Svg',
    description:
      'Convert PNG to SVG online for free. Upload or drag a PNG and trace it to a scalable vector SVG in your browser, with adjustable colors, detail, and smoothing. Best for logos and flat graphics.',
    h1: 'PNG to SVG Converter',
    intro: [
      'Convert a PNG into a scalable SVG right in your browser. Upload or drag in a PNG and Code2Svg traces it into clean vector paths with imagetracerjs — no uploads and no sign-up. Tune the number of colors, detail, and smoothing and watch the trace update live.',
      'Vectorizing works best for logos, icons, and flat or simple graphics with solid areas of color — not detailed photographs, where a raster format stays the better choice. When you are happy with the preview, copy the SVG code or download the .svg file.',
    ],
    howto: [
      'Upload or drag a PNG (or JPG) onto the page.',
      'Adjust the Number of colors, Detail, and Smoothing sliders until the live trace looks right.',
      'Copy the generated SVG code or click Download SVG.',
    ],
    faq: [
      {
        q: 'How do I convert a PNG to SVG?',
        a: 'Upload or drag a PNG onto the page, adjust the colors, detail, and smoothing sliders, and copy or download the traced SVG. The tracing runs entirely in your browser.',
      },
      {
        q: 'What kind of PNG converts best to SVG?',
        a: 'Logos, icons, and flat graphics with solid color areas trace cleanly. Photographs and images with gradients or fine detail do not vectorize well — a raster format is better for those.',
      },
      {
        q: 'Can I adjust the traced result?',
        a: 'Yes. The Number of colors, Detail, and Smoothing sliders control how faithfully and how smoothly the image is traced, and the preview updates live as you change them.',
      },
      {
        q: 'Does converting PNG to SVG make the image editable?',
        a: 'The trace produces real vector paths you can scale without losing quality and edit in any vector editor, though a traced result will not perfectly match a hand-drawn original.',
      },
      {
        q: 'Is the PNG to SVG converter free and private?',
        a: 'Yes. It is free with no watermark, and your image is traced locally in your browser — nothing is uploaded to a server.',
      },
    ],
  },
  {
    slug: 'svg-to-pdf',
    tool: 'svgToImage',
    defaultFormat: 'pdf',
    label: 'SVG to PDF',
    title: 'SVG to PDF Converter — Convert SVG to PDF Online Free | Code2Svg',
    description:
      'Convert SVG to PDF online for free. Paste SVG code or upload a file and export a true vector PDF, sized to your artwork and crisp at any zoom — all in your browser, nothing uploaded.',
    h1: 'SVG to PDF Converter',
    intro: [
      'Convert SVG to a true vector PDF right in your browser. Paste your SVG or upload a file and Code2Svg writes a real vector PDF — not a screenshot — so every path and piece of text stays razor-sharp at any zoom or print size.',
      'The PDF page is sized to your SVG\'s own dimensions, making it perfect for print-ready logos, diagrams, and icons you need to drop into a document or send to a printer. Everything is generated locally; your artwork is never uploaded.',
    ],
    howto: [
      'Paste your SVG code into the editor, or upload / drag in an .svg file.',
      'Set the export format to PDF.',
      'Click Download PDF — you get a vector PDF sized to your artwork.',
    ],
    faq: [
      {
        q: 'How do I convert an SVG to PDF?',
        a: 'Paste your SVG or upload an .svg file, set the format to PDF, and click Download PDF. The vector PDF is generated in your browser.',
      },
      {
        q: 'Is the PDF a real vector, or just an image?',
        a: 'It is a true vector PDF — the SVG paths and text are drawn as vectors, so the result stays sharp at any zoom level and prints cleanly.',
      },
      {
        q: 'What size is the PDF page?',
        a: 'The page is sized to your SVG\'s own width and height (in points), so the artwork fills the page without extra margins.',
      },
      {
        q: 'Is my SVG uploaded to a server?',
        a: 'No. The PDF is built entirely in your browser — your SVG never leaves your device.',
      },
      {
        q: 'Is the SVG to PDF converter free?',
        a: 'Yes, completely free with no account and no watermark.',
      },
    ],
  },
  {
    slug: 'svg-to-ico',
    tool: 'svgToImage',
    defaultFormat: 'ico',
    label: 'SVG to ICO',
    title: 'SVG to ICO Converter — Convert SVG to ICO Favicon Online | Code2Svg',
    description:
      'Convert SVG to ICO online for free. Turn an SVG into a multi-size .ico favicon (16, 32, and 48 px) in your browser, or grab the full favicon package. Nothing is uploaded.',
    h1: 'SVG to ICO Converter',
    intro: [
      'Convert SVG to a real .ico favicon in your browser. Code2Svg renders your SVG to the classic favicon sizes — 16, 32, and 48 px — and packs them into a single multi-resolution .ico file that browsers pick the right size from automatically.',
      'Need more than the .ico? Grab the full favicon package as a ZIP: the .ico, PNG icons, an Apple touch icon, the source SVG, a web app manifest, and an HTML snippet to paste into your <head>. Everything is generated locally.',
    ],
    howto: [
      'Paste your SVG code into the editor, or upload / drag in an .svg file.',
      'Set the export format to ICO.',
      'Click Download ICO for the favicon, or Favicon package (.zip) for the complete set.',
    ],
    faq: [
      {
        q: 'How do I convert an SVG to ICO?',
        a: 'Paste your SVG or upload an .svg file, set the format to ICO, and click Download ICO. The multi-size .ico is generated in your browser.',
      },
      {
        q: 'What sizes are inside the .ico file?',
        a: 'The .ico packs 16, 32, and 48 px versions, so browsers and Windows can pick the right resolution for the tab, taskbar, or shortcut.',
      },
      {
        q: 'Can I get a full favicon set, not just the .ico?',
        a: 'Yes. The Favicon package (.zip) button also gives you PNG icons, an Apple touch icon, the source SVG, a web app manifest, and a ready-to-paste HTML snippet.',
      },
      {
        q: 'Is my SVG uploaded to a server?',
        a: 'No. The .ico is assembled entirely in your browser — your SVG never leaves your device.',
      },
      {
        q: 'Is the SVG to ICO converter free?',
        a: 'Yes, free with no account and no watermark.',
      },
    ],
  },
  {
    slug: 'svg-to-favicon',
    tool: 'svgToImage',
    defaultFormat: 'ico',
    label: 'Favicon Generator',
    title: 'Favicon Generator — Create a Favicon from SVG Online Free | Code2Svg',
    description:
      'Free online favicon generator. Turn an SVG into a complete favicon package — .ico, PNG icons, Apple touch icon, web manifest, and an HTML snippet — right in your browser. Nothing is uploaded.',
    h1: 'Favicon Generator',
    intro: [
      'Generate a complete favicon set from an SVG, free and in your browser. Paste or upload your SVG and Code2Svg produces everything a modern site needs: a multi-size favicon.ico, 16/32 px PNGs, a 180 px Apple touch icon, 192/512 px app icons, the crisp source SVG, a site.webmanifest, and an HTML snippet to paste into your <head>.',
      'It all downloads as a single ZIP, ready to drop into your site root. Because the icons are rendered locally, your artwork is never uploaded to a server.',
    ],
    howto: [
      'Paste your SVG code into the editor, or upload / drag in an .svg file.',
      'Leave the format on ICO (the favicon format).',
      'Click Favicon package (.zip) to download the complete set, then add the included HTML snippet to your <head>.',
    ],
    faq: [
      {
        q: 'What is in the favicon package?',
        a: 'A multi-size favicon.ico, 16/32 px PNG icons, a 180 px Apple touch icon, 192/512 px app icons, the source SVG, a site.webmanifest, and an HTML snippet with the <link> tags — all in one ZIP.',
      },
      {
        q: 'How do I add the favicon to my site?',
        a: 'Unzip the files into your site root and paste the included head-snippet.html tags into your page\'s <head>. Browsers will pick the right icon automatically.',
      },
      {
        q: 'Do I need a specific image to start?',
        a: 'Any SVG works, but a simple, bold square design reads best at tiny favicon sizes. Logos and icons work far better than detailed artwork.',
      },
      {
        q: 'Is my image uploaded anywhere?',
        a: 'No. Every icon is rendered in your browser and zipped locally — nothing is uploaded to a server.',
      },
      {
        q: 'Is the favicon generator free?',
        a: 'Yes, completely free with no account and no watermark.',
      },
    ],
  },
  {
    slug: 'jpg-to-svg',
    tool: 'imageToSvg',
    label: 'JPG to SVG',
    title: 'JPG to SVG Converter — Vectorize JPG Online Free | Code2Svg',
    description:
      'Convert JPG to SVG online for free. Upload or drag a JPG and trace it to a scalable vector SVG in your browser, with adjustable colors, detail, and smoothing. Best for logos and flat graphics.',
    h1: 'JPG to SVG Converter',
    intro: [
      'Convert a JPG into a scalable SVG right in your browser. Upload or drag in a JPG and Code2Svg traces it into clean vector paths with imagetracerjs — no uploads and no sign-up. Adjust the number of colors, detail, and smoothing and watch the trace update live.',
      'Tracing works best for logos, icons, and flat or simple graphics — not detailed photographs, which don\'t vectorize well. When the preview looks right, copy the SVG code or download the .svg file.',
    ],
    howto: [
      'Upload or drag a JPG (or PNG) onto the page.',
      'Adjust the Number of colors, Detail, and Smoothing sliders until the live trace looks right.',
      'Copy the generated SVG code or click Download SVG.',
    ],
    faq: [
      {
        q: 'How do I convert a JPG to SVG?',
        a: 'Upload or drag a JPG onto the page, adjust the colors, detail, and smoothing sliders, and copy or download the traced SVG. The tracing runs entirely in your browser.',
      },
      {
        q: 'What kind of JPG converts best to SVG?',
        a: 'Logos, icons, and flat graphics with solid color areas trace cleanly. Photographs and images with gradients or fine detail do not vectorize well — a raster format is better for those.',
      },
      {
        q: 'Can I adjust the traced result?',
        a: 'Yes. The Number of colors, Detail, and Smoothing sliders control how faithfully and how smoothly the image is traced, and the preview updates live.',
      },
      {
        q: 'Does converting JPG to SVG make the image editable?',
        a: 'The trace produces real vector paths you can scale without losing quality and edit in any vector editor, though a traced result will not perfectly match a hand-drawn original.',
      },
      {
        q: 'Is the JPG to SVG converter free and private?',
        a: 'Yes. It is free with no watermark, and your image is traced locally in your browser — nothing is uploaded to a server.',
      },
    ],
  },
]
