// Static copy for the About / Terms / Privacy modals, opened from the footer.
// Placeholder — replace with a real contact address before shipping.
const CONTACT_EMAIL = 'hello@example.com'

export interface InfoSection {
  heading?: string
  paragraphs: string[]
}

export interface InfoPage {
  id: 'about' | 'terms' | 'privacy'
  label: string
  title: string
  updated: string
  sections: InfoSection[]
}

export const INFO_PAGES: InfoPage[] = [
  {
    id: 'about',
    label: 'About',
    title: 'About Code2Svg',
    updated: '2026-07-24',
    sections: [
      {
        heading: 'What it is',
        paragraphs: [
          'Code2Svg is a free, browser-based tool for converting and inspecting SVG artwork. Paste or upload SVG markup, preview it instantly, and export it as PNG, JPG, WebP, raw SVG, or an animated GIF.',
          'It also includes a zoomable/pannable preview with rotate and flip, a recolor tool that detects fill/stroke colors, an SVGO-powered Optimize feature to shrink file size, and an Output drawer that turns your SVG into React, React Native, or Data URI code.',
        ],
      },
      {
        heading: 'How it works',
        paragraphs: [
          "Everything runs locally in your browser using the canvas and DOMParser APIs. Nothing you paste, upload, or export is ever sent to a server — see the Privacy Policy for details.",
        ],
      },
      {
        heading: 'Feedback',
        paragraphs: [`Found a bug or have an idea for a feature? Reach out at ${CONTACT_EMAIL}.`],
      },
    ],
  },
  {
    id: 'terms',
    label: 'Terms',
    title: 'Terms & Conditions',
    updated: '2026-07-24',
    sections: [
      {
        heading: 'Acceptance of terms',
        paragraphs: ["By using Code2Svg, you agree to these terms. If you don't agree, please don't use the tool."],
      },
      {
        heading: 'The service',
        paragraphs: [
          'Code2Svg is provided free of charge, as-is, for converting and inspecting SVG images. It runs entirely client-side, with no user accounts and no server-side processing.',
        ],
      },
      {
        heading: 'No warranty',
        paragraphs: [
          'Code2Svg is provided without warranties of any kind, express or implied, including fitness for a particular purpose. Always verify exported files before relying on them, especially for production or commercial use.',
        ],
      },
      {
        heading: 'Limitation of liability',
        paragraphs: [
          'To the fullest extent permitted by law, the creators of Code2Svg are not liable for any damages or losses resulting from use of, or inability to use, this tool.',
        ],
      },
      {
        heading: 'Your content',
        paragraphs: [
          'You retain all rights to any SVG markup or images you process with Code2Svg. Because processing happens entirely in your browser, we never see, receive, or store your content.',
        ],
      },
      {
        heading: 'Changes to these terms',
        paragraphs: [
          'These terms may be updated from time to time. Continued use of Code2Svg after a change takes effect means you accept the revised terms.',
        ],
      },
      {
        heading: 'Contact',
        paragraphs: [`Questions about these terms? Reach out at ${CONTACT_EMAIL}.`],
      },
    ],
  },
  {
    id: 'privacy',
    label: 'Privacy',
    title: 'Privacy Policy',
    updated: '2026-07-24',
    sections: [
      {
        heading: 'No data collection',
        paragraphs: [
          "Code2Svg runs entirely in your browser. The SVG code you paste or upload, and any image you export, never leaves your device — there's no backend server, so nothing is transmitted, logged, or stored by us.",
        ],
      },
      {
        heading: 'Local storage',
        paragraphs: [
          "Code2Svg saves a small amount of data in your browser's local storage: your light/dark theme preference and your chosen Optimize (SVGO) plugin settings. This stays on your device and is never sent anywhere — clearing your browser storage removes it.",
        ],
      },
      {
        heading: 'Cookies & tracking',
        paragraphs: ['Code2Svg does not use cookies, analytics, or any third-party tracking scripts.'],
      },
      {
        heading: 'Third parties',
        paragraphs: ['No data is shared with third parties, because no data leaves your browser in the first place.'],
      },
      {
        heading: 'Changes to this policy',
        paragraphs: ['This policy may be updated as the app evolves. Check back here for the latest version.'],
      },
      {
        heading: 'Contact',
        paragraphs: [`Questions about this policy? Reach out at ${CONTACT_EMAIL}.`],
      },
    ],
  },
]
