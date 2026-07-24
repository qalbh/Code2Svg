// Custom CodeMirror theme matching the app's design tokens (see index.css) —
// replaces the stock tokyo-night/light themes so editor colors and font follow
// the same system as the rest of the UI, in both light and dark mode.
import { tags } from '@lezer/highlight'
import { createTheme } from '@uiw/codemirror-themes'

const FONT_FAMILY = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace"

// Shared XML tag -> color mapping (tag/attr/value/punctuation/comment), tuned
// to the design mockup's exact syntax palette.
const xmlStyles = (colors: {
  tagName: string
  attributeName: string
  attributeValue: string
  punctuation: string
  comment: string
}) => [
  { tag: tags.tagName, color: colors.tagName },
  { tag: tags.attributeName, color: colors.attributeName },
  { tag: [tags.attributeValue, tags.special(tags.string), tags.character], color: colors.attributeValue },
  { tag: [tags.angleBracket, tags.definitionOperator], color: colors.punctuation },
  { tag: [tags.blockComment, tags.processingInstruction, tags.documentMeta], color: colors.comment },
]

export const code2svgDarkTheme = createTheme({
  theme: 'dark',
  settings: {
    background: '#0d0e12',
    foreground: '#c9c9d2',
    caret: '#7c78ff',
    selection: 'rgba(124, 120, 255, 0.25)',
    selectionMatch: 'rgba(124, 120, 255, 0.15)',
    gutterBackground: '#0a0b0e',
    gutterForeground: '#3b3b45',
    gutterBorder: 'transparent',
    gutterActiveForeground: '#8a8a95',
    lineHighlight: 'rgba(255, 255, 255, 0.03)',
    fontFamily: FONT_FAMILY,
  },
  styles: xmlStyles({
    tagName: '#82aaff',
    attributeName: '#c99bff',
    attributeValue: '#a6da95',
    punctuation: '#565869',
    comment: '#4b5263',
  }),
})

export const code2svgLightTheme = createTheme({
  theme: 'light',
  settings: {
    background: '#ffffff',
    foreground: '#2a2b33',
    caret: '#7c78ff',
    selection: 'rgba(124, 120, 255, 0.18)',
    selectionMatch: 'rgba(124, 120, 255, 0.12)',
    gutterBackground: '#f7f7f9',
    gutterForeground: '#b0b0b8',
    gutterBorder: 'transparent',
    gutterActiveForeground: '#6b6b76',
    lineHighlight: 'rgba(10, 10, 20, 0.03)',
    fontFamily: FONT_FAMILY,
  },
  styles: xmlStyles({
    tagName: '#2b62d9',
    attributeName: '#9333ea',
    attributeValue: '#1a8a4a',
    punctuation: '#8a8a95',
    comment: '#9a9aa5',
  }),
})
