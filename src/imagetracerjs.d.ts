// Minimal type declaration for imagetracerjs (ships no bundled types).
// Only the surface we use is declared.
declare module 'imagetracerjs' {
  type ImageTracerOptions = Record<string, number | string | boolean>

  const ImageTracer: {
    imagedataToSVG(imagedata: ImageData, options?: ImageTracerOptions): string
    imageToSVG(
      url: string,
      callback: (svgstr: string) => void,
      options?: ImageTracerOptions,
    ): void
  }

  export default ImageTracer
}
