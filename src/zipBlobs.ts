// Bundle a set of named blobs into a single ZIP. Used by the batch converters in
// both tools. fflate is dynamically imported so it only loads when a batch runs.
export async function zipBlobs(files: { name: string; blob: Blob }[]): Promise<Blob> {
  const { zipSync } = await import('fflate')

  const used = new Map<string, number>()
  const entries: Record<string, Uint8Array> = {}

  for (const { name, blob } of files) {
    // Two source files can share a base name — disambiguate so nothing is
    // silently overwritten inside the archive.
    let finalName = name
    if (used.has(name)) {
      const next = used.get(name)! + 1
      used.set(name, next)
      const dot = name.lastIndexOf('.')
      finalName = dot === -1 ? `${name}-${next}` : `${name.slice(0, dot)}-${next}${name.slice(dot)}`
    } else {
      used.set(name, 1)
    }
    entries[finalName] = new Uint8Array(await blob.arrayBuffer())
  }

  const zipped = zipSync(entries, { level: 6 })
  return new Blob([zipped as unknown as BlobPart], { type: 'application/zip' })
}
