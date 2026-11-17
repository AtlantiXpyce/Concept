/* Concept — tableros: lista, apertura y archivos en el servidor. */

const ACTIVE_KEY = 'concept:board'

export function savedBoardId() {
  try {
    return localStorage.getItem(ACTIVE_KEY)
  } catch {
    return null
  }
}

export function rememberBoard(id) {
  try {
    localStorage.setItem(ACTIVE_KEY, id)
  } catch {}
}

async function parse(res) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'board-request')
  return data
}

export async function listBoards() {
  const data = await parse(await fetch('/api/boards', { cache: 'no-store' }))
  return Array.isArray(data.boards) ? data.boards : []
}

export async function getBoard(id) {
  return parse(await fetch(`/api/boards/${encodeURIComponent(id)}`, { cache: 'no-store' }))
}

export async function createBoard(title = '') {
  return parse(
    await fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    }),
  )
}

export async function removeBoard(id) {
  return parse(await fetch(`/api/boards/${encodeURIComponent(id)}`, { method: 'DELETE' }))
}

export async function loadStartup() {
  const boards = await listBoards()
  if (!boards.length) throw new Error('board-missing')
  const wanted = savedBoardId()
  const ordered = [
    ...boards.filter((item) => item.id === wanted),
    ...boards.filter((item) => item.id !== wanted),
  ]
  for (const board of ordered) {
    try {
      const doc = await getBoard(board.id)
      rememberBoard(board.id)
      return { boards, board, doc }
    } catch {}
  }
  throw new Error('board-missing')
}
