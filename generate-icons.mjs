// Script para generar íconos PNG de cada complejo usando SVG → PNG via sharp
// Requiere: npm install sharp  (solo para generación, no es dependencia de runtime)
// Si no tenés sharp, los íconos SVG también funcionan en la mayoría de los browsers

import { createCanvas } from 'canvas'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const complexes = [
  { id: 'zona_norte', color: '#FF6B6B', emoji: '🎾', name: 'ZN' },
  { id: 'zona_sur',   color: '#4ECDC4', emoji: '🏆', name: 'ZS' },
  { id: 'centro',     color: '#45B7D1', emoji: '⚡', name: 'PC' },
]

const sizes = [192, 512]

mkdirSync(join(__dirname, 'public/favicons'), { recursive: true })

for (const c of complexes) {
  for (const size of sizes) {
    const canvas = createCanvas(size, size)
    const ctx = canvas.getContext('2d')

    // Fondo con color del complejo
    ctx.fillStyle = c.color
    ctx.beginPath()
    ctx.roundRect(0, 0, size, size, size * 0.22)
    ctx.fill()

    // Círculo blanco central
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size * 0.36, 0, Math.PI * 2)
    ctx.fill()

    // Texto/iniciales
    ctx.fillStyle = '#ffffff'
    ctx.font = `bold ${size * 0.3}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(c.name, size / 2, size / 2)

    const buffer = canvas.toBuffer('image/png')
    const path = join(__dirname, `public/favicons/favicon_${c.id}_${size}.png`)
    writeFileSync(path, buffer)
    console.log(`Generado: favicon_${c.id}_${size}.png`)
  }
}

console.log('¡Todos los íconos generados!')
