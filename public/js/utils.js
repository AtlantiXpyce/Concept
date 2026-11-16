/* Concept — utilidades compartidas. */

import { t } from './i18n.js'

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

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
        reject(new Error(t('file.invalid')))
      }
    }
    reader.onerror = () => reject(new Error(t('file.unreadable')))
    reader.readAsText(file)
  })
}

function readDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error(t('image.readError')))
    reader.readAsDataURL(file)
  })
}

const IMAGE_ERRORS = {
  'image-format': 'image.errorFormat',
  'image-type': 'image.errorType',
  'image-too-large': 'image.errorTooLarge',
  'file-too-large': 'image.errorTooLarge',
  'server-error': 'image.errorServer',
}

export async function uploadImage(file) {
  if (!file || !file.type.startsWith('image/')) {
    throw new Error(t('image.notImage'))
  }
  if (file.size > 18 * 1024 * 1024) {
    throw new Error(t('image.tooLarge'))
  }
  const data = await readDataUrl(file)
  const res = await fetch('/api/images', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, name: file.name }),
  })
  if (!res.ok) {
    const info = await res.json().catch(() => ({}))
    const key = IMAGE_ERRORS[info.error]
    throw new Error(key ? t(key) : t('image.saveError'))
  }
  const info = await res.json()
  return info.url
}
