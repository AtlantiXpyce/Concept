/* Concept — interfaz: índice, inspector, barra superior y avisos. */

import * as store from './store.js'
import { PALETTE, state } from './store.js'
import { uploadImage, readJsonFile, slugify, download, fold, clamp } from './utils.js'
import { t, getLang, setLang, applyStaticTranslations } from './i18n.js'
import * as boards from './boards.js'

const $ = (sel) => document.querySelector(sel)
const els = {}

let popover = null
let inspectorWasOpen = false
let tagsForId = null

const announce = (type, detail = {}) =>
  window.dispatchEvent(new CustomEvent(`concept:${type}`, { detail }))

const titleOf = (concept) => (concept && concept.title.trim()) || t('concept.untitled')
const relationCount = (n) => `${n} ${t(n === 1 ? 'relation.one' : 'relation.other')}`
const degreeOf = (id) => store.linksOf(id).length

export function initUI() {
  Object.assign(els, {
    rail: $('#rail'),
    railToggle: $('#rail-toggle'),
    railClose: $('#rail-close'),
    boardsButton: $('#boards-button'),
    scrim: $('#scrim'),
    newConcept: $('#new-concept'),
    emptyAdd: $('#empty-add'),
    railImage: $('#rail-image'),
    fileRail: $('#file-rail'),
    fileInsp: $('#file-insp'),
    fileImport: $('#file-import'),
    search: $('#search'),
    searchNone: $('#search-none'),
    tagFilter: $('#tag-filter'),
    tagChips: $('#tag-chips'),
    tagClear: $('#tag-clear'),
    conceptList: $('#concept-list'),
    conceptCount: $('#concept-count'),
    listLabel: $('#list-label'),
    centerMap: $('#center-map'),
    openHelp: $('#open-help'),

    stage: $('#stage'),
    canvas: $('#canvas'),
    hint: $('#canvas-hint'),
    empty: $('#empty'),
    doc: $('#doc'),
    docTitle: $('#doc-title'),
    saveStatus: $('#save-status'),
    saveText: $('#save-text'),
    focusbar: $('#focusbar'),
    focusTitle: $('#focus-title'),
    focusCount: $('#focus-count'),
    focusBack: $('#focus-back'),
    focusExit: $('#focus-exit'),

    zoomIn: $('#zoom-in'),
    zoomOut: $('#zoom-out'),
    zoomLevel: $('#zoom-level'),
    fitView: $('#fit-view'),
    menuButton: $('#menu-button'),
    menu: $('#menu'),

    inspector: $('#inspector'),
    inspectorScroll: $('#inspector-scroll'),
    inspKind: $('#insp-kind'),
    kindTick: $('#kind-tick'),
    inspTitle: $('#insp-title'),
    inspDesc: $('#insp-desc'),
    tagList: $('#tag-list'),
    tagInput: $('#tag-input'),
    tagAdd: $('#tag-add'),
    tagSuggestions: $('#tag-suggestions'),
    inspImage: $('#insp-image'),
    inspImageImg: $('#insp-image-img'),
    addImage: $('#add-image'),
    addImageLabel: $('#add-image-label'),
    replaceImage: $('#replace-image'),
    removeImage: $('#remove-image'),
    swatches: $('#swatches'),
    linkList: $('#link-list'),
    linkCount: $('#link-count'),
    linkAdd: $('#link-add'),
    isolate: $('#isolate'),
    isolateTop: $('#isolate-top'),
    isolateLabel: $('#isolate-label'),
    inspectorHint: $('#inspector-hint'),
    deleteConcept: $('#delete-concept'),
    closeInspector: $('#close-inspector'),

    toasts: $('#toasts'),
    langButtons: [...document.querySelectorAll('.lang__btn')],
    confirm: $('#confirm'),
    confirmTitle: $('#confirm-title'),
    confirmText: $('#confirm-text'),
    confirmOk: $('#confirm-ok'),
    help: $('#help'),
    helpClose: $('#help-close'),
    revealData: $('#reveal-data'),
    dataPath: $('#data-path'),
  })

  bind()
  syncLangButtons()
  store.subscribe(onStore)
  renderAll()
  loadServerInfo()
  announceReady()
}

function syncLangButtons() {
  const lang = getLang()
  for (const button of els.langButtons) {
    button.setAttribute('aria-pressed', String(button.dataset.lang === lang))
  }
}

function syncDocTitle() {
  document.title = state.doc.title.trim()
    ? t('app.titleNamed', { title: state.doc.title })
    : t('app.title')
}

function announceReady() {
  setTimeout(() => {
    document.body.classList.add('is-intro')
    setTimeout(() => document.body.classList.remove('is-intro'), 1000)
  }, 60)
}

async function loadServerInfo() {
  try {
    const res = await fetch('/api/info')
    if (!res.ok) return
    const info = await res.json()
    if (info.dataDir && els.dataPath) els.dataPath.textContent = info.dataDir
  } catch {}
}

/* --------------------------------------------------------------- reactividad */

function onStore(type, detail) {
  switch (type) {
    case 'load':
      // Al abrir otro tablero el campo debe mostrar su título aunque tuviera
      // el foco: el documento anterior ya no existe.
      els.docTitle.value = state.doc.title
      els.docTitle.style.width = ''
      renderAll()
      break
    case 'reload':
      renderAll()
      break
    case 'title':
      if (document.activeElement !== els.docTitle) els.docTitle.value = state.doc.title
      syncDocTitle()
      break
    case 'concepts':
      renderRail()
      renderTagFilter()
      renderEmptyState()
      renderFocusbar()
      if (state.selection) renderInspector()
      break
    case 'concept':
      renderRail()
      renderTagFilter()
      if (detail.history) renderInspector()
      break
    case 'tags':
      renderTagFilter()
      renderRail()
      renderFocusbar()
      break
    case 'links':
      renderRail()
      renderFocusbar()
      renderInspector()
      break
    case 'link':
      syncLinkLabel(detail.id)
      break
    case 'selection':
      renderRail()
      renderInspector()
      break
    case 'selectedLink':
      renderRail()
      renderInspector()
      break
    case 'focus':
      renderRail()
      renderFocusbar()
      renderInspector()
      renderEmptyState()
      break
    case 'query':
      renderRail()
      break
    case 'save':
      renderSave()
      break
  }
}

function renderAll() {
  if (document.activeElement !== els.docTitle) els.docTitle.value = state.doc.title
  syncDocTitle()
  if (document.activeElement !== els.search && state.query !== els.search.value) els.search.value = state.query
  renderRail()
  renderTagFilter()
  renderFocusbar()
  renderInspector()
  renderSave()
  renderEmptyState()
}

/* --------------------------------------------------------------- índice */

function visibleConcepts() {
  const focus = store.focusSet()
  let list = state.doc.concepts.slice()
  if (focus) {
    const center = store.focusCenter()
    list = list.filter((c) => focus.has(c.id))
    list.sort((a, b) => {
      if (center && a.id === center.id) return -1
      if (center && b.id === center.id) return 1
      return a.title.localeCompare(b.title, 'es')
    })
  }
  const query = fold(state.query)
  if (query) {
    list = list.filter((c) => fold(`${c.title} ${c.description}`).includes(query))
  }
  if (state.tagFilter.length) {
    list = list.filter((c) => store.matchesTagFilter(c))
  }
  return list
}

function renderRail() {
  const focus = store.focusSet()
  const query = fold(state.query)
  const filtering = Boolean(query) || state.tagFilter.length > 0
  const list = visibleConcepts()
  const total = state.doc.concepts.length

  els.listLabel.textContent = focus ? t('rail.focus') : t('rail.concepts')
  els.conceptCount.textContent = filtering ? t('rail.countOf', { shown: list.length, total }) : String(total)
  els.searchNone.hidden = !(filtering && !list.length)
  els.conceptList.replaceChildren()

  const fragment = document.createDocumentFragment()
  for (const concept of list) {
    const li = document.createElement('li')
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'concept'
    button.dataset.id = concept.id
    if (state.selection === concept.id) button.classList.add('is-active')
    if (concept.image) {
      const thumb = document.createElement('span')
      thumb.className = 'concept__thumb'
      const img = document.createElement('img')
      img.src = concept.image
      img.alt = ''
      img.loading = 'lazy'
      thumb.append(img)
      button.append(thumb)
    } else {
      const thumb = document.createElement('span')
      thumb.className = 'concept__thumb concept__thumb--empty'
      const tick = document.createElement('span')
      tick.className = 'concept__tick'
      tick.style.setProperty('--tick', concept.color)
      thumb.append(tick)
      button.append(thumb)
    }

    const text = document.createElement('span')
    text.className = 'concept__text'
    const title = document.createElement('span')
    title.className = 'concept__title'
    title.textContent = titleOf(concept)
    const sub = document.createElement('span')
    sub.className = 'concept__sub'
    const snippet = concept.description.replace(/\s+/g, ' ').trim()
    sub.textContent = snippet.length > 58 ? `${snippet.slice(0, 58)}…` : snippet
    text.append(title, sub)

    const tags = store.tagsOf(concept)
    if (tags.length) {
      const tagRow = document.createElement('span')
      tagRow.className = 'concept__tags'
      tagRow.title = tags.join(' · ')
      for (const tag of tags.slice(0, 2)) {
        const chip = document.createElement('span')
        chip.className = 'concept__tag'
        chip.textContent = tag
        tagRow.append(chip)
      }
      if (tags.length > 2) {
        const more = document.createElement('span')
        more.className = 'concept__tag concept__tag--more'
        more.textContent = `+${tags.length - 2}`
        tagRow.append(more)
      }
      text.append(tagRow)
    }
    button.append(text)

    const rel = document.createElement('span')
    rel.className = 'concept__rel'
    rel.textContent = String(degreeOf(concept.id))
    rel.title = relationCount(degreeOf(concept.id))
    button.append(rel)

    button.addEventListener('click', () => {
      store.setSelection(concept.id)
      announce('center', { id: concept.id })
      if (window.innerWidth <= 920) closeRail()
    })

    li.append(button)
    fragment.append(li)
  }
  els.conceptList.append(fragment)
}

function renderTagFilter() {
  const tags = store.allTags()
  const active = new Set(state.tagFilter)
  els.tagFilter.hidden = tags.length === 0
  els.tagClear.hidden = active.size === 0
  els.tagChips.replaceChildren()
  if (!tags.length) return

  const fragment = document.createDocumentFragment()
  for (const tag of tags) {
    const selected = active.has(tag.key)
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'tag-chip'
    button.dataset.tag = tag.key
    button.classList.toggle('is-active', selected)
    button.setAttribute('aria-pressed', String(selected))

    const label = document.createElement('span')
    label.className = 'tag-chip__label'
    label.textContent = tag.label
    const count = document.createElement('span')
    count.className = 'tag-chip__count'
    count.textContent = String(tag.count)
    button.append(label, count)

    const countText = t(tag.count === 1 ? 'tags.conceptOne' : 'tags.conceptOther', {
      n: tag.count,
    })
    button.title = t(selected ? 'tags.removeFilter' : 'tags.addFilter', {
      tag: tag.label,
      count: countText,
    })
    button.setAttribute('aria-label', button.title)
    button.addEventListener('click', () => store.toggleTagFilter(tag.key))
    fragment.append(button)
  }
  els.tagChips.append(fragment)
}

/* --------------------------------------------------------------- foco */

function renderFocusbar() {
  const center = store.focusCenter()
  if (!center) {
    els.focusbar.hidden = true
    els.doc.hidden = false
    return
  }
  els.doc.hidden = true
  els.focusbar.hidden = false
  els.focusTitle.textContent = titleOf(center)
  const near = store
    .neighborsOf(center.id)
    .filter((entry) => store.matchesTagFilter(entry.concept))
  els.focusCount.textContent = near.length
    ? `${near.length} ${t(near.length === 1 ? 'focus.relatedOne' : 'focus.relatedOther')}`
    : t('focus.none')
  els.focusBack.disabled = state.focus.length < 2
}

function renderEmptyState() {
  els.empty.hidden = state.doc.concepts.length > 0
  els.hint.classList.toggle('is-hidden', state.doc.concepts.length === 0 || state.focus.length > 0)
}

/* --------------------------------------------------------------- inspector */

function renderInspector() {
  const concept = state.selection ? store.getConcept(state.selection) : null
  if (!concept) {
    tagsForId = null
    els.tagInput.value = ''
    els.tagSuggestions.hidden = true
    if (inspectorWasOpen) {
      inspectorWasOpen = false
      announce('inspector', { open: false })
    }
    els.inspector.classList.remove('is-open')
    els.inspector.setAttribute('aria-hidden', 'true')
    return
  }

  els.inspector.classList.add('is-open')
  els.inspector.setAttribute('aria-hidden', 'false')
  if (!inspectorWasOpen) {
    inspectorWasOpen = true
    announce('inspector', { open: true })
  }
  els.inspKind.textContent = concept.image ? t('inspector.conceptImage') : t('inspector.concept')
  els.kindTick.style.background = concept.color

  if (document.activeElement !== els.inspTitle) els.inspTitle.value = concept.title
  autosizeTitle()
  if (document.activeElement !== els.inspDesc) els.inspDesc.value = concept.description

  if (concept.image) {
    els.inspImage.hidden = false
    if (els.inspImageImg.getAttribute('src') !== concept.image) {
      els.inspImageImg.src = concept.image
    }
    els.inspImageImg.alt = t('inspector.imageAlt', { title: titleOf(concept) })
    els.addImageLabel.textContent = t('inspector.replaceImage')
  } else {
    els.inspImage.hidden = true
    els.inspImageImg.removeAttribute('src')
    els.addImageLabel.textContent = t('inspector.addImage')
  }

  renderSwatches(concept)
  renderTags(concept)
  renderConnections(concept)
  renderIsolate(concept)
}

function renderTags(concept) {
  if (tagsForId !== concept.id) {
    tagsForId = concept.id
    els.tagInput.value = ''
  }

  const tags = store.tagsOf(concept)
  els.tagList.replaceChildren()
  for (const tag of tags) {
    const li = document.createElement('li')
    li.className = 'tag-pill'
    const label = document.createElement('span')
    label.className = 'tag-pill__label'
    label.textContent = tag
    const remove = document.createElement('button')
    remove.type = 'button'
    remove.className = 'tag-pill__remove'
    remove.title = t('tags.remove', { tag })
    remove.setAttribute('aria-label', remove.title)
    remove.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-close"/></svg>'
    remove.addEventListener('click', () => store.removeTag(concept.id, tag))
    li.append(label, remove)
    els.tagList.append(li)
  }
  els.tagInput.placeholder = t('inspector.tagPlaceholder')
  renderTagSuggestions(concept)
}

function renderTagSuggestions(concept) {
  if (document.activeElement !== els.tagInput) {
    els.tagSuggestions.hidden = true
    return
  }
  const taken = new Set(store.tagsOf(concept).map(fold))
  const query = fold(els.tagInput.value)
  const matches = store
    .allTags()
    .filter((tag) => !taken.has(tag.key) && (!query || tag.key.includes(query)))
    .slice(0, 8)

  els.tagSuggestions.replaceChildren()
  if (!matches.length) {
    els.tagSuggestions.hidden = true
    return
  }
  els.tagSuggestions.hidden = false
  for (const tag of matches) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'tag-suggestion'
    button.textContent = tag.label
    button.title = t('inspector.addTag')
    button.addEventListener('pointerdown', (event) => event.preventDefault())
    button.addEventListener('click', () => {
      const result = store.addTag(concept.id, tag.label)
      if (!result.ok) return
      els.tagInput.value = ''
      renderTagSuggestions(store.getConcept(concept.id) || concept)
      els.tagInput.focus({ preventScroll: true })
    })
    els.tagSuggestions.append(button)
  }
}

function addTagFromInput(conceptId = state.selection) {
  const concept = conceptId ? store.getConcept(conceptId) : null
  if (!concept) return
  const result = store.addTag(concept.id, els.tagInput.value)
  if (result.ok || result.reason === 'duplicate') {
    els.tagInput.value = ''
    renderTagSuggestions(store.getConcept(concept.id) || concept)
  } else if (result.reason === 'limit') {
    showToast(t('tags.limit', { max: store.TAG_LIMIT }))
  }
}

function renderSwatches(concept) {
  els.swatches.replaceChildren()
  for (const color of PALETTE) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'swatch'
    button.style.setProperty('--swatch', color.value)
    button.dataset.color = color.value
    button.title = t(`palette.${color.key}`)
    button.setAttribute('aria-label', button.title)
    button.setAttribute('aria-pressed', String(concept.color === color.value))
    if (concept.color === color.value) button.classList.add('is-selected')
    const check = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    check.setAttribute('class', 'icon')
    check.setAttribute('aria-hidden', 'true')
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use')
    use.setAttribute('href', '#i-check')
    check.append(use)
    button.append(check)
    button.addEventListener('click', () => {
      if (concept.color === color.value) return
      store.updateConcept(concept.id, { color: color.value }, { history: true })
      els.kindTick.style.background = color.value
    })
    els.swatches.append(button)
  }
}

function renderConnections(concept) {
  const connections = store.neighborsOf(concept.id)
  connections.sort((a, b) => titleOf(a.concept).localeCompare(titleOf(b.concept), 'es'))
  els.linkList.replaceChildren()
  els.linkCount.textContent = connections.length
    ? relationCount(connections.length)
    : t('inspector.noLinks')

  for (const { concept: other, link, direction } of connections) {
    const li = document.createElement('li')
    li.className = 'link-row'
    li.dataset.linkId = link.id

    const arrow = document.createElement('span')
    arrow.className = 'link-row__arrow'
    arrow.innerHTML = `<svg class="icon" aria-hidden="true"><use href="#i-arrow-${direction === 'out' ? 'right' : 'left'}"/></svg>`
    arrow.title = direction === 'out' ? t('link.out') : t('link.in')

    const main = document.createElement('div')
    main.className = 'link-row__main'
    const name = document.createElement('button')
    name.type = 'button'
    name.className = 'link-row__name'
    name.textContent = titleOf(other)
    name.addEventListener('click', () => {
      store.setSelection(other.id)
      announce('center', { id: other.id })
    })
    const label = document.createElement('input')
    label.className = 'link-row__label'
    label.value = link.label
    label.placeholder = t('link.notePlaceholder')
    label.setAttribute('aria-label', t('link.noteAria', { title: titleOf(other) }))
    label.addEventListener('input', () => {
      store.updateLink(link.id, { label: label.value }, { save: true })
    })
    label.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        label.blur()
      }
    })
    main.append(name, label)

    const remove = document.createElement('button')
    remove.type = 'button'
    remove.className = 'link-row__remove'
    remove.title = t('link.remove')
    remove.setAttribute('aria-label', t('link.removeAria', { title: titleOf(other) }))
    remove.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-close"/></svg>'
    remove.addEventListener('click', () => {
      store.removeLink(link.id)
      showToast(t('link.deleted'), { action: t('undo'), onAction: () => store.undo() })
    })

    li.append(arrow, main, remove)
    els.linkList.append(li)
  }
}

function syncLinkLabel(linkId) {
  const input = els.linkList.querySelector(`[data-link-id="${linkId}"] .link-row__label`)
  const link = store.getLink(linkId)
  if (input && link && document.activeElement !== input) input.value = link.label
}

function renderIsolate(concept) {
  const center = store.focusCenter()
  const isCenter = center && center.id === concept.id
  els.isolateLabel.textContent = isCenter
    ? t('inspector.isolateExit')
    : t('inspector.isolateAction')
  els.isolateTop.title = isCenter ? t('inspector.isolateExit') : t('inspector.isolate')
  els.isolateTop.setAttribute('aria-label', els.isolateTop.title)
  els.inspectorHint.textContent = isCenter
    ? t('inspector.hintFocus')
    : t('inspector.hintIsolate')
}

function autosizeTitle() {
  els.inspTitle.style.height = 'auto'
  els.inspTitle.style.height = `${els.inspTitle.scrollHeight}px`
}

export function focusConceptTitle() {
  setTimeout(() => {
    if (!state.selection) return
    els.inspTitle.focus({ preventScroll: true })
    els.inspTitle.select()
  }, 90)
}

export function createConcept() {
  announce('new-concept')
  focusConceptTitle()
}

/* --------------------------------------------------------------- guardado */

function renderSave() {
  const map = {
    saved: t('save.saved'),
    saving: t('save.saving'),
    error: t('save.error'),
  }
  els.saveStatus.dataset.state = state.save
  els.saveText.textContent = map[state.save] || t('save.saved')
  els.saveStatus.title =
    state.save === 'error' ? t('save.errorHint') : t('save.savedHint')
}

/* --------------------------------------------------------------- eventos */

function bind() {
  for (const button of els.langButtons) {
    button.addEventListener('click', () => setLang(button.dataset.lang))
  }
  window.addEventListener('concept:language', () => {
    applyStaticTranslations()
    closePopover()
    syncLangButtons()
    renderAll()
  })

  els.newConcept.addEventListener('click', createConcept)
  els.emptyAdd.addEventListener('click', createConcept)
  els.centerMap.addEventListener('click', () => announce('fit'))
  els.fitView.addEventListener('click', () => announce('fit'))
  els.zoomIn.addEventListener('click', () => announce('zoom', { factor: 1.2 }))
  els.zoomOut.addEventListener('click', () => announce('zoom', { factor: 1 / 1.2 }))
  els.zoomLevel.addEventListener('click', () => announce('zoom-set', { k: 1 }))

  els.railToggle.addEventListener('click', () => openRail())
  els.railClose.addEventListener('click', () => closeRail())
  els.scrim.addEventListener('click', () => closeRail())

  els.boardsButton.addEventListener('click', () => openBoardsPanel())

  els.railImage.addEventListener('click', () => els.fileRail.click())
  els.fileRail.addEventListener('change', async () => {
    const file = els.fileRail.files && els.fileRail.files[0]
    els.fileRail.value = ''
    if (!file) return
    try {
      els.railImage.classList.add('is-busy')
      const url = await uploadImage(file)
      announce('image', { url })
      showToast(t('toast.imageAdded'))
    } catch (err) {
      showToast(err.message)
    } finally {
      els.railImage.classList.remove('is-busy')
    }
  })

  els.search.addEventListener('input', () => {
    store.setQuery(els.search.value)
  })
  els.search.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      const first = visibleConcepts()[0]
      if (first) {
        store.setSelection(first.id)
        announce('center', { id: first.id })
      }
    } else if (event.key === 'Escape') {
      els.search.value = ''
      store.setQuery('')
      els.search.blur()
    }
  })

  els.docTitle.addEventListener('input', () => {
    store.setTitle(els.docTitle.value)
    const value = els.docTitle.value.trim() || t('doc.untitled')
    els.docTitle.style.width = `${clamp(value.length * 8.2, 90, 380)}px`
  })
  els.docTitle.addEventListener('blur', () => {
    els.docTitle.value = state.doc.title
    els.docTitle.style.width = ''
  })
  els.docTitle.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') els.docTitle.blur()
  })

  els.focusBack.addEventListener('click', () => store.focusBack())
  els.focusExit.addEventListener('click', () => store.exitFocus())

  els.closeInspector.addEventListener('click', () => store.setSelection(null))
  els.deleteConcept.addEventListener('click', deleteSelection)
  els.isolate.addEventListener('click', toggleIsolate)
  els.isolateTop.addEventListener('click', toggleIsolate)

  els.inspTitle.addEventListener('input', () => {
    autosizeTitle()
    store.updateConcept(state.selection, { title: els.inspTitle.value.replace(/\n/g, ' ') })
  })
  els.inspTitle.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      els.inspTitle.blur()
    }
  })
  els.inspTitle.addEventListener('blur', () => {
    const concept = store.getConcept(state.selection)
    if (concept && concept.title !== els.inspTitle.value) {
      store.updateConcept(state.selection, { title: els.inspTitle.value }, { history: false })
    }
  })
  els.inspDesc.addEventListener('input', () => {
    store.updateConcept(state.selection, { description: els.inspDesc.value })
  })

  els.tagAdd.addEventListener('click', () => {
    addTagFromInput()
    els.tagInput.focus({ preventScroll: true })
  })
  els.tagInput.addEventListener('input', () => {
    const concept = state.selection ? store.getConcept(state.selection) : null
    if (concept) renderTagSuggestions(concept)
  })
  els.tagInput.addEventListener('focus', () => {
    const concept = state.selection ? store.getConcept(state.selection) : null
    if (concept) renderTagSuggestions(concept)
  })
  els.tagInput.addEventListener('blur', () => {
    if (els.tagInput.value.trim()) addTagFromInput()
    setTimeout(() => {
      if (document.activeElement !== els.tagInput) els.tagSuggestions.hidden = true
    }, 120)
  })
  els.tagInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      addTagFromInput()
      return
    }
    if (event.key === 'Backspace' && !els.tagInput.value && state.selection) {
      const concept = store.getConcept(state.selection)
      const last = concept ? store.tagsOf(concept).at(-1) : null
      if (last) store.removeTag(concept.id, last)
      return
    }
    if (event.key === 'Escape') {
      els.tagInput.value = ''
      els.tagSuggestions.hidden = true
      els.tagInput.blur()
    }
  })

  els.tagClear.addEventListener('click', () => store.clearTagFilter())

  els.addImage.addEventListener('click', () => els.fileInsp.click())
  els.fileInsp.addEventListener('change', async () => {
    const file = els.fileInsp.files && els.fileInsp.files[0]
    els.fileInsp.value = ''
    if (!file || !state.selection) return
    try {
      els.addImageLabel.textContent = t('inspector.savingImage')
      const url = await uploadImage(file)
      store.updateConcept(state.selection, { image: url }, { history: true })
    } catch (err) {
      showToast(err.message)
      renderInspector()
    }
  })
  els.removeImage.addEventListener('click', () => {
    if (!state.selection) return
    store.updateConcept(state.selection, { image: null }, { history: true })
  })

  els.linkAdd.addEventListener('click', () => openLinkPicker())
  els.fileImport.addEventListener('change', async () => {
    const file = els.fileImport.files && els.fileImport.files[0]
    els.fileImport.value = ''
    if (file) await importFile(file)
  })

  els.menuButton.addEventListener('click', () => toggleMenu())
  els.menu.addEventListener('click', (event) => {
    const item = event.target.closest('[data-action]')
    if (!item) return
    toggleMenu(false)
    const action = item.dataset.action
    if (action === 'export') exportMap()
    else if (action === 'import') els.fileImport.click()
    else if (action === 'reveal') revealData()
    else if (action === 'help') openHelp()
  })

  els.openHelp.addEventListener('click', openHelp)
  els.helpClose.addEventListener('click', () => els.help.close())
  els.help.addEventListener('click', (event) => {
    if (event.target === els.help) els.help.close()
  })
  els.revealData.addEventListener('click', revealData)
  els.confirm.addEventListener('click', (event) => {
    if (event.target === els.confirm) els.confirm.close('cancel')
  })

  document.addEventListener('pointerdown', (event) => {
    if (
      popover &&
      !popover.el.contains(event.target) &&
      !event.target.closest('#boards-button')
    ) {
      closePopover()
    }
    if (!els.menu.hidden && !els.menu.contains(event.target) && !event.target.closest('#menu-button')) {
      toggleMenu(false)
    }
    if (
      window.innerWidth <= 920 &&
      els.rail.classList.contains('is-open') &&
      !els.rail.contains(event.target) &&
      !event.target.closest('#rail-toggle')
    ) {
      closeRail()
    }
  })

  window.addEventListener('concept:edge', (event) => openEdgePopover(event.detail))
  window.addEventListener('concept:notice', (event) => showToast(event.detail.message))
}

/* --------------------------------------------------------------- acciones */

function toggleIsolate() {
  const center = store.focusCenter()
  if (center && center.id === state.selection) store.exitFocus()
  else if (state.selection) store.enterFocus(state.selection)
}

export function deleteSelection() {
  const concept = state.selection ? store.getConcept(state.selection) : null
  if (!concept) return
  const removed = store.removeConcept(concept.id)
  if (!removed) return
  showToast(t('concept.deleted', { title: titleOf(removed) }), {
    action: t('undo'),
    onAction: () => store.undo(),
    duration: 6500,
  })
}

async function importFile(file) {
  try {
    const data = await readJsonFile(file)
    if (!data || !Array.isArray(data.concepts)) {
      throw new Error(t('import.badMap'))
    }
    const ok = await askConfirm({
      title: t('import.title'),
      text: t('import.text', { title: data.title || t('doc.untitled') }),
      confirmLabel: t('import.confirm'),
    })
    if (!ok) return
    store.replaceDoc(data)
    announce('fit')
    showToast(t('toast.imported'), { action: t('undo'), onAction: () => store.undo() })
  } catch (err) {
    showToast(err.message)
  }
}

function exportMap() {
  const name = `${slugify(state.doc.title)}-concept.json`
  download(name, JSON.stringify(state.doc, null, 2))
  showToast(t('toast.exported'))
}

async function revealData() {
  try {
    await fetch('/api/reveal', { method: 'POST' })
    showToast(t('toast.dataOpened'))
  } catch {
    showToast(t('toast.dataError'))
  }
}

export function openHelp() {
  els.help.showModal()
}

function askConfirm({ title, text, confirmLabel = t('confirm.delete') }) {
  return new Promise((resolve) => {
    els.confirmTitle.textContent = title
    els.confirmText.textContent = text
    els.confirmOk.textContent = confirmLabel
    els.confirm.returnValue = 'cancel'
    const done = () => {
      els.confirm.removeEventListener('close', done)
      resolve(els.confirm.returnValue === 'confirm')
    }
    els.confirm.addEventListener('close', done)
    els.confirm.showModal()
  })
}

function showToast(message, { action = null, onAction = null, duration = 4400 } = {}) {
  if (!message) return
  const toast = document.createElement('div')
  toast.className = 'toast'
  const text = document.createElement('span')
  text.textContent = message
  toast.append(text)

  let timer = null
  const dismiss = () => {
    if (!toast.isConnected) return
    clearTimeout(timer)
    toast.classList.add('is-out')
    setTimeout(() => toast.remove(), 220)
  }

  if (action && onAction) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'toast__action'
    button.textContent = action
    button.addEventListener('click', () => {
      onAction()
      dismiss()
    })
    toast.append(button)
  }

  els.toasts.append(toast)
  while (els.toasts.children.length > 3) els.toasts.firstElementChild.remove()

  const startTimer = () => {
    clearTimeout(timer)
    timer = setTimeout(dismiss, duration)
  }
  toast.addEventListener('mouseenter', () => clearTimeout(timer))
  toast.addEventListener('mouseleave', startTimer)
  startTimer()
}

/* --------------------------------------------------------------- popovers */

function closePopover() {
  if (!popover) return false
  const current = popover
  popover = null
  current.el.remove()
  current.onClose?.()
  return true
}

function mountPopover(el, { x, y, onClose = null } = {}) {
  closePopover()
  document.body.append(el)
  const rect = el.getBoundingClientRect()
  const margin = 10
  el.style.left = `${clamp(x, margin, window.innerWidth - rect.width - margin)}px`
  let top = y
  if (top + rect.height > window.innerHeight - margin) {
    top = Math.max(margin, y - rect.height - 18)
  }
  el.style.top = `${top}px`
  popover = { el, onClose }
  const input = el.querySelector('input, [data-autofocus]')
  if (input) setTimeout(() => input.focus({ preventScroll: true }), 30)
  return el
}

function openLinkPicker() {
  const concept = state.selection ? store.getConcept(state.selection) : null
  if (!concept) return
  const anchor = els.linkAdd.getBoundingClientRect()
  const existing = new Set(store.neighborsOf(concept.id).map((n) => n.concept.id))
  const available = state.doc.concepts.filter((c) => c.id !== concept.id && !existing.has(c.id))

  const el = document.createElement('div')
  el.className = 'pop'
  el.innerHTML = `
    <div class="pop__head">
      <span class="pop__title">${t('pop.linkTitle')}</span>
      <button class="icon-btn pop__close" aria-label="${t('pop.close')}"><svg class="icon" aria-hidden="true"><use href="#i-close"/></svg></button>
    </div>
    <input class="pop__input" type="search" placeholder="${t('pop.search')}" aria-label="${t('pop.search')}">
    <div class="pop__list" role="listbox"></div>
  `
  el.querySelector('.pop__close').addEventListener('click', () => closePopover())

  const list = el.querySelector('.pop__list')
  const input = el.querySelector('.pop__input')

  const draw = () => {
    const query = fold(input.value)
    const matches = available.filter((c) => fold(c.title).includes(query))
    list.replaceChildren()
    if (!available.length) {
      const empty = document.createElement('p')
      empty.className = 'pop__empty'
      empty.textContent = t('pop.allLinked')
      list.append(empty)
      return
    }
    if (!matches.length) {
      const empty = document.createElement('p')
      empty.className = 'pop__empty'
      empty.textContent = t('pop.noMatch')
      list.append(empty)
      return
    }
    for (const target of matches) {
      const item = document.createElement('button')
      item.type = 'button'
      item.className = 'pop__item'
      item.setAttribute('role', 'option')
      const tick = document.createElement('span')
      tick.className = 'concept__tick'
      tick.style.setProperty('--tick', target.color)
      const label = document.createElement('span')
      label.textContent = titleOf(target)
      item.append(tick, label)
      item.addEventListener('click', () => {
        const created = store.addLink(concept.id, target.id)
        closePopover()
        if (created) {
          renderInspector()
          showToast(t('link.linkedTo', { title: titleOf(target) }), {
            action: t('undo'),
            onAction: () => store.undo(),
          })
        }
      })
      list.append(item)
    }
  }

  input.addEventListener('input', draw)
  input.addEventListener('keydown', (event) => {
    const items = [...list.querySelectorAll('.pop__item')]
    if (!items.length) return
    const index = items.findIndex((item) => item.classList.contains('is-cursor'))
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      items[(index + 1) % items.length].classList.add('is-cursor')
      items.forEach((item) => item !== items[(index + 1) % items.length] && item.classList.remove('is-cursor'))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      const next = index <= 0 ? items.length - 1 : index - 1
      items.forEach((item) => item.classList.remove('is-cursor'))
      items[next].classList.add('is-cursor')
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const target = items[index] || items[0]
      target.click()
    }
  })

  draw()
  mountPopover(el, { x: anchor.left, y: anchor.bottom + 6 })
}

function openEdgePopover({ linkId, x, y }) {
  const link = store.getLink(linkId)
  if (!link) return
  const from = store.getConcept(link.from)
  const to = store.getConcept(link.to)
  if (!from || !to) return

  const el = document.createElement('div')
  el.className = 'pop'
  el.innerHTML = `
    <div class="pop__head">
      <span class="pop__title">${t('pop.relation')}</span>
      <button class="icon-btn pop__close" aria-label="${t('pop.close')}"><svg class="icon" aria-hidden="true"><use href="#i-close"/></svg></button>
    </div>
    <div class="pop__names"></div>
    <div class="pop__field">
      <label class="pop__label" for="edge-label">${t('pop.how')}</label>
      <input class="pop__input pop__input--label" id="edge-label" placeholder="${t('pop.labelPlaceholder')}">
    </div>
    <div class="pop__foot">
      <button class="pop__danger" type="button">${t('pop.remove')}</button>
      <span class="pop__hint">${t('pop.enterClose')}</span>
    </div>
  `

  const names = el.querySelector('.pop__names')
  const a = document.createElement('strong')
  a.textContent = titleOf(from)
  const arrow = document.createElement('svg')
  arrow.setAttribute('class', 'icon')
  arrow.setAttribute('aria-hidden', 'true')
  arrow.innerHTML = '<use href="#i-arrow-right"/>'
  const b = document.createElement('strong')
  b.textContent = titleOf(to)
  names.append(a, arrow, b)

  const input = el.querySelector('#edge-label')
  input.value = link.label
  input.addEventListener('input', () => {
    store.updateLink(link.id, { label: input.value }, { save: true })
  })
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') closePopover()
  })

  el.querySelector('.pop__close').addEventListener('click', () => closePopover())
  el.querySelector('.pop__danger').addEventListener('click', () => {
    store.removeLink(link.id)
    closePopover()
    showToast(t('link.deleted'), { action: t('undo'), onAction: () => store.undo() })
  })

  mountPopover(el, { x: x - 140, y: y + 14, onClose: () => store.setSelectedLink(null) })
  setTimeout(() => input.select(), 30)
}

/* --------------------------------------------------------------- tableros */

function openBoardsPanel() {
  if (popover && popover.el.classList.contains('pop--boards')) {
    closePopover()
    return
  }
  const anchor = els.boardsButton.getBoundingClientRect()
  const el = document.createElement('div')
  el.className = 'pop pop--boards'
  el.innerHTML = `
    <div class="pop__head">
      <span class="pop__title">${t('boards.title')}</span>
      <button class="icon-btn pop__close" aria-label="${t('pop.close')}"><svg class="icon" aria-hidden="true"><use href="#i-close"/></svg></button>
    </div>
    <div class="boards__list" role="listbox" aria-label="${t('boards.aria')}"></div>
    <button class="boards__new" type="button">
      <svg class="icon" aria-hidden="true"><use href="#i-plus"/></svg>
      <span>${t('boards.new')}</span>
    </button>
  `
  el.querySelector('.pop__close').addEventListener('click', () => closePopover())
  el.querySelector('.boards__new').addEventListener('click', () => createNewBoard())
  mountPopover(el, { x: anchor.left, y: anchor.bottom + 6 })
  refreshBoardsList(el.querySelector('.boards__list'))
}

async function refreshBoardsList(listEl) {
  // Guarda el título pendiente para que la lista muestre el nombre actual.
  if (store.state.save !== 'saved') await store.saveNow()
  await fillBoardsList(listEl)
}

async function fillBoardsList(listEl) {
  let list
  try {
    list = await boards.listBoards()
  } catch {
    showToast(t('boards.switchError'))
    closePopover()
    return
  }
  if (!popover || !popover.el.contains(listEl)) return
  listEl.replaceChildren()

  for (const board of list) {
    const active = board.id === store.state.boardId
    const row = document.createElement('div')
    row.className = 'boards__row'
    if (active) row.classList.add('is-active')

    const pick = document.createElement('button')
    pick.type = 'button'
    pick.className = 'boards__pick'
    pick.setAttribute('role', 'option')
    pick.setAttribute('aria-selected', String(active))
    const name = document.createElement('span')
    name.className = 'boards__name'
    name.textContent = board.title.trim() || t('boards.untitled')
    const count = document.createElement('span')
    count.className = 'boards__count'
    const n = Number(board.count) || 0
    count.textContent = t(n === 1 ? 'boards.conceptOne' : 'boards.conceptOther', { n })
    pick.append(name, count)
    pick.addEventListener('click', () => switchBoard(board.id))

    const remove = document.createElement('button')
    remove.type = 'button'
    remove.className = 'boards__delete'
    remove.title = t('boards.delete')
    remove.setAttribute('aria-label', t('boards.deleteAria', { title: name.textContent }))
    remove.disabled = list.length <= 1
    remove.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-trash"/></svg>'
    remove.addEventListener('click', (event) => {
      event.stopPropagation()
      confirmDeleteBoard(board)
    })

    row.append(pick, remove)
    listEl.append(row)
  }
}

async function switchBoard(id) {
  closePopover()
  if (id === store.state.boardId) return
  await saveBeforeSwitch()
  try {
    const doc = await boards.getBoard(id)
    store.load(doc, id)
    boards.rememberBoard(id)
  } catch {
    showToast(t('boards.switchError'))
  }
}

async function saveBeforeSwitch() {
  if (store.state.save === 'saved') return
  await store.saveNow()
}

function nextBoardName(list) {
  const base = t('boards.defaultName')
  const used = new Set(list.map((board) => board.title.trim()))
  let n = 1
  while (used.has(`${base} ${n}`)) n += 1
  return `${base} ${n}`
}

async function createNewBoard() {
  closePopover()
  await saveBeforeSwitch()
  try {
    let list = []
    try {
      list = await boards.listBoards()
    } catch {}
    const { board, doc } = await boards.createBoard(nextBoardName(list))
    store.load(doc, board.id)
    boards.rememberBoard(board.id)
    setTimeout(() => {
      els.docTitle.focus()
      els.docTitle.select()
    }, 80)
  } catch {
    showToast(t('boards.createError'))
  }
}

async function confirmDeleteBoard(board) {
  closePopover()
  const name = board.title.trim() || t('boards.untitled')
  const ok = await askConfirm({
    title: t('boards.deleteTitle'),
    text: t('boards.deleteText', { title: name }),
    confirmLabel: t('boards.confirmDelete'),
  })
  if (!ok) return

  const isCurrent = board.id === store.state.boardId
  try {
    if (isCurrent) store.cancelPending()
    await boards.removeBoard(board.id)
    if (isCurrent) {
      const left = await boards.listBoards()
      if (left.length) await loadFirstAvailable(left)
    }
    showToast(t('boards.deleted', { title: name }))
  } catch (err) {
    if (err && err.message === 'board-last') showToast(t('boards.last'))
    else showToast(t('boards.deleteError'))
  }
}

async function loadFirstAvailable(list) {
  for (const item of list) {
    try {
      const doc = await boards.getBoard(item.id)
      store.load(doc, item.id)
      boards.rememberBoard(item.id)
      return true
    } catch {}
  }
  return false
}

/* --------------------------------------------------------------- rail móvil / menú */

function openRail() {
  els.rail.classList.add('is-open')
  els.scrim.hidden = false
  els.railToggle.setAttribute('aria-expanded', 'true')
}
function closeRail() {
  els.rail.classList.remove('is-open')
  els.scrim.hidden = true
  els.railToggle.setAttribute('aria-expanded', 'false')
}
function toggleMenu(force) {
  const open = typeof force === 'boolean' ? force : els.menu.hidden
  els.menu.hidden = !open
  els.menuButton.setAttribute('aria-expanded', String(open))
}

export function closeTransient() {
  let closed = false
  if (closePopover()) closed = true
  if (!els.menu.hidden) {
    toggleMenu(false)
    closed = true
  }
  if (els.rail.classList.contains('is-open')) {
    closeRail()
    closed = true
  }
  return closed
}

export function focusSearch() {
  if (window.innerWidth <= 920) openRail()
  els.search.focus()
  els.search.select()
}

export function notify(message) {
  showToast(message)
}

export function zoomLabel(value) {
  els.zoomLevel.textContent = `${Math.round(value * 100)}%`
}
