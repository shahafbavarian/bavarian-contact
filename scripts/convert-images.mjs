import sharp from 'sharp'
import { readdir, stat } from 'fs/promises'
import { join, extname, basename } from 'path'
import { fileURLToPath } from 'url'

const publicDir = join(fileURLToPath(import.meta.url), '../../public')

const files = await readdir(publicDir)
const images = files.filter(f => /\.(png|jpg|jpeg)$/i.test(f))

if (images.length === 0) {
  console.log('No images to convert.')
} else {
  for (const file of images) {
    const input = join(publicDir, file)
    const name = basename(file, extname(file))
    const output = join(publicDir, `${name}.webp`)
    await sharp(input).webp({ quality: 82 }).toFile(output)
    const { size: inSize } = await stat(input)
    const { size: outSize } = await stat(output)
    const saving = Math.round((1 - outSize / inSize) * 100)
    console.log(`✓ ${file} → ${name}.webp  (${saving}% smaller)`)
  }
}
