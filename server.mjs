#!/usr/bin/env node
/**
 * Concept — servidor local.
 *   node server.mjs            → uso normal (no abre el navegador)
 *   node server.mjs --desktop  → abre una ventana de aplicación y se cierra al cerrarla
 */
import { createServer } from 'node:http'
import { existsSync } from 'node:fs'
import { readFile, writeFile, mkdir, readdir, rename, unlink } from 'node:fs/promises'
import { createHash, randomBytes } from 'node:crypto'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const PUBLIC = path.join(ROOT, 'public')
const DATA = path.join(ROOT, 'data')
const IMAGES = path.join(DATA, 'images')
const BOARDS_DIR = path.join(DATA, 'boards')
const BOARDS_INDEX = path.join(DATA, 'boards.json')
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
await mkdir(BOARDS_DIR, { recursive: true })

await ensureBoards()

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

function isBoardId(id) {
  return typeof id === 'string' && /^b_[a-z0-9]{4,40}$/.test(id)
}

function boardFile(id) {
  return isBoardId(id) ? path.join(BOARDS_DIR, `${id}.json`) : null
}

function newBoardId() {
  return `b_${randomBytes(6).toString('hex')}`
}

function metaOf(doc, id) {
  return {
    id,
    title: typeof doc.title === 'string' ? doc.title.trim().slice(0, 140) : '',
    createdAt: typeof doc.createdAt === 'string' ? doc.createdAt : new Date().toISOString(),
    updatedAt: typeof doc.updatedAt === 'string' ? doc.updatedAt : new Date().toISOString(),
    count: Array.isArray(doc.concepts) ? doc.concepts.length : 0,
  }
}

async function readBoardsIndex() {
  try {
    const raw = await readFile(BOARDS_INDEX, 'utf8')
    const list = JSON.parse(raw)
    if (!Array.isArray(list)) return []
    return list
      .filter((item) => item && isBoardId(item.id))
      .map((item) => ({
        id: item.id,
        title: typeof item.title === 'string' ? item.title.slice(0, 140) : '',
        createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
        updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString(),
        count: Number.isFinite(item.count) ? item.count : 0,
      }))
  } catch {
    return []
  }
}

async function writeBoardsIndex(list) {
  const tmp = BOARDS_INDEX + '.tmp'
  await writeFile(tmp, JSON.stringify(list, null, 2), 'utf8')
  await rename(tmp, BOARDS_INDEX)
}

// Las escrituras de tableros se encadenan para que dos guardados seguidos
// no compartan el mismo archivo temporal ni dejen el índice a medias.
let boardQueue = Promise.resolve()

function serialized(task) {
  const run = boardQueue.then(task, task)
  boardQueue = run.catch(() => {})
  return run
}

async function scanBoards() {
  const files = (await readdir(BOARDS_DIR)).filter((file) => /^b_[a-z0-9]+\.json$/.test(file))
  const found = []
  for (const file of files) {
    try {
      const doc = JSON.parse(await readFile(path.join(BOARDS_DIR, file), 'utf8'))
      found.push(metaOf(doc, path.basename(file, '.json')))
    } catch {}
  }
  found.sort(
    (a, b) =>
      String(a.createdAt).localeCompare(String(b.createdAt)) || a.id.localeCompare(b.id),
  )
  return found
}

async function ensureBoards() {
  // Se reconstruye el índice a partir de los tableros que existen: así se
  // recuperan archivos huérfanos y desaparecen las entradas rotas.
  const found = await scanBoards()
  if (found.length) {
    const index = await readBoardsIndex()
    const same =
      index.length === found.length &&
      index.every(
        (item, i) =>
          item.id === found[i].id &&
          item.title === found[i].title &&
          item.count === found[i].count &&
          item.updatedAt === found[i].updatedAt,
      )
    if (!same) await writeBoardsIndex(found)
    return
  }

  // Primera vez: el mapa antiguo (o el de ejemplo) pasa a ser el primer tablero.
  await ensureState()
  let doc
  try {
    doc = JSON.parse(await readFile(STATE_FILE, 'utf8'))
  } catch {
    doc = JSON.parse(await readFile(path.join(ROOT, 'seed.json'), 'utf8'))
  }
  const id = newBoardId()
  const now = new Date().toISOString()
  doc.id = id
  doc.createdAt ||= now
  doc.updatedAt = now
  await writeFile(boardFile(id), JSON.stringify(doc, null, 2), 'utf8')
  await writeBoardsIndex([metaOf(doc, id)])
}

async function readBoard(id) {
  const file = boardFile(id)
  if (!file) throw Object.assign(new Error('bad-board'), { status: 400 })
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch {
    throw Object.assign(new Error('board-missing'), { status: 404 })
  }
}

async function writeBoard(id, state) {
  if (!isBoardId(id)) throw Object.assign(new Error('bad-board'), { status: 400 })
  if (!state || !Array.isArray(state.concepts) || !Array.isArray(state.links)) {
    throw Object.assign(new Error('invalid-state'), { status: 400 })
  }
  const existing = await readBoard(id)
  const now = new Date().toISOString()
  state.id = id
  state.version = 1
  state.title = typeof state.title === 'string' ? state.title.slice(0, 140) : ''
  state.createdAt = existing.createdAt || state.createdAt || now
  state.updatedAt = now

  const file = boardFile(id)
  const tmp = `${file}.tmp`
  await writeFile(tmp, JSON.stringify(state, null, 2), 'utf8')
  await rename(tmp, file)

  const index = await readBoardsIndex()
  const meta = metaOf(state, id)
  const at = index.findIndex((item) => item.id === id)
  if (at >= 0) index[at] = meta
  else index.push(meta)
  await writeBoardsIndex(index)
}

async function createBoard(title) {
  const id = newBoardId()
  const now = new Date().toISOString()
  const doc = {
    version: 1,
    id,
    title: typeof title === 'string' ? title.slice(0, 140) : '',
    createdAt: now,
    updatedAt: now,
    concepts: [],
    links: [],
  }
  await writeFile(boardFile(id), JSON.stringify(doc, null, 2), 'utf8')
  const index = await readBoardsIndex()
  index.push(metaOf(doc, id))
  await writeBoardsIndex(index)
  return { board: metaOf(doc, id), doc }
}

async function deleteBoard(id) {
  const file = boardFile(id)
  if (!file) throw Object.assign(new Error('bad-board'), { status: 400 })
  const index = await readBoardsIndex()
  if (index.length <= 1) throw Object.assign(new Error('board-last'), { status: 409 })
  try {
    await unlink(file)
  } catch (err) {
    if (err.code !== 'ENOENT') throw Object.assign(new Error('board-missing'), { status: 404 })
  }
  await writeBoardsIndex(index.filter((item) => item.id !== id))
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
    if (pathname === '/api/boards') {
      if (req.method === 'GET') {
        json(res, 200, { boards: await readBoardsIndex() })
        return
      }
      if (req.method === 'POST') {
        const body = await readJson(req, 256 * 1024)
        json(res, 201, await serialized(() => createBoard(body.title)))
        return
      }
      send(res, 405, 'Método no permitido')
      return
    }

    if (pathname.startsWith('/api/boards/')) {
      const id = decodeURIComponent(pathname.slice('/api/boards/'.length))
      if (req.method === 'GET') {
        json(res, 200, await readBoard(id))
        return
      }
      if (req.method === 'PUT') {
        const state = await readJson(req, 12 * 1024 * 1024)
        await serialized(() => writeBoard(id, state))
        json(res, 200, { ok: true })
        return
      }
      if (req.method === 'DELETE') {
        await serialized(() => deleteBoard(id))
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
      json(res, 200, { dataDir: BOARDS_DIR, version: 1 })
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
    } else if (status === 409) {
      json(res, 409, { error: 'board-last' })
    } else if (status === 404) {
      json(res, 404, { error: 'board-missing' })
    } else if (status === 400) {
      json(res, 400, { error: 'bad-request' })
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
    console.log(`  Tus datos: ${BOARDS_DIR}`)
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
