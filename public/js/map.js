/* lienzo: nodos, relaciones, zoom, paneo y foco. */

import * as store from './store.js'
import { state } from './store.js'
import { clamp, uploadImage } from './utils.js'
import { zoomLabel, notify } from './ui.js'
import { t } from './i18n.js'

const NS = 'http://www.w3.org/2000/svg'
const NODE_W = 236
const DEFAULT_H = 148

const els = {}
const sizes = new Map()
const nodeEls = new Map()
const measured = new Set()
const layoutPositions = new Map()

const view = { k: 1, x: 0, y: 0 }
const shownView = { k: 1, x: 0, y: 0 }
let viewFrame = 0
let edgeFrame = 0
let layoutFrame = 0
let userMovedView = false
let savedView = null

let drag = null
let pan = null
let linking = null
let dragDepth = 0

export function initMap() {
  Object.assign(els, {
    canvas: document.getElementById('canvas'),
    world: document.getElementById('world'),
    nodes: document.getElementById('nodes'),
    edges: document.getElementById('edges'),
    edgeLayer: document.getElementById('edge-layer'),
    liveLayer: document.getElementById('live-layer'),
    drop: document.getElementById('drop'),
    inspector: document.getElementById('inspector'),
  })

  bind()
  store.subscribe(onStore)
  renderNodes()
  renderEdges()
  applyView()
  requestAnimationFrame(() => fitAll({ animate: false }))

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      if (userMovedView) return
      renderNodes()
      fitAll({ animate: false })
    })
  }
}

/* dibujo */

function onStore(type, detail) {
  switch (type) {
    case 'load':
      cancelLayout()
      layoutPositions.clear()
      renderNodes()
      renderEdges()
      requestAnimationFrame(() => fitAll({ animate: false }))
      break
    case 'reload':
      cancelLayout()
      layoutPositions.clear()
      renderNodes()
      renderEdges()
      requestAnimationFrame(() => {
        fitAll({ animate: true })
        if (state.focus.length) applyFocus()
      })
      break
    case 'concepts':
      renderNodes()
      renderEdges()
      break
    case 'concept':
      if (detail.history) {
        renderNodes()
        renderEdges()
      } else {
        updateNode(detail.id)
      }
      break
    case 'links':
      renderEdges()
      // Al añadir o quitar relaciones cambia el anillo del foco.
      if (state.focus.length) applyFocus()
      break
    case 'link':
      renderEdges()
      break
    case 'selection':
      applyClasses()
      break
    case 'selectedLink':
      applyClasses()
      break
    case 'focus':
      applyFocus()
      break
    case 'query':
      applyClasses()
      break
  }
}

function buildNode(concept, index) {
  const pos = nodePos(concept.id)
  const el = document.createElement('article')
  el.className = 'node'
  el.dataset.id = concept.id
  el.style.left = `${pos.x}px`
  el.style.top = `${pos.y}px`
  el.style.setProperty('--node-color', concept.color)
  el.style.setProperty('--i', String(Math.min(index, 14)))
  el.tabIndex = 0
  el.setAttribute('role', 'group')
  el.setAttribute('aria-label', nodeLabel(concept))

  const spine = document.createElement('span')
  spine.className = 'node__spine'
  el.append(spine)

  if (concept.image) el.append(buildMedia(concept))

  const body = document.createElement('div')
  body.className = 'node__body'
  const title = document.createElement('h3')
  title.className = 'node__title'
  const desc = document.createElement('p')
  desc.className = 'node__desc'
  const meta = document.createElement('div')
  meta.className = 'node__meta'
  body.append(title, desc, meta)
  el.append(body)

  const handle = document.createElement('button')
  handle.type = 'button'
  handle.className = 'node__handle'
  handle.addEventListener('pointerdown', (event) => {
    event.stopPropagation()
    event.preventDefault()
    startLinking(concept.id, event)
  })
  handle.addEventListener('click', (event) => event.stopPropagation())
  el.append(handle)

  paintNode(el, concept)

  el.addEventListener('pointerdown', (event) => startNodeDrag(event, concept.id))
  el.addEventListener('click', (event) => {
    if (event.target.closest('.node__handle')) return
    if (drag && drag.moved) return
    store.setSelection(concept.id)
  })
  el.addEventListener('dblclick', (event) => {
    if (event.target.closest('.node__handle')) return
    store.enterFocus(concept.id)
  })
  el.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      store.setSelection(concept.id)
    }
  })

  return el
}

function buildMedia(concept) {
  const media = document.createElement('div')
  media.className = 'node__media'
  const img = document.createElement('img')
  img.src = concept.image
  img.alt = ''
  img.draggable = false
  img.addEventListener('load', () => {
    measure(concept.id)
    scheduleEdges()
  })
  media.append(img)
  return media
}

function relationCount(n) {
  return `${n} ${t(n === 1 ? 'relation.one' : 'relation.other')}`
}

function nodeLabel(concept) {
  const title = concept.title.trim() || t('concept.untitled')
  const n = store.linksOf(concept.id).length
  return `${title}. ${relationCount(n)}.`
}

function paintNode(el, concept) {
  el.classList.toggle('is-empty', !concept.title.trim())
  el.dataset.empty = concept.title.trim() ? '' : 'title'
  el.setAttribute('aria-label', nodeLabel(concept))
  const title = el.querySelector('.node__title')
  const desc = el.querySelector('.node__desc')
  const meta = el.querySelector('.node__meta')
  const handle = el.querySelector('.node__handle')
  title.textContent = concept.title.trim() || t('concept.untitledShort')
  desc.textContent = concept.description
  const n = store.linksOf(concept.id).length
  meta.textContent = n ? relationCount(n) : ''
  if (handle) {
    handle.title = t('node.dragTitle')
    handle.setAttribute('aria-label', t('node.dragAria', { title: concept.title.trim() || t('concept.untitled') }))
  }
  el.querySelector('.node__spine').style.background = concept.color
}

function renderNodes() {
  nodeEls.clear()
  sizes.clear()
  measured.clear()
  els.nodes.replaceChildren()

  const fragment = document.createDocumentFragment()
  state.doc.concepts.forEach((concept, index) => {
    const el = buildNode(concept, index)
    nodeEls.set(concept.id, el)
    fragment.append(el)
  })
  els.nodes.append(fragment)

  for (const [id, el] of nodeEls) {
    sizes.set(id, { w: el.offsetWidth || NODE_W, h: el.offsetHeight || DEFAULT_H })
    measured.add(id)
  }
  for (const id of layoutPositions.keys()) {
    if (!store.getConcept(id)) layoutPositions.delete(id)
  }
  applyClasses()
}

function updateNode(id) {
  const concept = store.getConcept(id)
  const el = nodeEls.get(id)
  if (!concept || !el) {
    renderNodes()
    scheduleEdges()
    return
  }
  paintNode(el, concept)
  requestAnimationFrame(() => {
    measure(id)
    scheduleEdges()
  })
}

function measure(id) {
  const el = nodeEls.get(id)
  if (!el) return
  sizes.set(id, { w: el.offsetWidth || NODE_W, h: el.offsetHeight || DEFAULT_H })
}

function scheduleEdges() {
  if (edgeFrame) return
  edgeFrame = requestAnimationFrame(() => {
    edgeFrame = 0
    refreshEdgeShapes()
  })
}

function sizeOf(id) {
  return sizes.get(id) || { w: NODE_W, h: DEFAULT_H }
}

function nodePos(id) {
  const concept = store.getConcept(id)
  const placed = layoutPositions.get(id)
  if (placed) return placed
  return concept ? { x: concept.x, y: concept.y } : { x: 0, y: 0 }
}

function updateNodePositions() {
  for (const [id, el] of nodeEls) {
    const pos = nodePos(id)
    el.style.left = `${pos.x}px`
    el.style.top = `${pos.y}px`
  }
}

function boxOf(id) {
  const concept = store.getConcept(id)
  if (!concept) return null
  const size = sizeOf(id)
  const pos = nodePos(id)
  return {
    x: pos.x,
    y: pos.y,
    w: size.w,
    h: size.h,
    cx: pos.x + size.w / 2,
    cy: pos.y + size.h / 2,
  }
}

function renderEdges() {
  const fragment = document.createDocumentFragment()
  for (const link of state.doc.links) {
    const from = boxOf(link.from)
    const to = boxOf(link.to)
    if (!from || !to) continue
    const shape = edgeShape(from, to)

    const group = document.createElementNS(NS, 'g')
    group.classList.add('edge')
    group.dataset.id = link.id

    const hit = document.createElementNS(NS, 'path')
    hit.setAttribute('d', shape.d)
    hit.setAttribute('class', 'edge__hit')
    hit.addEventListener('pointerdown', (event) => event.stopPropagation())
    hit.addEventListener('click', (event) => {
      event.stopPropagation()
      store.setSelectedLink(link.id)
      window.dispatchEvent(
        new CustomEvent('concept:edge', {
          detail: { linkId: link.id, x: event.clientX, y: event.clientY },
        }),
      )
    })

    const line = document.createElementNS(NS, 'path')
    line.setAttribute('d', shape.d)
    line.setAttribute('class', 'edge__line')
    line.setAttribute('marker-end', 'url(#arrow)')

    group.append(hit, line)

    if (link.label.trim()) {
      const label = document.createElementNS(NS, 'text')
      label.setAttribute('x', String(Math.round(shape.mid.x)))
      label.setAttribute('y', String(Math.round(shape.mid.y)))
      label.setAttribute('class', 'edge__label')
      label.textContent = link.label.length > 46 ? `${link.label.slice(0, 46)}…` : link.label
      group.append(label)
    }

    fragment.append(group)
  }
  els.edgeLayer.replaceChildren(fragment)
  applyClasses()
}

function refreshEdgeShapes() {
  for (const group of els.edgeLayer.children) {
    const link = store.getLink(group.dataset.id)
    if (!link) continue
    const from = boxOf(link.from)
    const to = boxOf(link.to)
    if (!from || !to) continue
    const shape = edgeShape(from, to)
    for (const path of group.querySelectorAll('path')) path.setAttribute('d', shape.d)
    const label = group.querySelector('.edge__label')
    if (label) {
      label.setAttribute('x', String(Math.round(shape.mid.x)))
      label.setAttribute('y', String(Math.round(shape.mid.y)))
    }
  }
}

function edgeShape(a, b) {
  const dx = b.cx - a.cx
  const dy = b.cy - a.cy
  const dist = Math.hypot(dx, dy) || 1
  let p1
  let p2
  let c1
  let c2

  if (Math.abs(dx) >= Math.abs(dy)) {
    const sign = dx >= 0 ? 1 : -1
    const offset = clamp(dist * 0.42, 34, 132)
    p1 = { x: a.cx + sign * (a.w / 2 + 1), y: a.cy }
    p2 = { x: b.cx - sign * (b.w / 2 + 1), y: b.cy }
    c1 = { x: p1.x + sign * offset, y: p1.y }
    c2 = { x: p2.x - sign * offset, y: p2.y }
  } else {
    const sign = dy >= 0 ? 1 : -1
    const offset = clamp(dist * 0.42, 30, 120)
    p1 = { x: a.cx, y: a.cy + sign * (a.h / 2 + 1) }
    p2 = { x: b.cx, y: b.cy - sign * (b.h / 2 + 1) }
    c1 = { x: p1.x, y: p1.y + sign * offset }
    c2 = { x: p2.x, y: p2.y - sign * offset }
  }

  const mid = {
    x: (p1.x + 3 * c1.x + 3 * c2.x + p2.x) / 8,
    y: (p1.y + 3 * c1.y + 3 * c2.y + p2.y) / 8,
  }

  return {
    d: `M ${p1.x} ${p1.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${p2.x} ${p2.y}`,
    mid,
  }
}

/* --------------------------------------------------------------- clases */

function applyClasses() {
  const focus = store.focusSet()
  const centerId = state.focus[state.focus.length - 1]
  const query = state.query.trim().toLocaleLowerCase('es')

  for (const [id, el] of nodeEls) {
    const concept = store.getConcept(id)
    if (!concept) continue
    el.classList.toggle('is-selected', state.selection === id)
    el.classList.toggle('is-center', centerId === id)
    el.classList.toggle('is-dim', Boolean(focus) && !focus.has(id))
    const hit = query
      ? `${concept.title} ${concept.description}`.toLocaleLowerCase('es').includes(query)
      : false
    el.classList.toggle('is-search-hit', hit && state.selection !== id)
  }

  for (const group of els.edgeLayer.children) {
    const link = store.getLink(group.dataset.id)
    if (!link) continue
    const inFocus = !focus || (focus.has(link.from) && focus.has(link.to))
    const touchesCenter = centerId && (link.from === centerId || link.to === centerId)
    group.classList.toggle('is-dim', !inFocus)
    group.classList.toggle('is-focus', Boolean(touchesCenter) && Boolean(focus))
    group.classList.toggle('is-selected', state.selectedLink === link.id)
  }
}

const FOCUS_MS = 380

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

/* Coloca el centro en su sitio y reparte sus vecinos en anillo. */
function computeFocusLayout() {
  const centerId = state.focus[state.focus.length - 1]
  if (!centerId || !store.getConcept(centerId)) return null

  const centerBox = boxOf(centerId)
  const centerPos = nodePos(centerId)
  const neighbors = store.neighborsOf(centerId).map((entry) => entry.concept)
  const focusIds = new Set([centerId, ...neighbors.map((concept) => concept.id)])
  const positions = new Map()

  // Los nodos que salen del foco vuelven a su sitio guardado.
  for (const id of layoutPositions.keys()) {
    if (focusIds.has(id)) continue
    const concept = store.getConcept(id)
    if (concept) positions.set(id, { x: concept.x, y: concept.y })
  }

  positions.set(centerId, { x: centerPos.x, y: centerPos.y })

  if (neighbors.length) {
    // Conserva el orden angular actual para que el anillo no gire sin motivo.
    const ordered = neighbors
      .map((concept) => {
        const box = boxOf(concept.id)
        return {
          id: concept.id,
          angle: Math.atan2(box.cy - centerBox.cy, box.cx - centerBox.cx),
        }
      })
      .sort((a, b) => a.angle - b.angle)

    const n = ordered.length
    const radius = clamp((NODE_W + 34) / (2 * Math.sin(Math.PI / n)) + 8, 290, 560)
    const rx = radius * 1.1
    const ry = radius * 0.84

    ordered.forEach((entry, index) => {
      const angle = -Math.PI / 2 + (index / n) * Math.PI * 2
      const size = sizeOf(entry.id)
      positions.set(entry.id, {
        x: Math.round(centerBox.cx + Math.cos(angle) * rx - size.w / 2),
        y: Math.round(centerBox.cy + Math.sin(angle) * ry - size.h / 2),
      })
    })
  }

  return { positions, bounds: boundsOf(focusIds, positions) }
}

function cancelLayout() {
  cancelAnimationFrame(layoutFrame)
  layoutFrame = 0
}

function animateLayout(targets, { onDone = null } = {}) {
  if (!targets || !targets.size) {
    onDone?.()
    return
  }
  cancelLayout()

  const ids = [...targets.keys()].filter((id) => nodeEls.has(id))
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const duration = reduced ? 0 : FOCUS_MS
  const starts = new Map(ids.map((id) => [id, nodePos(id)]))
  const begin = performance.now()

  const commit = () => {
    for (const id of ids) layoutPositions.set(id, targets.get(id))
    updateNodePositions()
    refreshEdgeShapes()
  }

  if (!duration) {
    commit()
    onDone?.()
    return
  }

  const step = (now) => {
    const t = easeInOutCubic(Math.min(1, (now - begin) / duration))
    for (const id of ids) {
      const from = starts.get(id)
      const to = targets.get(id)
      layoutPositions.set(id, {
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t,
      })
    }
    updateNodePositions()
    refreshEdgeShapes()
    if (t < 1) {
      layoutFrame = requestAnimationFrame(step)
      return
    }
    layoutFrame = 0
    commit()
    onDone?.()
  }

  layoutFrame = requestAnimationFrame(step)
}

function applyFocus() {
  applyClasses()

  if (state.focus.length) {
    if (!savedView) savedView = { ...view, moved: userMovedView }
    const layout = computeFocusLayout()
    if (!layout) return
    animateLayout(layout.positions)
    requestAnimationFrame(() => {
      fitBounds(layout.bounds, { animate: true, pad: 44 })
    })
    return
  }

  // Salir del foco: los nodos vuelven a su posición guardada.
  if (layoutPositions.size) {
    const targets = new Map()
    for (const id of layoutPositions.keys()) {
      const concept = store.getConcept(id)
      if (concept) targets.set(id, { x: concept.x, y: concept.y })
    }
    animateLayout(targets, {
      onDone: () => {
        for (const id of targets.keys()) layoutPositions.delete(id)
      },
    })
  }

  if (savedView) {
    const previous = savedView
    savedView = null
    view.x = previous.x
    view.y = previous.y
    view.k = previous.k
    userMovedView = Boolean(previous.moved)
    applyView({ animate: true })
  }
}

/* --------------------------------------------------------------- vista */

function applyView({ animate = false } = {}) {
  cancelAnimationFrame(viewFrame)
  viewFrame = 0

  if (!animate) {
    shownView.x = view.x
    shownView.y = view.y
    shownView.k = view.k
    paintView()
    return
  }

  const from = { ...shownView }
  const to = { x: view.x, y: view.y, k: view.k }
  const begin = performance.now()

  const step = (now) => {
    const t = easeInOutCubic(Math.min(1, (now - begin) / 340))
    shownView.x = from.x + (to.x - from.x) * t
    shownView.y = from.y + (to.y - from.y) * t
    shownView.k = from.k + (to.k - from.k) * t
    paintView()
    viewFrame = t < 1 ? requestAnimationFrame(step) : 0
  }

  viewFrame = requestAnimationFrame(step)
}

/* La escala se aplica con zoom (no con transform) para que el texto se
   redibuje nítido en cada nivel; el transform solo desplaza. */
function paintView() {
  const k = shownView.k || 1
  els.world.style.zoom = String(k)
  els.world.style.transform = `translate(${shownView.x / k}px, ${shownView.y / k}px)`
  els.canvas.style.setProperty('--gs', `${22 * k}px`)
  els.canvas.style.setProperty('--gx', `${shownView.x}px`)
  els.canvas.style.setProperty('--gy', `${shownView.y}px`)
  zoomLabel(k)
}

function inspectorWidth() {
  if (!els.inspector || !els.inspector.classList.contains('is-open')) return 0
  const canvasWidth = els.canvas.getBoundingClientRect().width
  return Math.min(els.inspector.offsetWidth, Math.max(0, canvasWidth - 240))
}

function boundsOf(ids = null, positions = null) {
  const concepts = state.doc.concepts.filter((c) => !ids || ids.has(c.id))
  if (!concepts.length) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const concept of concepts) {
    const size = sizeOf(concept.id)
    const pos = positions?.get(concept.id) || nodePos(concept.id)
    minX = Math.min(minX, pos.x)
    minY = Math.min(minY, pos.y)
    maxX = Math.max(maxX, pos.x + size.w)
    maxY = Math.max(maxY, pos.y + size.h)
  }
  return { x: minX, y: minY, w: Math.max(maxX - minX, 80), h: Math.max(maxY - minY, 80) }
}

function fitBounds(bounds, { animate = true, pad = null } = {}) {
  if (!bounds) return
  const rect = els.canvas.getBoundingClientRect()
  const overlay = inspectorWidth()
  const gap = pad ?? (rect.width < 640 ? 32 : 76)
  const availW = Math.max(220, rect.width - overlay - gap * 2)
  const availH = Math.max(180, rect.height - gap * 2)
  const k = clamp(Math.min(availW / bounds.w, availH / bounds.h, 1.06), 0.22, 1.25)
  const cx = gap + availW / 2
  const cy = gap + availH / 2

  view.k = k
  view.x = cx - (bounds.x + bounds.w / 2) * k
  view.y = cy - (bounds.y + bounds.h / 2) * k
  applyView({ animate })
}

function fitAll(options) {
  fitBounds(boundsOf(), options)
}

function centerOn(id) {
  const concept = store.getConcept(id)
  if (!concept) return
  const size = sizeOf(id)
  const pos = nodePos(id)
  const rect = els.canvas.getBoundingClientRect()
  const overlay = inspectorWidth()
  const targetX = (rect.width - overlay) / 2
  const targetY = rect.height / 2
  if (view.k < 0.72) {
    view.k = 0.9
  }
  view.x = targetX - (pos.x + size.w / 2) * view.k
  view.y = targetY - (pos.y + size.h / 2) * view.k
  userMovedView = true
  applyView({ animate: true })
}

function zoomAt(cx, cy, nextK) {
  const k = clamp(nextK, 0.22, 2.5)
  if (Math.abs(k - view.k) < 0.0005) return
  view.x = cx - ((cx - view.x) * k) / view.k
  view.y = cy - ((cy - view.y) * k) / view.k
  view.k = k
  userMovedView = true
  applyView()
}

function zoomAtViewCenter(factor) {
  const rect = els.canvas.getBoundingClientRect()
  const overlay = inspectorWidth()
  const x = (rect.width - overlay) / 2
  const y = rect.height / 2
  zoomAt(x, y, view.k * factor)
}

function setZoom(k) {
  const rect = els.canvas.getBoundingClientRect()
  const overlay = inspectorWidth()
  zoomAt((rect.width - overlay) / 2, rect.height / 2, k)
}

function screenToWorld(clientX, clientY) {
  const rect = els.canvas.getBoundingClientRect()
  return {
    x: (clientX - rect.left - view.x) / view.k,
    y: (clientY - rect.top - view.y) / view.k,
  }
}

/* --------------------------------------------------------------- crear */

function visualCenter() {
  const rect = els.canvas.getBoundingClientRect()
  const overlay = inspectorWidth()
  return {
    x: (rect.left + (rect.width - overlay) / 2 - view.x) / view.k,
    y: (rect.top + rect.height / 2 - view.y) / view.k,
  }
}

function overlaps(x, y, w, h, pad = 18) {
  for (const concept of state.doc.concepts) {
    const size = sizeOf(concept.id)
    const pos = nodePos(concept.id)
    if (
      x < pos.x + size.w + pad &&
      x + w + pad > pos.x &&
      y < pos.y + size.h + pad &&
      y + h + pad > pos.y
    ) {
      return true
    }
  }
  return false
}

function findFreeSpot(x, y, w = NODE_W, h = DEFAULT_H) {
  if (!overlaps(x, y, w, h)) return { x, y }
  for (let i = 1; i < 60; i += 1) {
    const angle = i * 2.399963
    const radius = 30 * Math.sqrt(i)
    const nx = x + Math.cos(angle) * radius
    const ny = y + Math.sin(angle) * radius
    if (!overlaps(nx, ny, w, h)) return { x: nx, y: ny }
  }
  return { x, y }
}

function createConceptAt(clientX = null, clientY = null) {
  let point
  if (clientX !== null && clientY !== null) {
    const world = screenToWorld(clientX, clientY)
    point = { x: world.x - NODE_W / 2, y: world.y - DEFAULT_H / 2 }
  } else {
    const center = visualCenter()
    point = { x: center.x - NODE_W / 2, y: center.y - DEFAULT_H / 2 }
  }
  const spot = findFreeSpot(Math.round(point.x), Math.round(point.y))
  store.addConcept({ x: spot.x, y: spot.y })
  requestAnimationFrame(() => {
    const el = nodeEls.get(state.selection)
    if (el) measure(state.selection)
    renderEdges()
  })
}

async function addImageConcept(url) {
  const center = visualCenter()
  const spot = findFreeSpot(Math.round(center.x - NODE_W / 2), Math.round(center.y - DEFAULT_H / 2))
  store.addConcept({ x: spot.x, y: spot.y, image: url })
}

/* --------------------------------------------------------------- arrastre */

function startNodeDrag(event, id) {
  if (event.button !== 0) return
  if (event.target.closest('.node__handle')) return
  event.preventDefault()
  const concept = store.getConcept(id)
  if (!concept) return
  store.setSelection(id)
  const el = nodeEls.get(id)
  if (el) el.focus({ preventScroll: true })
  // En modo foco el anillo es una composición: no se arrastra.
  if (state.focus.length) return

  drag = {
    id,
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startClientY: event.clientY,
    originX: concept.x,
    originY: concept.y,
    moved: false,
  }
  window.addEventListener('pointermove', onNodeDragMove)
  window.addEventListener('pointerup', onNodeDragUp, { once: true })
  window.addEventListener('pointercancel', onNodeDragUp, { once: true })
}

function onNodeDragMove(event) {
  if (!drag || event.pointerId !== drag.pointerId) return
  const dx = (event.clientX - drag.startClientX) / view.k
  const dy = (event.clientY - drag.startClientY) / view.k
  if (!drag.moved && Math.hypot(dx, dy) < 4) return
  if (!drag.moved) {
    drag.moved = true
    store.remember()
    els.canvas.classList.add('is-panning')
  }
  const concept = store.getConcept(drag.id)
  if (!concept) return
  const el = nodeEls.get(drag.id)
  concept.x = Math.round(drag.originX + dx)
  concept.y = Math.round(drag.originY + dy)
  if (el) {
    el.style.left = `${concept.x}px`
    el.style.top = `${concept.y}px`
  }
  refreshEdgeShapes()
}

function onNodeDragUp() {
  window.removeEventListener('pointermove', onNodeDragMove)
  els.canvas.classList.remove('is-panning')
  if (drag && drag.moved) {
    userMovedView = true
    store.markDirty()
  }
  const moved = drag
  drag = null
  if (moved) {
    // Un clic justo después del arrastre no debe abrir otra vez el inspector.
    setTimeout(() => {
      if (moved.id) refreshEdgeShapes()
    }, 0)
  }
}

/* --------------------------------------------------------------- paneo */

function bindPan() {
  els.canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return
    if (event.target.closest('.node') || event.target.closest('.edge__hit')) return
    event.preventDefault()
    pan = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: view.x,
      originY: view.y,
      moved: false,
    }
    els.canvas.classList.add('is-panning')
    els.canvas.setPointerCapture(event.pointerId)
    els.canvas.addEventListener('pointermove', onPanMove)
    els.canvas.addEventListener('pointerup', onPanUp, { once: true })
    els.canvas.addEventListener('pointercancel', onPanUp, { once: true })
  })
}

function onPanMove(event) {
  if (!pan || event.pointerId !== pan.pointerId) return
  const dx = event.clientX - pan.startX
  const dy = event.clientY - pan.startY
  if (!pan.moved && Math.hypot(dx, dy) < 3) return
  pan.moved = true
  view.x = pan.originX + dx
  view.y = pan.originY + dy
  userMovedView = true
  applyView()
}

function onPanUp(event) {
  els.canvas.classList.remove('is-panning')
  els.canvas.removeEventListener('pointermove', onPanMove)
  if (pan && !pan.moved) {
    store.setSelection(null)
    if (state.query) {
      // mantener la búsqueda visible
    }
  }
  if (event && els.canvas.hasPointerCapture?.(event.pointerId)) {
    els.canvas.releasePointerCapture(event.pointerId)
  }
  pan = null
}

function bindZoom() {
  els.canvas.addEventListener(
    'wheel',
    (event) => {
      if (event.ctrlKey && event.target.closest('.inspector')) return
      event.preventDefault()
      const rect = els.canvas.getBoundingClientRect()
      const mode = event.deltaMode === 1 ? 0.05 : 0.0016
      const factor = clamp(Math.exp(-event.deltaY * mode), 0.55, 1.8)
      zoomAt(event.clientX - rect.left, event.clientY - rect.top, view.k * factor)
    },
    { passive: false },
  )
}

/* --------------------------------------------------------------- relaciones */

function startLinking(fromId, event) {
  if (linking) return
  const concept = store.getConcept(fromId)
  if (!concept) return
  linking = { from: fromId, pointerId: event.pointerId, target: null, path: null }

  const path = document.createElementNS(NS, 'path')
  path.setAttribute('class', 'live')
  path.setAttribute('marker-end', 'url(#arrow-live)')
  els.liveLayer.replaceChildren(path)
  linking.path = path
  els.canvas.classList.add('is-linking')

  updateLivePath(event.clientX, event.clientY)

  window.addEventListener('pointermove', onLinkMove)
  window.addEventListener('pointerup', onLinkUp, { once: true })
  window.addEventListener('pointercancel', onLinkCancel, { once: true })
}

function updateLivePath(clientX, clientY) {
  if (!linking || !linking.path) return
  const from = boxOf(linking.from)
  if (!from) return
  const world = screenToWorld(clientX, clientY)
  const dx = world.x - from.cx
  const dy = world.y - from.cy
  let start
  let d

  if (Math.abs(dx) >= Math.abs(dy)) {
    const sign = dx >= 0 ? 1 : -1
    start = { x: from.cx + sign * (from.w / 2 + 2), y: from.cy }
    const offset = clamp(Math.abs(dx) * 0.45, 26, 140)
    d = `M ${start.x} ${start.y} C ${start.x + sign * offset} ${start.y} ${world.x - sign * offset} ${world.y} ${world.x} ${world.y}`
  } else {
    const sign = dy >= 0 ? 1 : -1
    start = { x: from.cx, y: from.cy + sign * (from.h / 2 + 2) }
    const offset = clamp(Math.abs(dy) * 0.45, 26, 130)
    d = `M ${start.x} ${start.y} C ${start.x} ${start.y + sign * offset} ${world.x} ${world.y - sign * offset} ${world.x} ${world.y}`
  }
  linking.path.setAttribute('d', d)
  linking.path.setAttribute('marker-end', 'url(#arrow-live)')
}

function onLinkMove(event) {
  if (!linking) return
  updateLivePath(event.clientX, event.clientY)
  const element = document.elementFromPoint(event.clientX, event.clientY)
  const node = element ? element.closest('.node') : null
  const targetId = node && node.dataset.id !== linking.from ? node.dataset.id : null
  if (targetId !== linking.target) {
    if (linking.target) nodeEls.get(linking.target)?.classList.remove('is-link-target')
    linking.target = targetId
    if (targetId) nodeEls.get(targetId)?.classList.add('is-link-target')
  }
}

function onLinkUp() {
  window.removeEventListener('pointermove', onLinkMove)
  window.removeEventListener('pointercancel', onLinkCancel)
  const target = linking ? linking.target : null
  const from = linking ? linking.from : null
  clearLinking()
  if (!from || !target) return
  if (store.findLink(from, target)) {
    notify(t('link.already'))
    return
  }
  store.addLink(from, target)
  if (state.selection) {
    // refresca el inspector si está abierto en uno de los dos extremos
  }
}

function onLinkCancel() {
  window.removeEventListener('pointermove', onLinkMove)
  clearLinking()
}

function clearLinking() {
  if (!linking) return
  if (linking.target) nodeEls.get(linking.target)?.classList.remove('is-link-target')
  els.liveLayer.replaceChildren()
  els.canvas.classList.remove('is-linking')
  linking = null
}

/* --------------------------------------------------------------- imágenes */

function bindImages() {
  els.canvas.addEventListener('dragenter', (event) => {
    if (!event.dataTransfer || ![...event.dataTransfer.types].includes('Files')) return
    event.preventDefault()
    dragDepth += 1
    els.drop.hidden = false
  })
  els.canvas.addEventListener('dragover', (event) => {
    if (!event.dataTransfer || ![...event.dataTransfer.types].includes('Files')) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  })
  els.canvas.addEventListener('dragleave', (event) => {
    if (!event.dataTransfer) return
    dragDepth = Math.max(0, dragDepth - 1)
    if (!dragDepth) els.drop.hidden = true
  })
  els.canvas.addEventListener('drop', async (event) => {
    event.preventDefault()
    dragDepth = 0
    els.drop.hidden = true
    const files = [...(event.dataTransfer?.files || [])].filter((file) => file.type.startsWith('image/'))
    if (!files.length) {
      notify(t('toast.notImage'))
      return
    }
    const point = screenToWorld(event.clientX, event.clientY)
    let index = 0
    for (const file of files) {
      try {
        const url = await uploadImage(file)
        const offset = index * 34
        const spot = findFreeSpot(Math.round(point.x - NODE_W / 2 + offset), Math.round(point.y - DEFAULT_H / 2 + offset), NODE_W, 220)
        store.addConcept({ x: spot.x, y: spot.y, image: url })
        index += 1
      } catch (err) {
        notify(err.message)
      }
    }
    if (index) {
      notify(`${index} ${t(index === 1 ? 'toast.imageAddedOne' : 'toast.imagesAdded')}`)
    }
    renderEdges()
  })

  document.addEventListener('paste', async (event) => {
    const target = event.target
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
    const items = [...(event.clipboardData?.items || [])].filter((item) => item.type.startsWith('image/'))
    if (!items.length) return
    event.preventDefault()
    for (const item of items) {
      const file = item.getAsFile()
      if (!file) continue
      try {
        const url = await uploadImage(file)
        await addImageConcept(url)
      } catch (err) {
        notify(err.message)
      }
    }
    renderEdges()
  })
}

/* --------------------------------------------------------------- eventos */

function bind() {
  bindPan()
  bindZoom()
  bindImages()

  els.canvas.addEventListener('dblclick', (event) => {
    if (event.target.closest('.node') || event.target.closest('.edge')) return
    createConceptAt(event.clientX, event.clientY)
  })

  window.addEventListener('resize', () => {
    if (state.focus.length) {
      const layout = computeFocusLayout()
      if (layout) {
        fitBounds(layout.bounds, { animate: false, pad: 44 })
        return
      }
    }
    renderEdges()
  })

  // Al abrir o cerrar el inspector cambia el espacio disponible para el anillo.
  window.addEventListener('concept:inspector', () => {
    if (!state.focus.length) return
    requestAnimationFrame(() => {
      const layout = computeFocusLayout()
      if (layout) fitBounds(layout.bounds, { animate: true, pad: 44 })
    })
  })

  window.addEventListener('concept:new-concept', () => createConceptAt())
  window.addEventListener('concept:language', () => {
    for (const [id, el] of nodeEls) {
      const concept = store.getConcept(id)
      if (concept) paintNode(el, concept)
    }
  })
  window.addEventListener('concept:image', (event) => {
    addImageConcept(event.detail.url)
  })
  window.addEventListener('concept:center', (event) => centerOn(event.detail.id))
  window.addEventListener('concept:zoom', (event) => zoomAtViewCenter(event.detail.factor || 1))
  window.addEventListener('concept:zoom-set', (event) => setZoom(event.detail.k || 1))
  window.addEventListener('concept:fit', () => {
    userMovedView = false
    if (state.focus.length) {
      const layout = computeFocusLayout()
      if (layout) {
        fitBounds(layout.bounds, { animate: true, pad: 44 })
        return
      }
    }
    fitAll({ animate: true })
  })
}
