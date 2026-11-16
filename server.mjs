#!/usr/bin/env node
/**
 * Concept — servidor local.
 *   node server.mjs            → uso normal (no abre el navegador)
 *   node server.mjs --desktop  → abre una ventana de aplicación y se cierra al cerrarla
 */
import { createServer } from 'node:http'
import { existsSync } from 'node:fs'
import { readFile, writeFile, mkdir, readdir, rename, unlink } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const PUBLIC = path.join(ROOT, 'public')
const DATA = path.join(ROOT, 'data')
const IMAGES = path.join(DATA, 'images')
const STATE_FILE = path.join(DATA, 'atlas.json')
const DESKTOP = process.argv.includes('--desktop')
const START_PORT = 7311

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
}

const IMAGE_EXT = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
}

let lastPing = 0
let hasClient = false
let byeAt = 0

await mkdir(IMAGES, { recursive: true })

await ensureState()

async function ensureState() {
  try {
    const raw = await readFile(STATE_FILE, 'utf8')
    JSON.parse(raw)
  } catch (err) {
    if (err.code !== 'ENOENT') {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      try {
        await rename(STATE_FILE, path.join(DATA, `atlas-corrupto-${stamp}.json`))
      } catch {}
    }
    const seed = await readFile(path.join(ROOT, 'seed.json'), 'utf8')
    await writeFile(STATE_FILE, seed, 'utf8')
  }
}

function send(res, status, body, headers = {}) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(String(body))
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': buf.length,
    ...headers,
  })
  res.end(buf)
}

function json(res, status, value) {
  const body = JSON.stringify(value)
  send(res, status, body, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
}

function readJson(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > limit) {
        reject(Object.assign(new Error('too-large'), { status: 413 }))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'))
      } catch {
        reject(Object.assign(new Error('bad-json'), { status: 400 }))
      }
    })
    req.on('error', reject)
  })
}

async function writeState(state) {
  if (!state || !Array.isArray(state.concepts) || !Array.isArray(state.links)) {
    throw Object.assign(new Error('invalid-state'), { status: 400 })
  }
  state.updatedAt = new Date().toISOString()
  const body = JSON.stringify(state, null, 2)
  const tmp = STATE_FILE + '.tmp'
  await writeFile(tmp, body, 'utf8')
  try {
    const prev = await readFile(STATE_FILE)
    await writeFile(path.join(DATA, 'atlas.backup.json'), prev)
  } catch {}
  await rename(tmp, STATE_FILE)
}

function safeJoin(base, requestPath) {
  const decoded = decodeURIComponent(requestPath)
  const target = path.resolve(base, '.' + decoded)
  if (!target.startsWith(path.resolve(base) + path.sep)) return null
  return target
}

async function serveFile(req, res, file, cacheControl) {
  try {
    const data = await readFile(file)
    const ext = path.extname(file).toLowerCase()
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': data.length,
      'Cache-Control': cacheControl,
    })
    res.end(req.method === 'HEAD' ? undefined : data)
  } catch {
    send(res, 404, 'No encontrado')
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const pathname = url.pathname
  try {
    if (pathname === '/api/state') {
      if (req.method === 'GET') {
        const raw = await readFile(STATE_FILE, 'utf8')
        send(res, 200, raw, {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
        })
        return
      }
      if (req.method === 'PUT') {
        const state = await readJson(req, 12 * 1024 * 1024)
        await writeState(state)
        json(res, 200, { ok: true })
        return
      }
      send(res, 405, 'Método no permitido')
      return
    }

    if (pathname === '/api/ping') {
      lastPing = Date.now()
      hasClient = true
      byeAt = 0
      send(res, 204, '')
      return
    }

    if (pathname === '/api/bye') {
      byeAt = Date.now()
      send(res, 204, '')
      return
    }

    if (pathname === '/api/images' && req.method === 'POST') {
      const { data, name } = await readJson(req, 24 * 1024 * 1024)
      const match = /^data:(image\/[a-z+]+);base64,(.+)$/is.exec(String(data || ''))
      if (!match) {
        json(res, 400, { error: 'image-format' })
        return
      }
      const ext = IMAGE_EXT[match[1].toLowerCase()]
      if (!ext) {
        json(res, 415, { error: 'image-type' })
        return
      }
      const buffer = Buffer.from(match[2], 'base64')
      if (buffer.length > 18 * 1024 * 1024) {
        json(res, 413, { error: 'image-too-large' })
        return
      }
      const hash = createHash('sha1').update(buffer).digest('hex').slice(0, 16)
      const file = `${hash}.${ext}`
      await writeFile(path.join(IMAGES, file), buffer)
      json(res, 200, { url: `/media/${file}`, name: name || file })
      return
    }

    if (pathname === '/api/reveal' && req.method === 'POST') {
      if (process.platform === 'win32') {
        spawn('explorer.exe', [DATA], { detached: true, stdio: 'ignore' }).unref()
      }
      json(res, 200, { ok: true })
      return
    }

    if (pathname === '/api/info') {
      json(res, 200, { dataDir: DATA, version: 1 })
      return
    }

    if (pathname.startsWith('/media/')) {
      const file = safeJoin(IMAGES, pathname.slice('/media'.length))
      if (!file) return send(res, 400, 'Ruta no válida')
      await serveFile(req, res, file, 'public, max-age=31536000, immutable')
      return
    }

    if (pathname === '/') {
      await serveFile(req, res, path.join(PUBLIC, 'index.html'), 'no-store')
      return
    }

    const file = safeJoin(PUBLIC, pathname)
    if (!file) return send(res, 400, 'Ruta no válida')
    const ext = path.extname(file).toLowerCase()
    const cache = ext === '.woff2' ? 'public, max-age=31536000, immutable' : 'no-store'
    await serveFile(req, res, file, cache)
  } catch (err) {
    const status = err.status || 500
    if (status === 413) {
      json(res, 413, { error: 'file-too-large' })
    } else {
      console.error('[concept]', err)
      json(res, status, { error: 'server-error' })
    }
  }
})

function listen(port, attempt = 0) {
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE' && attempt < 8) {
      listen(port + 1, attempt + 1)
    } else {
      console.error('[concept] No se pudo iniciar el servidor:', err.message)
      process.exit(1)
    }
  })
  server.listen(port, '127.0.0.1', () => {
    const address = `http://127.0.0.1:${port}`
    console.log(`\n  Concept está en marcha.\n  ${address}\n`)
    console.log(`  Tus datos: ${STATE_FILE}`)
    console.log('  Cierra esta ventana para detener la aplicación.\n')
    if (DESKTOP) openWindow(address)
  })
}

const EDGE_PATHS = [
  process.env['ProgramFiles(x86)'],
  process.env.ProgramFiles,
  process.env.LOCALAPPDATA,
]
  .filter(Boolean)
  .map((dir) => path.join(dir, 'Microsoft', 'Edge', 'Application', 'msedge.exe'))

function openWindow(address) {
  const edge = EDGE_PATHS.find((file) => existsSync(file))
  if (edge) {
    const child = spawn(edge, [`--app=${address}`, '--window-size=1500,960'], {
      detached: true,
      stdio: 'ignore',
    })
    child.on('error', () => openWithShell(address))
    child.unref()
    return
  }
  openWithShell(address)
}

function openWithShell(address) {
  const child = spawn('rundll32.exe', ['url.dll,FileProtocolHandler', address], {
    detached: true,
    stdio: 'ignore',
  })
  child.on('error', (err) => console.error('[concept] No se pudo abrir la ventana:', err.message))
  child.unref()
}

listen(START_PORT)

if (DESKTOP) {
  setInterval(() => {
    const now = Date.now()
    if (hasClient && byeAt && now - byeAt > 8000) {
      console.log('[concept] Ventana cerrada. Deteniendo.')
      process.exit(0)
    }
    if (hasClient && !byeAt && now - lastPing > 10 * 60 * 1000) {
      console.log('[concept] Sin actividad. Deteniendo.')
      process.exit(0)
    }
  }, 5000).unref()
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => process.exit(0))
}

// Silencia el error de lectura de una imagen eliminada mientras se sirve.
process.on('unhandledRejection', (err) => console.error('[concept]', err))
