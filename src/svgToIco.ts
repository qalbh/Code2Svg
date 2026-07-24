import { renderToBlob } from './svgToImage'

// The classic favicon sizes packed into a single .ico. Modern ICO files store
// each entry as a PNG (supported by every browser and by Windows since Vista),
// which sidesteps the old BMP/AND-mask encoding entirely.
export const ICO_SIZES = [16, 32, 48]

async function pngBytes(code: string, size: number): Promise<Uint8Array> {
  const { blob } = await renderToBlob(code, {
    format: 'png',
    scale: 1,
    width: size,
    height: size,
    background: null,
    quality: 1,
  })
  return new Uint8Array(await blob.arrayBuffer())
}

// Render the SVG to each square size and assemble a real ICO container by hand:
// a 6-byte ICONDIR header, one 16-byte ICONDIRENTRY per image, then the packed
// PNG bytes. All multi-byte fields are little-endian.
export async function renderToIco(code: string, sizes: number[] = ICO_SIZES): Promise<Blob> {
  const images = await Promise.all(
    sizes.map(async (size) => ({ size, data: await pngBytes(code, size) })),
  )

  const count = images.length
  const headerSize = 6 + count * 16
  const totalData = images.reduce((sum, img) => sum + img.data.length, 0)

  const buffer = new ArrayBuffer(headerSize + totalData)
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  // ICONDIR
  view.setUint16(0, 0, true) // reserved, must be 0
  view.setUint16(2, 1, true) // image type: 1 = icon
  view.setUint16(4, count, true) // number of images

  let entry = 6
  let offset = headerSize
  for (const img of images) {
    // A dimension of 256 is stored as 0 per the ICO spec.
    const dim = img.size >= 256 ? 0 : img.size
    view.setUint8(entry, dim) // width
    view.setUint8(entry + 1, dim) // height
    view.setUint8(entry + 2, 0) // palette color count (0 = no palette)
    view.setUint8(entry + 3, 0) // reserved
    view.setUint16(entry + 4, 1, true) // color planes
    view.setUint16(entry + 6, 32, true) // bits per pixel
    view.setUint32(entry + 8, img.data.length, true) // size of image data
    view.setUint32(entry + 12, offset, true) // offset of image data
    bytes.set(img.data, offset)
    entry += 16
    offset += img.data.length
  }

  return new Blob([buffer], { type: 'image/x-icon' })
}
