import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import ImageToSvg from './ImageToSvg.tsx'
import { CONVERSIONS } from './conversions'
import './index.css'

// One JS entry serves every landing page. Each <slug>.html tags its #root with
// data-conversion="<slug>"; we look the entry up here and render the matching
// tool pre-set to that conversion. The static SEO copy lives in the HTML.
const root = document.getElementById('root')!
const conversion = CONVERSIONS.find((c) => c.slug === root.dataset.conversion)

createRoot(root).render(
  <StrictMode>
    {conversion?.tool === 'imageToSvg' ? (
      <ImageToSvg />
    ) : (
      <App defaultFormat={conversion?.defaultFormat} />
    )}
  </StrictMode>,
)
