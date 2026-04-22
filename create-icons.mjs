#!/usr/bin/env node
// Genera íconos PNG usando solo Node.js sin dependencias externas
// Usa Jimp si está disponible, sino crea SVGs que el browser acepta

import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const complexes = [
  { id: 'zona_norte', color: '#FF6B6B', bg: 'ff6b6b', text: 'ZN' },
  { id: 'zona_sur',   color: '#4ECDC4', bg: '4ecdc4', text: 'ZS' },
  { id: 'centro',     color: '#45B7D1', bg: '45b7d1', text: 'PC' },
]

const sizes = [192, 512]

mkdirSync(join(__dirname, 'public/favicons'), { recursive: true })

for (const c of complexes) {
  for (const size of sizes) {
    const r = size * 0.22
    const fontSize = Math.round(size * 0.3)
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <clipPath id="clip">
      <rect width="${size}" height="${size}" rx="${r}" ry="${r}"/>
    </clipPath>
  </defs>
  <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="${c.color}"/>
  <circle cx="${size/2}" cy="${size/2}" r="${size*0.36}" fill="rgba(255,255,255,0.25)"/>
  <text
    x="${size/2}"
    y="${size/2}"
    text-anchor="middle"
    dominant-baseline="central"
    font-family="Arial, Helvetica, sans-serif"
    font-size="${fontSize}"
    font-weight="bold"
    fill="white"
    letter-spacing="2"
  >${c.text}</text>
</svg>`

    // Guardar como SVG con extensión .png — browsers lo aceptan si el MIME es correcto
    // Para producción real se necesita un conversor. Por ahora guardamos SVG renombrado.
    const svgPath = join(__dirname, `public/favicons/favicon_${c.id}_${size}.svg`)
    writeFileSync(svgPath, svg)
    console.log(`✓ favicon_${c.id}_${size}.svg`)
  }
}

// También crear un favicon.svg genérico
const genericSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="7" fill="#333"/>
  <text x="16" y="16" text-anchor="middle" dominant-baseline="central" font-family="Arial" font-size="18" fill="white">🎾</text>
</svg>`
writeFileSync(join(__dirname, 'public/favicon.svg'), genericSvg)
console.log('✓ favicon.svg genérico')
console.log('\nNota: Los archivos .svg están en public/favicons/. Para PWA en producción,')
console.log('convertirlos a PNG real con: npm install -g sharp-cli o usar https://cloudconvert.com')
