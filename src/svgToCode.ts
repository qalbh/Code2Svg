// Pure converters from raw SVG markup to alternate output representations.
// No dependencies — DOMParser + platform APIs only.

function parseSvgElement(code: string): SVGSVGElement {
  const doc = new DOMParser().parseFromString(code, 'image/svg+xml')
  if (doc.querySelector('parsererror')) {
    throw new Error('The SVG code is not valid XML.')
  }
  const svg = doc.querySelector('svg')
  if (!svg) {
    throw new Error('No <svg> element found in the code.')
  }
  return svg as unknown as SVGSVGElement
}

// --- Data URI -------------------------------------------------------------

export function toDataUri(code: string): string {
  parseSvgElement(code) // validate first
  const bytes = new TextEncoder().encode(code)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return `data:image/svg+xml;base64,${btoa(binary)}`
}

// --- Shared JSX serialization --------------------------------------------

function camelCase(name: string): string {
  return name.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase())
}

function jsxAttrName(name: string): string {
  if (name === 'class') return 'className'
  if (name === 'for') return 'htmlFor'
  // Leave xmlns, namespaced (colon) attrs, and data-/aria-* intact.
  if (name === 'xmlns' || name.includes(':') || name.startsWith('data-') || name.startsWith('aria-')) {
    return name
  }
  return camelCase(name)
}

function styleStringToObject(style: string): string {
  const entries: string[] = []
  for (const decl of style.split(';')) {
    const idx = decl.indexOf(':')
    if (idx === -1) continue
    const prop = decl.slice(0, idx).trim()
    const value = decl.slice(idx + 1).trim()
    if (!prop || !value) continue
    // CSS custom properties keep their name; others camelCase.
    const key = prop.startsWith('--') ? prop : camelCase(prop)
    const keyStr = /^[a-zA-Z_$][\w$]*$/.test(key) ? key : `'${key}'`
    entries.push(`${keyStr}: '${value.replace(/'/g, "\\'")}'`)
  }
  return `{ ${entries.join(', ')} }`
}

function serializeAttrs(el: Element): string {
  const parts: string[] = []
  for (const attr of Array.from(el.attributes)) {
    if (attr.name === 'style') {
      parts.push(`style={${styleStringToObject(attr.value)}}`)
      continue
    }
    const name = jsxAttrName(attr.name)
    if (attr.value.includes('"')) {
      parts.push(`${name}={'${attr.value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'}`)
    } else {
      parts.push(`${name}="${attr.value}"`)
    }
  }
  return parts.join(' ')
}

interface SerializeCtx {
  mapTag: (tag: string) => string
  used: Set<string>
}

function serializeNode(node: Element, depth: number, ctx: SerializeCtx, isRoot: boolean): string {
  const indent = '  '.repeat(depth)
  const tag = ctx.mapTag(node.tagName)
  ctx.used.add(tag)

  let attrs = serializeAttrs(node)
  if (isRoot) {
    // Spread caller props onto the root element.
    attrs = attrs ? `${attrs} {...props}` : '{...props}'
  }
  const attrStr = attrs ? ` ${attrs}` : ''

  const children = Array.from(node.childNodes).filter((c) => {
    if (c.nodeType === Node.ELEMENT_NODE) return true
    if (c.nodeType === Node.TEXT_NODE) return (c.textContent ?? '').trim() !== ''
    return false
  })

  if (children.length === 0) {
    return `${indent}<${tag}${attrStr} />`
  }

  const inner = children
    .map((c) => {
      if (c.nodeType === Node.TEXT_NODE) {
        const text = (c.textContent ?? '')
          .trim()
          .replace(/\{/g, "{'{'}")
          .replace(/\}/g, "{'}'}")
        return `${'  '.repeat(depth + 1)}${text}`
      }
      return serializeNode(c as Element, depth + 1, ctx, false)
    })
    .join('\n')

  return `${indent}<${tag}${attrStr}>\n${inner}\n${indent}</${tag}>`
}

// --- React ----------------------------------------------------------------

export function toReact(code: string): string {
  const svg = parseSvgElement(code)
  const body = serializeNode(svg, 1, { mapTag: (t) => t, used: new Set() }, true)
  return `export const SvgIcon = (props: React.SVGProps<SVGSVGElement>) => (\n${body}\n)\n`
}

// --- React Native ---------------------------------------------------------

const RN_TAG_MAP: Record<string, string> = {
  svg: 'Svg',
  path: 'Path',
  rect: 'Rect',
  circle: 'Circle',
  g: 'G',
  defs: 'Defs',
  linearGradient: 'LinearGradient',
  radialGradient: 'RadialGradient',
  stop: 'Stop',
  ellipse: 'Ellipse',
  line: 'Line',
  polygon: 'Polygon',
  polyline: 'Polyline',
  text: 'Text',
  tspan: 'TSpan',
  clipPath: 'ClipPath',
  mask: 'Mask',
  use: 'Use',
}

function rnTag(tag: string): string {
  return RN_TAG_MAP[tag] ?? tag.charAt(0).toUpperCase() + tag.slice(1)
}

export function toReactNative(code: string): string {
  const svg = parseSvgElement(code)
  const used = new Set<string>()
  const body = serializeNode(svg, 1, { mapTag: rnTag, used }, true)

  const named = Array.from(used)
    .filter((n) => n !== 'Svg')
    .sort()
  const namedImport = ['SvgProps', ...named].join(', ')
  const importLine = `import Svg, { ${namedImport} } from 'react-native-svg'`

  return `${importLine}\n\nexport const SvgIcon = (props: SvgProps) => (\n${body}\n)\n`
}
