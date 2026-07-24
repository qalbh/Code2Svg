import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ImageToSvg from './ImageToSvg.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ImageToSvg />
  </StrictMode>,
)
