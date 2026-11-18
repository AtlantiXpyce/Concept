/* Concept — estado del mapa, historial y guardado en disco. */

import { fold } from './utils.js'

export const TAG_LIMIT = 12

export const PALETTE = [
  { key: 'pine', value: '#2F6B57' },
  { key: 'amber', value: '#B0792B' },
  { key: 'indigo', value: '#5A6A94' },
  { key: 'terracotta', value: '#A05A4C' },
  { key: 'verdigris', value: '#4A7C86' },
  { key: 'mauve', value: '#7C6490' },
]

const MAX_HISTORY = 60
const listeners = new Set()

export const state = {
  boardId: null,
  doc: { title: '', concepts: [], links: [] },
  selection: null,
  selectedLink: null,
  focus: [],
  query: '',
  tagFilter: [],
  viewMode: 'map',
  ready: false,
  save: 'saved',
}

let saveTimer = null
let saveRun = 0
let past = []
let future = []

const uid = (prefix) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function emit(type, detail = {}) {
  for (const fn of listeners) {
    try {
      fn(type, detail)
    } catch (err) {
      console.error('[concept] fallo al actualizar la interfaz', err)
    }
  }
}

/* --------------------------------------------------------------- load */

function cleanTag(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^#+/, '')
    .slice(0, 32)
    .trim()
}

function cleanTags(raw) {
  if (!Array.isArray(raw)) return []
  const out = []
  const seen = new Set()
  for (const item of raw) {
    const tag = cleanTag(item)
    if (!tag) continue
    const key = fold(tag)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(tag)
    if (out.length >= TAG_LIMIT) break
  }
  return out
}

export function normalize(raw) {
  const doc = raw && typeof raw === 'object' ? raw : {}
  const concepts = Array.isArray(doc.concepts) ? doc.concepts : []
  const links = Array.isArray(doc.links) ? doc.links : []
  const seen = new Set()

  const cleanConcepts = concepts
    .filter((c) => c && typeof c === 'object' && c.id)
    .map((c) => {
      const color = PALETTE.some((p) => p.value === c.color) ? c.color : PALETTE[0].value
      return {
        id: String(c.id),
        title: typeof c.title === 'string' ? c.title.slice(0, 180) : '',
        description: typeof c.description === 'string' ? c.description.slice(0, 12000) : '',
        tags: cleanTags(c.tags),
        x: Number.isFinite(c.x) ? Math.round(c.x) : 0,
        y: Number.isFinite(c.y) ? Math.round(c.y) : 0,
        color,
        image: typeof c.image === 'string' && c.image ? c.image : null,
      }
    })
    .filter((c) => {
      if (seen.has(c.id)) return false
      seen.add(c.id)
      return true
    })

  const ids = new Set(cleanConcepts.map((c) => c.id))
  const pairs = new Set()
  const cleanLinks = links
    .filter((l) => l && ids.has(l.from) && ids.has(l.to) && l.from !== l.to)
    .map((l) => ({
      id: typeof l.id === 'string' && l.id ? l.id : uid('l'),
      from: String(l.from),
      to: String(l.to),
      label: typeof l.label === 'string' ? l.label.slice(0, 160) : '',
    }))
    .filter((l) => {
      const key = [l.from, l.to].sort().join('|')
      if (pairs.has(key)) return false
      pairs.add(key)
      return true
    })

  return {
    version: 1,
    title: typeof doc.title === 'string' ? doc.title.trim().slice(0, 140) : '',
    createdAt: doc.createdAt || new Date().toISOString(),
    updatedAt: doc.updatedAt || new Date().toISOString(),
    concepts: cleanConcepts,
    links: cleanLinks,
  }
}

export function load(raw, boardId = null) {
  clearTimeout(saveTimer)
  saveTimer = null
  saveRun += 1
  past = []
  future = []
  state.boardId = boardId || (raw && raw.id) || null
  state.doc = normalize(raw)
  state.selection = null
  state.selectedLink = null
  state.focus = []
  state.query = ''
  state.tagFilter = []
  state.save = 'saved'
  state.ready = true
  emit('load')
  emit('selection')
  emit('focus')
  emit('query')
  emit('save')
}

/* --------------------------------------------------------------- helpers */

export function getConcept(id) {
  return state.doc.concepts.find((c) => c.id === id) || null
}

export function getLink(id) {
  return state.doc.links.find((l) => l.id === id) || null
}

export function linksOf(id) {
  return state.doc.links.filter((l) => l.from === id || l.to === id)
}

export function neighborsOf(id) {
  const out = []
  for (const link of linksOf(id)) {
    const otherId = link.from === id ? link.to : link.from
    const concept = getConcept(otherId)
    if (concept) out.push({ concept, link, direction: link.from === id ? 'out' : 'in' })
  }
  return out
}

export function findLink(a, b) {
  return state.doc.links.find((l) => (l.from === a && l.to === b) || (l.from === b && l.to === a)) || null
}

export function focusSet() {
  const center = state.focus[state.focus.length - 1]
  if (!center) return null
  const set = new Set([center])
  for (const { concept } of neighborsOf(center)) set.add(concept.id)
  return set
}

export function focusCenter() {
  return getConcept(state.focus[state.focus.length - 1])
}

/* --------------------------------------------------------------- etiquetas */

export function tagsOf(concept) {
  return concept && Array.isArray(concept.tags) ? concept.tags : []
}

export function allTags() {
  const found = new Map()
  for (const concept of state.doc.concepts) {
    for (const tag of tagsOf(concept)) {
      const key = fold(tag)
      if (!key) continue
      const entry = found.get(key)
      if (entry) entry.count += 1
      else found.set(key, { key, label: tag, count: 1 })
    }
  }
  return [...found.values()].sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label, 'es'),
  )
}

export function matchesTagFilter(concept) {
  const filter = state.tagFilter
  if (!filter.length) return true
  const keys = new Set(tagsOf(concept).map(fold))
  return filter.some((key) => keys.has(key))
}

function pruneTagFilter() {
  if (!state.tagFilter.length) return false
  const available = new Set(allTags().map((tag) => tag.key))
  const next = state.tagFilter.filter((key) => available.has(key))
  if (next.length === state.tagFilter.length) return false
  state.tagFilter = next
  return true
}

function applyTagFilter(keys) {
  const available = new Set(allTags().map((tag) => tag.key))
  const next = [...new Set(keys)].filter((key) => available.has(key))
  const same =
    next.length === state.tagFilter.length &&
    next.every((key, index) => key === state.tagFilter[index])
  if (same) return
  state.tagFilter = next
  let leftFocus = false
  if (state.focus.length) {
    state.focus = []
    leftFocus = true
  }
  if (leftFocus) emit('focus')
  emit('tags', { fit: true })
}

export function setTagFilter(keys) {
  applyTagFilter(Array.isArray(keys) ? keys : [])
}

export function toggleTagFilter(key) {
  const next = state.tagFilter.includes(key)
    ? state.tagFilter.filter((item) => item !== key)
    : [...state.tagFilter, key]
  applyTagFilter(next)
}

export function clearTagFilter() {
  applyTagFilter([])
}

/* ---------------------------------------------------- cambios de etiquetas */

export function addTag(id, value) {
  const concept = getConcept(id)
  if (!concept) return { ok: false, reason: 'missing' }
  const tag = cleanTag(value)
  if (!tag) return { ok: false, reason: 'empty' }
  const key = fold(tag)
  if (concept.tags.some((item) => fold(item) === key)) {
    return { ok: false, reason: 'duplicate' }
  }
  if (concept.tags.length >= TAG_LIMIT) {
    return { ok: false, reason: 'limit' }
  }
  const existing = allTags().find((item) => item.key === key)
  const label = existing ? existing.label : tag
  remember()
  concept.tags.push(label)
  emit('concept', { id, history: true })
  emit('tags', { fit: false })
  scheduleSave()
  return { ok: true, tag: label }
}

export function removeTag(id, value) {
  const concept = getConcept(id)
  if (!concept) return false
  const key = fold(value)
  const index = concept.tags.findIndex((item) => fold(item) === key)
  if (index < 0) return false
  remember()
  concept.tags.splice(index, 1)
  const filterChanged = pruneTagFilter()
  emit('concept', { id, history: true })
  emit('tags', { fit: filterChanged })
  scheduleSave()
  return true
}

/* --------------------------------------------------------------- history */

function snapshot() {
  return JSON.stringify({
    title: state.doc.title,
    concepts: state.doc.concepts,
    links: state.doc.links,
  })
}

function applySnapshot(json) {
  try {
    const data = JSON.parse(json)
    state.doc.title = data.title
    state.doc.concepts = data.concepts
    state.doc.links = data.links
  } catch {
    return
  }
  if (state.selection && !getConcept(state.selection)) state.selection = null
  if (state.selectedLink && !getLink(state.selectedLink)) state.selectedLink = null
  state.focus = state.focus.filter((id) => getConcept(id))
  pruneTagFilter()
  emit('reload')
  scheduleSave()
}

export function remember() {
  past.push(snapshot())
  if (past.length > MAX_HISTORY) past.shift()
  future = []
}

export function canUndo() { return past.length > 0 }
export function canRedo() { return future.length > 0 }

export function undo() {
  if (!past.length) return false
  future.push(snapshot())
  applySnapshot(past.pop())
  return true
}

export function redo() {
  if (!future.length) return false
  past.push(snapshot())
  applySnapshot(future.pop())
  return true
}

/* --------------------------------------------------------------- guardado */

export function scheduleSave() {
  state.save = 'saving'
  emit('save')
  clearTimeout(saveTimer)
  saveTimer = setTimeout(saveNow, 550)
}

export async function saveNow() {
  clearTimeout(saveTimer)
  saveTimer = null
  if (!state.boardId) return
  const run = ++saveRun
  const payload = JSON.stringify({
    ...state.doc,
    updatedAt: new Date().toISOString(),
  })
  try {
    const res = await fetch(`/api/boards/${encodeURIComponent(state.boardId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    })
    if (!res.ok) throw new Error('save-failed')
    if (run === saveRun) {
      state.save = 'saved'
      emit('save')
    }
  } catch {
    if (run === saveRun) {
      state.save = 'error'
      emit('save')
    }
  }
}

export function cancelPending() {
  clearTimeout(saveTimer)
  saveTimer = null
  saveRun += 1
}

export function markDirty() {
  scheduleSave()
}

export function flush() {
  if (!saveTimer || !state.boardId) return
  clearTimeout(saveTimer)
  saveTimer = null
  const body = JSON.stringify({ ...state.doc, updatedAt: new Date().toISOString() })
  try {
    fetch(`/api/boards/${encodeURIComponent(state.boardId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    })
  } catch {}
}

/* --------------------------------------------------------------- títulos y consulta */

export function setTitle(title) {
  state.doc.title = title.trim() ? title.slice(0, 140) : ''
  emit('title')
  scheduleSave()
}

export function setQuery(query) {
  state.query = query
  emit('query')
}

export function setViewMode(mode) {
  if (mode !== 'map' && mode !== 'graph') return
  if (state.viewMode === mode) return
  state.viewMode = mode
  emit('view')
}

/* --------------------------------------------------------------- selección y foco */

export function setSelection(id) {
  if (id && !getConcept(id)) id = null
  if (state.selection === id) return
  state.selection = id
  state.selectedLink = null
  emit('selection')
}

export function setSelectedLink(id) {
  state.selectedLink = id && getLink(id) ? id : null
  if (state.selectedLink) state.selection = null
  emit('selectedLink')
}

export function enterFocus(id) {
  if (!getConcept(id)) return
  if (state.focus[state.focus.length - 1] === id) return
  const existing = state.focus.indexOf(id)
  if (existing >= 0) state.focus = state.focus.slice(0, existing + 1)
  else state.focus.push(id)
  state.selectedLink = null
  emit('focus')
}

export function focusBack() {
  if (state.focus.length < 2) return
  state.focus.pop()
  emit('focus')
}

export function exitFocus() {
  if (!state.focus.length) return
  state.focus = []
  emit('focus')
}

/* --------------------------------------------------------------- mutaciones */

export function addConcept({ x = 0, y = 0, title = '', description = '', image = null, color = null, select = true } = {}) {
  remember()
  const concept = {
    id: uid('c'),
    title,
    description,
    tags: [],
    x: Math.round(x),
    y: Math.round(y),
    color: color || PALETTE[state.doc.concepts.length % PALETTE.length].value,
    image: image || null,
  }
  state.doc.concepts.push(concept)
  if (select) state.selection = concept.id
  state.selectedLink = null
  if (state.focus.length) {
    state.focus = []
    emit('focus')
  }
  emit('concepts', { id: concept.id })
  emit('selection')
  scheduleSave()
  return concept
}

export function updateConcept(id, patch, { history = false, save = true } = {}) {
  const concept = getConcept(id)
  if (!concept) return null
  if (history) remember()
  for (const [key, value] of Object.entries(patch)) {
    if (key === 'title' && typeof value === 'string') concept.title = value.slice(0, 180)
    else if (key === 'description' && typeof value === 'string') concept.description = value.slice(0, 12000)
    else if (key === 'tags') concept.tags = cleanTags(value)
    else if (key === 'color' && PALETTE.some((p) => p.value === value)) concept.color = value
    else if (key === 'image') concept.image = value || null
    else if ((key === 'x' || key === 'y') && Number.isFinite(value)) concept[key] = Math.round(value)
    else if (key in concept) concept[key] = value
  }
  emit('concept', { id, history })
  if (save) scheduleSave()
  return concept
}

export function moveConcept(id, x, y, { save = false } = {}) {
  const concept = getConcept(id)
  if (!concept) return
  concept.x = Math.round(x)
  concept.y = Math.round(y)
  emit('concept:moved', { id })
  if (save) scheduleSave()
}

export function removeConcept(id) {
  const concept = getConcept(id)
  if (!concept) return null
  remember()
  state.doc.concepts = state.doc.concepts.filter((c) => c.id !== id)
  state.doc.links = state.doc.links.filter((l) => l.from !== id && l.to !== id)
  if (state.selection === id) state.selection = null
  state.selectedLink = null
  state.focus = state.focus.filter((fid) => fid !== id)
  const filterChanged = pruneTagFilter()
  emit('concepts', { removed: id })
  emit('selection')
  emit('focus')
  emit('links')
  emit('tags', { fit: filterChanged })
  scheduleSave()
  return concept
}

export function addLink(from, to, label = '') {
  if (!getConcept(from) || !getConcept(to) || from === to) return null
  if (findLink(from, to)) return null
  remember()
  const link = { id: uid('l'), from, to, label: label.slice(0, 160) }
  state.doc.links.push(link)
  emit('links', { id: link.id })
  scheduleSave()
  return link
}

export function updateLink(id, patch, { history = false, save = true } = {}) {
  const link = getLink(id)
  if (!link) return null
  if (history) remember()
  if (typeof patch.label === 'string') link.label = patch.label.slice(0, 160)
  if (patch.from && getConcept(patch.from)) link.from = patch.from
  if (patch.to && getConcept(patch.to)) link.to = patch.to
  emit('link', { id, history })
  if (save) scheduleSave()
  return link
}

export function removeLink(id) {
  const link = getLink(id)
  if (!link) return null
  remember()
  state.doc.links = state.doc.links.filter((l) => l.id !== id)
  if (state.selectedLink === id) state.selectedLink = null
  emit('links', { removed: id })
  scheduleSave()
  return link
}

export function replaceDoc(raw) {
  remember()
  state.doc = normalize(raw)
  state.selection = null
  state.selectedLink = null
  state.focus = []
  state.query = ''
  state.tagFilter = []
  emit('reload')
  emit('selection')
  emit('focus')
  emit('query')
  emit('tags', { fit: false })
  scheduleSave()
}
