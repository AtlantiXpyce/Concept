/* Concept — utilidades compartidas. */

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`
}

export function fold(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function slugify(text) {
  return fold(text)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'mapa'
}

export function download(filename, text, type = 'application/json') {
  const blob = new Blob([text], { type: `${type};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result)))
      } catch {
        reject(new Error('El archivo no contiene un mapa válido.'))
      }
    }
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'))
    reader.readAsText(file)
  })
}

function readDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'))
    reader.readAsDataURL(file)
  })
}

export async function uploadImage(file) {
  if (!file || !file.type.startsWith('image/')) {
    throw new Error('Ese archivo no es una imagen.')
  }
  if (file.size > 18 * 1024 * 1024) {
    throw new Error('La imagen supera los 18 MB. Prueba con una más ligera.')
  }
  const data = await readDataUrl(file)
  const res = await fetch('/api/images', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, name: file.name }),
  })
  if (!res.ok) {
    const info = await res.json().catch(() => ({}))
    throw new Error(info.error || 'No se pudo guardar la imagen.')
  }
  const info = await res.json()
  return info.url
}
