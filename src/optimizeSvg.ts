// SVGO-powered minification. Pure module — no React, no App state.
import { optimize } from 'svgo/browser'

export interface OptimizeOptions {
  prettify: boolean
  plugins: Record<string, boolean>
}

export interface OptimizeResult {
  data: string
  originalBytes: number
  optimizedBytes: number
}

export interface PluginInfo {
  key: string
  label: string
  hint: string
}

export interface PluginGroup {
  title: string
  plugins: PluginInfo[]
}

// Plugins that are part of SVGO's preset-default — toggled via preset overrides.
// Anything else (removeViewBox, removeDimensions, removeTitle) isn't part of the
// preset in this SVGO version, so passing an override for it just logs a warning;
// those are instead added as standalone plugin entries only when enabled.
const PRESET_PLUGINS = new Set([
  'removeComments', 'removeMetadata', 'removeDoctype', 'removeXMLProcInst',
  'removeEditorsNSData', 'cleanupAttrs', 'cleanupIds', 'cleanupNumericValues',
  'convertColors', 'convertPathData', 'convertTransform', 'collapseGroups',
  'mergePaths', 'removeUselessStrokeAndFill', 'removeHiddenElems',
  'removeEmptyAttrs', 'removeEmptyText', 'removeEmptyContainers',
  'removeUnusedNS', 'sortAttrs', 'removeDesc', 'convertShapeToPath',
])

type StandalonePlugin = 'removeViewBox' | 'removeDimensions' | 'removeTitle'
const STANDALONE_PLUGINS = new Set<string>(['removeViewBox', 'removeDimensions', 'removeTitle'])

export const PLUGIN_GROUPS: PluginGroup[] = [
  {
    title: 'Cleanup',
    plugins: [
      { key: 'removeComments', label: 'Remove comments', hint: 'Strip XML/SVG comments.' },
      { key: 'removeMetadata', label: 'Remove metadata', hint: 'Strip <metadata> elements.' },
      { key: 'removeDoctype', label: 'Remove doctype', hint: 'Strip the <!DOCTYPE> declaration.' },
      { key: 'removeXMLProcInst', label: 'Remove XML declaration', hint: 'Strip the <?xml ?> processing instruction.' },
      { key: 'removeEditorsNSData', label: 'Remove editor data', hint: 'Strip Inkscape/Illustrator/Sketch namespaces and attributes.' },
      { key: 'cleanupAttrs', label: 'Cleanup attributes', hint: 'Collapse whitespace in attribute values.' },
      { key: 'removeEmptyAttrs', label: 'Remove empty attributes', hint: 'Strip attributes with an empty value.' },
      { key: 'removeEmptyText', label: 'Remove empty text', hint: 'Strip empty <text> elements.' },
      { key: 'removeEmptyContainers', label: 'Remove empty containers', hint: 'Strip empty <g>, <defs>, and similar containers.' },
      { key: 'removeUnusedNS', label: 'Remove unused namespaces', hint: 'Strip xmlns declarations nothing references.' },
      { key: 'sortAttrs', label: 'Sort attributes', hint: 'Reorder attributes for better gzip compression.' },
    ],
  },
  {
    title: 'Minify',
    plugins: [
      { key: 'cleanupIds', label: 'Cleanup IDs', hint: 'Remove unused IDs and shorten the ones still referenced.' },
      { key: 'cleanupNumericValues', label: 'Round numbers', hint: 'Round numeric values and drop redundant px units.' },
      { key: 'convertColors', label: 'Shorten colors', hint: 'Convert colors to their shortest form (e.g. rgb() to hex).' },
      { key: 'convertPathData', label: 'Optimize path data', hint: 'Shorten path commands and round coordinates.' },
      { key: 'convertTransform', label: 'Collapse transforms', hint: 'Merge and shorten transform matrices.' },
      { key: 'collapseGroups', label: 'Collapse groups', hint: 'Remove groups that add no value.' },
      { key: 'mergePaths', label: 'Merge paths', hint: 'Combine multiple <path> elements into one where possible.' },
      { key: 'removeUselessStrokeAndFill', label: 'Remove useless stroke/fill', hint: 'Strip stroke/fill attributes that have no visual effect.' },
      { key: 'removeHiddenElems', label: 'Remove hidden elements', hint: 'Strip elements that are never visible (display:none, zero size, etc.).' },
    ],
  },
  {
    title: 'Advanced (off by default)',
    plugins: [
      { key: 'removeViewBox', label: 'Remove viewBox', hint: '⚠ This app relies on viewBox for scaling and preview — leave off unless the SVG also has explicit width/height.' },
      { key: 'removeDimensions', label: 'Remove width/height', hint: 'Drop width/height attributes, keeping only viewBox.' },
      { key: 'removeTitle', label: 'Remove <title>', hint: 'Strip <title> elements (used for accessibility/tooltips).' },
      { key: 'removeDesc', label: 'Remove <desc>', hint: 'Strip <desc> elements.' },
      { key: 'convertShapeToPath', label: 'Convert shapes to paths', hint: 'Rewrite <rect>/<circle>/etc. as <path> elements.' },
    ],
  },
]

export const DEFAULT_OPTIMIZE_OPTIONS: OptimizeOptions = {
  prettify: false,
  plugins: {
    removeComments: true,
    removeMetadata: true,
    removeDoctype: true,
    removeXMLProcInst: true,
    removeEditorsNSData: true,
    cleanupAttrs: true,
    cleanupIds: true,
    cleanupNumericValues: true,
    convertColors: true,
    convertPathData: true,
    convertTransform: true,
    collapseGroups: true,
    mergePaths: true,
    removeUselessStrokeAndFill: true,
    removeHiddenElems: true,
    removeEmptyAttrs: true,
    removeEmptyText: true,
    removeEmptyContainers: true,
    removeUnusedNS: true,
    sortAttrs: true,
    removeViewBox: false,
    removeDimensions: false,
    removeTitle: false,
    removeDesc: false,
    convertShapeToPath: false,
  },
}

function byteLength(text: string): number {
  return new TextEncoder().encode(text).length
}

export function optimizeSvg(code: string, options: OptimizeOptions): OptimizeResult {
  const originalBytes = byteLength(code)

  const overrides: Record<string, boolean> = {}
  const standalone: StandalonePlugin[] = []
  for (const [name, enabled] of Object.entries(options.plugins)) {
    if (PRESET_PLUGINS.has(name)) {
      overrides[name] = enabled
    } else if (STANDALONE_PLUGINS.has(name) && enabled) {
      standalone.push(name as StandalonePlugin)
    }
  }

  let result
  try {
    result = optimize(code, {
      multipass: true,
      js2svg: { pretty: options.prettify, indent: 2 },
      plugins: [{ name: 'preset-default', params: { overrides } }, ...standalone],
    })
  } catch {
    throw new Error('The SVG code is not valid XML.')
  }

  return {
    data: result.data,
    originalBytes,
    optimizedBytes: byteLength(result.data),
  }
}
