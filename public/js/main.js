/* Concept — arranque, atajos de teclado y ciclo de vida. */

import * as store from './store.js'
import { initUI, closeTransient, focusSearch, createConcept, deleteSelection, openHelp, notify } from './ui.js'
import { initMap } from './map.js'

const bootEl = document.getElementById('boot')

async function start() {
  try {
    const res = await fetch('/api/state', { cache: 'no-store' })
    if (!res.ok) throw new Error('state')
    const data = await res.json()
    store.load(data)
  } catch {
    showBootError()
    return
  }

  initUI()
  initMap()
  bindShortcuts()
  startHeartbeat()

  requestAnimationFrame(() => {
    bootEl.classList.add('is-done')
    setTimeout(() => bootEl.remove(), 500)
  })
}

function showBootError() {
  bootEl.innerHTML = ''
  const panel = document.createElement('div')
  panel.className = 'boot__error'
  const title = document.createElement('p')
  title.className = 'boot__error-title'
  title.textContent = 'Concept no pudo abrir tu mapa'
  const text = document.createElement('p')
  text.className = 'boot__error-text'
  text.textContent =
    'Comprueba que la ventana del servidor siga abierta y vuelve a intentarlo. Tus datos están en la carpeta data.'
  const button = document.createElement('button')
  button.className = 'btn btn--primary'
  button.textContent = 'Reintentar'
  button.addEventListener('click', () => window.location.reload())
  panel.append(title, text, button)
  const mark = document.createElement('svg')
  mark.setAttribute('class', 'boot__mark')
  mark.setAttribute('viewBox', '0 0 24 24')
  mark.innerHTML = '<use href="#i-mark"/>'
  bootEl.append(mark, panel)
}

/* atajos */

function isTyping(target) {
  if (!target) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable
}

function bindShortcuts() {
  window.addEventListener('keydown', (event) => {
    if (document.querySelector('dialog[open]')) return

    const typing = isTyping(event.target)

    if (event.key === 'Escape') {
      if (typing) {
        event.target.blur()
        closeTransient()
        return
      }
      if (closeTransient()) return
      if (store.state.focus.length) {
        store.exitFocus()
        return
      }
      if (store.state.selectedLink) {
        store.setSelectedLink(null)
        return
      }
      if (store.state.selection) {
        store.setSelection(null)
        return
      }
      return
    }

    if (typing) return

    const mod = event.ctrlKey || event.metaKey
    const key = event.key.toLowerCase()

    if (mod && key === 'z') {
      event.preventDefault()
      if (event.shiftKey) store.redo()
      else store.undo()
      return
    }
    if (mod && key === 'y') {
      event.preventDefault()
      store.redo()
      return
    }
    if (mod && key === 's') {
      event.preventDefault()
      store.saveNow()
      return
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (!store.state.selection) return
      event.preventDefault()
      deleteSelection()
      return
    }

    if (mod || event.altKey) return

    if (key === 'n') {
      event.preventDefault()
      createConcept()
    } else if (key === '/') {
      event.preventDefault()
      focusSearch()
    } else if (key === 'f') {
      if (store.state.selection) {
        event.preventDefault()
        if (store.focusCenter() && store.focusCenter().id === store.state.selection) store.exitFocus()
        else store.enterFocus(store.state.selection)
      }
    } else if (key === '0') {
      event.preventDefault()
      window.dispatchEvent(new CustomEvent('concept:fit'))
    } else if (key === '+' || key === '=') {
      event.preventDefault()
      window.dispatchEvent(new CustomEvent('concept:zoom', { detail: { factor: 1.2 } }))
    } else if (key === '-') {
      event.preventDefault()
      window.dispatchEvent(new CustomEvent('concept:zoom', { detail: { factor: 1 / 1.2 } }))
    } else if (event.key === '?' || (event.shiftKey && key === '/')) {
      event.preventDefault()
      openHelp()
    }
  })
}

/* --------------------------------------------------------------- ciclo de vida */

function startHeartbeat() {
  const ping = () => {
    fetch('/api/ping', { method: 'POST', keepalive: true }).catch(() => {})
  }
  ping()
  setInterval(ping, 10000)
}

window.addEventListener('pagehide', () => {
  store.flush()
  try {
    navigator.sendBeacon('/api/bye')
  } catch {}
})

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') store.flush()
})

window.addEventListener('concept:notice', (event) => notify(event.detail.message))

start()
