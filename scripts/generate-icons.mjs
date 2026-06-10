import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')

// A simple baby-bottle glyph (white) on the app theme blue (#2563eb), full-bleed square.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#2563eb"/>
  <g fill="none" stroke="#ffffff" stroke-width="18" stroke-linecap="round" stroke-linejoin="round">
    <!-- teat -->
    <path d="M236 92 q20 -34 40 0 v22 h-40 z" fill="#ffffff" stroke="none"/>
    <!-- collar ring -->
    <rect x="214" y="120" width="84" height="34" rx="10" fill="#ffffff" stroke="none"/>
    <!-- bottle body -->
    <rect x="186" y="162" width="140" height="268" rx="40"/>
    <!-- measurement marks -->
    <line x1="206" y1="230" x2="240" y2="230"/>
    <line x1="206" y1="282" x2="258" y2="282"/>
    <line x1="206" y1="334" x2="240" y2="334"/>
  </g>
</svg>`

const sizes = [192, 512]
for (const size of sizes) {
  const out = join(publicDir, `icon-${size}.png`)
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(out)
  console.log(`wrote ${out}`)
}
