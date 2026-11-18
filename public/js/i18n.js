/* Concept — idiomas: español e inglés. */

const STORAGE_KEY = 'concept:lang'
const SUPPORTED = ['es', 'en']

const messages = {
  es: {
    'app.tagline': 'mapas conceptuales',
    'app.title': 'Concept — mapas conceptuales',
    'app.titleNamed': '{title} — Concept',

    'doc.untitled': 'Sin título',
    'doc.name': 'Nombre del mapa',

    'save.saved': 'Guardado',
    'save.saving': 'Guardando…',
    'save.error': 'No se pudo guardar',
    'save.savedHint': 'Tus cambios se guardan en este equipo',
    'save.errorHint':
      'No se pudo escribir en disco. Revisa que la carpeta de Concept siga accesible.',

    'rail.aria': 'Índice del mapa',
    'rail.close': 'Cerrar el índice',
    'rail.open': 'Abrir el índice',
    'rail.new': 'Nuevo concepto',
    'rail.addImage': 'Añadir una imagen al mapa',
    'rail.search': 'Buscar conceptos',
    'rail.concepts': 'Conceptos',
    'rail.focus': 'En este foco',
    'rail.none': 'Ningún concepto coincide.',
    'rail.center': 'Centrar el mapa',
    'rail.help': 'Atajos y datos',
    'rail.countOf': '{shown} de {total}',

    'tags.filter': 'Etiquetas',
    'tags.aria': 'Filtrar el mapa por etiquetas',
    'tags.clear': 'Limpiar',
    'tags.conceptOne': '{n} concepto',
    'tags.conceptOther': '{n} conceptos',
    'tags.addFilter': 'Filtrar por «{tag}» ({count})',
    'tags.removeFilter': 'Quitar el filtro «{tag}» ({count})',
    'tags.remove': 'Quitar la etiqueta «{tag}»',
    'tags.changeColor': 'Cambiar el color de la etiqueta «{tag}»',
    'tags.color': 'Color de la etiqueta',
    'tags.limit': 'Puedes poner hasta {max} etiquetas por concepto.',
    'tags.duplicate': 'Esa etiqueta ya está puesta.',

    'relation.one': 'relación',
    'relation.other': 'relaciones',

    'focus.label': 'En foco',
    'focus.back': 'Volver al concepto anterior',
    'focus.relatedOne': 'relacionado',
    'focus.relatedOther': 'relacionados',
    'focus.none': 'Sin relaciones',
    'focus.exit': 'Ver el mapa completo',
    'focus.short': 'Ver todo',

    'zoom.aria': 'Zoom',
    'zoom.out': 'Alejar',
    'zoom.in': 'Acercar',
    'zoom.reset': 'Volver al 100%',
    'zoom.fit': 'Ajustar',

    'view.aria': 'Modo de visualización',
    'view.map': 'Mapa',
    'view.graph': 'Grafo de importancia',
    'view.mapTitle': 'Ver el mapa con fichas completas',
    'view.graphTitle': 'Ver solo nombres en círculos según sus relaciones',

    'menu.more': 'Más opciones',
    'menu.export': 'Exportar mapa (.json)',
    'menu.import': 'Importar un mapa',
    'menu.reveal': 'Abrir carpeta de datos',
    'menu.help': 'Atajos y ayuda',

    'theme.aria': 'Tema',
    'theme.light': 'Tema claro',
    'theme.dark': 'Tema oscuro',

    'lang.aria': 'Idioma',

    'canvas.emptyTitle': 'Un lienzo para pensar',
    'canvas.emptyText':
      'Crea un concepto con doble clic en cualquier parte, o suelta una imagen para empezar.',
    'canvas.emptyAdd': 'Crear el primer concepto',
    'canvas.drop': 'Suelta la imagen para añadirla al mapa',
    'canvas.doubleClick': 'Doble clic',
    'canvas.hintCreate': 'para crear',
    'canvas.hintLink': 'Arrastra desde el borde de un concepto para relacionarlo',

    'inspector.aria': 'Detalle del concepto',
    'inspector.isolate': 'Aislar relaciones',
    'inspector.isolateExit': 'Salir del foco',
    'inspector.delete': 'Eliminar concepto',
    'inspector.close': 'Cerrar',
    'inspector.closeDetail': 'Cerrar el detalle',
    'inspector.concept': 'Concepto',
    'inspector.conceptImage': 'Concepto con imagen',
    'inspector.name': 'Nombre del concepto',
    'inspector.namePlaceholder': 'Nombra el concepto',
    'inspector.imageAlt': 'Imagen de {title}',
    'inspector.change': 'Cambiar',
    'inspector.remove': 'Quitar',
    'inspector.addImage': 'Añadir una imagen',
    'inspector.replaceImage': 'Sustituir la imagen',
    'inspector.savingImage': 'Guardando imagen…',
    'inspector.description': 'Descripción',
    'inspector.descPlaceholder':
      'Anota qué significa, por qué importa o cómo se conecta con el resto.',
    'inspector.descAria': 'Descripción del concepto',
    'inspector.tags': 'Etiquetas',
    'inspector.tagsNote': 'Filtra el mapa desde el índice',
    'inspector.tagPlaceholder': 'Añadir etiqueta…',
    'inspector.tagAria': 'Añadir una etiqueta al concepto',
    'inspector.addTag': 'Añadir etiqueta',
    'inspector.color': 'Color',
    'inspector.colorAria': 'Color del concepto',
    'inspector.connections': 'Conexiones',
    'inspector.noLinks': 'sin relaciones',
    'inspector.addLink': 'Relacionar con otro concepto',
    'inspector.isolateAction': 'Aislar este concepto y sus relaciones',
    'inspector.hintFocus': 'Ves este concepto y sus vecinos. El resto sigue guardado.',
    'inspector.hintIsolate': 'Se oculta el resto del mapa hasta que salgas del foco.',

    'link.notePlaceholder': 'Añadir una nota a la relación',
    'link.noteAria': 'Nota de la relación con {title}',
    'link.remove': 'Eliminar la relación',
    'link.removeAria': 'Eliminar la relación con {title}',
    'link.out': 'Sale de este concepto',
    'link.in': 'Llega a este concepto',
    'link.deleted': 'Relación eliminada',
    'link.linkedTo': 'Relacionado con «{title}»',
    'link.already': 'Estos conceptos ya están relacionados.',

    'undo': 'Deshacer',

    'concept.untitled': 'Concepto sin título',
    'concept.untitledShort': 'Sin título',
    'concept.deleted': '«{title}» eliminado',

    'toast.imageAdded': 'Imagen añadida al mapa',
    'toast.imageAddedOne': 'imagen añadida',
    'toast.imagesAdded': 'imágenes añadidas',
    'toast.notImage': 'Suelta una imagen en el mapa para añadirla.',
    'toast.imported': 'Mapa importado',
    'toast.exported': 'Mapa exportado',
    'toast.dataOpened': 'Carpeta de datos abierta',
    'toast.dataError': 'No se pudo abrir la carpeta de datos',

    'import.badMap': 'El archivo no parece un mapa de Concept.',
    'import.title': 'Importar este mapa',
    'import.text': 'Se reemplazará el mapa actual por «{title}». Después puedes deshacerlo.',
    'import.confirm': 'Importar mapa',

    'file.invalid': 'El archivo no contiene un mapa válido.',
    'file.unreadable': 'No se pudo leer el archivo.',

    'image.notImage': 'Ese archivo no es una imagen.',
    'image.tooLarge': 'La imagen supera los 18 MB. Prueba con una más ligera.',
    'image.readError': 'No se pudo leer la imagen.',
    'image.saveError': 'No se pudo guardar la imagen.',
    'image.errorFormat': 'Formato de imagen no válido.',
    'image.errorType': 'Usa PNG, JPG, WEBP, GIF o AVIF.',
    'image.errorTooLarge': 'La imagen supera los 18 MB.',
    'image.errorServer': 'El servidor no pudo procesar la imagen.',

    'node.dragTitle': 'Arrastra para relacionar con otro concepto',
    'node.dragAria': 'Relacionar «{title}» con otro concepto',
    'node.aria': '{title}. {relations}.',

    'pop.linkTitle': 'Relacionar con…',
    'pop.search': 'Buscar un concepto',
    'pop.allLinked': 'Ya está relacionado con todos los conceptos del mapa.',
    'pop.noMatch': 'Ningún concepto coincide.',
    'pop.close': 'Cerrar',
    'pop.relation': 'Relación',
    'pop.how': 'Cómo se relacionan',
    'pop.labelPlaceholder': 'Opcional: describe el vínculo',
    'pop.remove': 'Eliminar relación',
    'pop.enterClose': 'Intro para cerrar',

    'help.title': 'Todo lo que puedes hacer',
    'help.close': 'Cerrar',
    'help.canvas': 'En el lienzo',
    'help.keyboard': 'Con el teclado',
    'help.data': 'Tus datos',
    'help.dataBefore': 'Todo se guarda en',
    'help.dataAfter': ', junto a la aplicación. Sin cuentas y sin conexión.',
    'help.reveal': 'Abrir la carpeta de datos',
    'help.dblclick': 'Doble clic',
    'help.dblclickDesc': 'Crear un concepto en ese punto',
    'help.dragEdge': 'Arrastrar desde el borde',
    'help.dragEdgeDesc': 'Unir dos conceptos',
    'help.wheel': 'Rueda del ratón',
    'help.wheelDesc': 'Acercar y alejar',
    'help.dragBg': 'Arrastrar el fondo',
    'help.dragBgDesc': 'Mover el mapa',
    'help.dropImage': 'Soltar una imagen',
    'help.dropImageDesc': 'Añadirla como concepto visual',
    'help.dblclickNode': 'Doble clic en un concepto',
    'help.dblclickNodeDesc': 'Aislarlo con sus relacionados',
    'help.tags': 'Etiquetas',
    'help.tagsDesc': 'Clasifica un concepto y filtra el mapa desde el índice',
    'help.kNewDesc': 'Nuevo concepto',
    'help.kSearchDesc': 'Buscar',
    'help.kFocusDesc': 'Aislar el concepto seleccionado',
    'help.kEscDesc': 'Salir del foco o cerrar paneles',
    'help.kDelete': 'Supr',
    'help.kDeleteDesc': 'Eliminar la selección',
    'help.kUndoDesc': 'Deshacer',
    'help.kFitDesc': 'Encuadrar todo el mapa',

    'confirm.cancel': 'Cancelar',
    'confirm.delete': 'Eliminar',
    'confirm.deleteTitle': '¿Eliminar este concepto?',

    'palette.pine': 'Pino',
    'palette.amber': 'Ámbar',
    'palette.indigo': 'Índigo',
    'palette.terracotta': 'Terracota',
    'palette.verdigris': 'Verdigrís',
    'palette.mauve': 'Malva',
    'palette.ocean': 'Océano',
    'palette.olive': 'Oliva',
    'palette.rose': 'Rosa',
    'palette.copper': 'Cobre',
    'palette.slate': 'Pizarra',
    'palette.ruby': 'Rubí',

    'boards.aria': 'Tableros',
    'boards.title': 'Tus tableros',
    'boards.new': 'Nuevo tablero',
    'boards.defaultName': 'Tablero',
    'boards.delete': 'Eliminar tablero',
    'boards.deleteAria': 'Eliminar «{title}»',
    'boards.deleteTitle': '¿Eliminar este tablero?',
    'boards.deleteText':
      'Se eliminará «{title}» con todos sus conceptos. No se puede deshacer.',
    'boards.confirmDelete': 'Eliminar tablero',
    'boards.last': 'Necesitas al menos un tablero.',
    'boards.switchError': 'No se pudo abrir ese tablero.',
    'boards.createError': 'No se pudo crear el tablero.',
    'boards.deleteError': 'No se pudo eliminar el tablero.',
    'boards.deleted': 'Tablero «{title}» eliminado',
    'boards.conceptOne': '{n} concepto',
    'boards.conceptOther': '{n} conceptos',
    'boards.untitled': 'Tablero sin título',

    'boot.opening': 'Abriendo tu mapa',
    'boot.errorTitle': 'Concept no pudo abrir tu mapa',
    'boot.errorText':
      'Comprueba que la ventana del servidor siga abierta y vuelve a intentarlo. Tus datos están en la carpeta data.',
    'boot.retry': 'Reintentar',
  },

  en: {
    'app.tagline': 'concept maps',
    'app.title': 'Concept — concept maps',
    'app.titleNamed': '{title} — Concept',

    'doc.untitled': 'Untitled',
    'doc.name': 'Map name',

    'save.saved': 'Saved',
    'save.saving': 'Saving…',
    'save.error': 'Couldn’t save',
    'save.savedHint': 'Your changes are saved on this computer',
    'save.errorHint':
      'The file could not be written. Check that the Concept folder is still accessible.',

    'rail.aria': 'Map index',
    'rail.close': 'Close the index',
    'rail.open': 'Open the index',
    'rail.new': 'New concept',
    'rail.addImage': 'Add an image to the map',
    'rail.search': 'Search concepts',
    'rail.concepts': 'Concepts',
    'rail.focus': 'In this focus',
    'rail.none': 'No concepts match.',
    'rail.center': 'Centre the map',
    'rail.help': 'Shortcuts and data',
    'rail.countOf': '{shown} of {total}',

    'tags.filter': 'Tags',
    'tags.aria': 'Filter the map by tags',
    'tags.clear': 'Clear',
    'tags.conceptOne': '{n} concept',
    'tags.conceptOther': '{n} concepts',
    'tags.addFilter': 'Filter by “{tag}” ({count})',
    'tags.removeFilter': 'Remove the “{tag}” filter ({count})',
    'tags.remove': 'Remove the "{tag}" tag',
    'tags.changeColor': 'Change the colour of the "{tag}" tag',
    'tags.color': 'Tag colour',
    'tags.limit': 'You can add up to {max} tags per concept.',
    'tags.duplicate': 'That tag is already added.',

    'relation.one': 'link',
    'relation.other': 'links',

    'focus.label': 'Focused',
    'focus.back': 'Back to the previous concept',
    'focus.relatedOne': 'related',
    'focus.relatedOther': 'related',
    'focus.none': 'No links',
    'focus.exit': 'View the whole map',
    'focus.short': 'View all',

    'zoom.aria': 'Zoom',
    'zoom.out': 'Zoom out',
    'zoom.in': 'Zoom in',
    'zoom.reset': 'Reset to 100%',
    'zoom.fit': 'Fit',

    'view.aria': 'View mode',
    'view.map': 'Map',
    'view.graph': 'Importance graph',
    'view.mapTitle': 'Show the map with full cards',
    'view.graphTitle': 'Show only names in circles sized by their connections',

    'menu.more': 'More options',
    'menu.export': 'Export map (.json)',
    'menu.import': 'Import a map',
    'menu.reveal': 'Open data folder',
    'menu.help': 'Shortcuts and help',

    'theme.aria': 'Theme',
    'theme.light': 'Light theme',
    'theme.dark': 'Dark theme',

    'lang.aria': 'Language',

    'canvas.emptyTitle': 'A canvas for thinking',
    'canvas.emptyText':
      'Double-click anywhere to create a concept, or drop an image to get started.',
    'canvas.emptyAdd': 'Create the first concept',
    'canvas.drop': 'Drop the image to add it to the map',
    'canvas.doubleClick': 'Double-click',
    'canvas.hintCreate': 'to create',
    'canvas.hintLink': 'Drag from the edge of a concept to link it',

    'inspector.aria': 'Concept details',
    'inspector.isolate': 'Isolate links',
    'inspector.isolateExit': 'Exit focus',
    'inspector.delete': 'Delete concept',
    'inspector.close': 'Close',
    'inspector.closeDetail': 'Close the details',
    'inspector.concept': 'Concept',
    'inspector.conceptImage': 'Concept with image',
    'inspector.name': 'Concept name',
    'inspector.namePlaceholder': 'Name the concept',
    'inspector.imageAlt': 'Image of {title}',
    'inspector.change': 'Change',
    'inspector.remove': 'Remove',
    'inspector.addImage': 'Add an image',
    'inspector.replaceImage': 'Replace the image',
    'inspector.savingImage': 'Saving image…',
    'inspector.description': 'Description',
    'inspector.descPlaceholder':
      'Note what it means, why it matters or how it connects to the rest.',
    'inspector.descAria': 'Concept description',
    'inspector.tags': 'Tags',
    'inspector.tagsNote': 'Filter the map from the index',
    'inspector.tagPlaceholder': 'Add a tag…',
    'inspector.tagAria': 'Add a tag to the concept',
    'inspector.addTag': 'Add tag',
    'inspector.color': 'Colour',
    'inspector.colorAria': 'Concept colour',
    'inspector.connections': 'Connections',
    'inspector.noLinks': 'no links',
    'inspector.addLink': 'Link to another concept',
    'inspector.isolateAction': 'Isolate this concept and its links',
    'inspector.hintFocus': 'You are seeing this concept and its neighbours. The rest is still saved.',
    'inspector.hintIsolate': 'The rest of the map is hidden until you exit focus.',

    'link.notePlaceholder': 'Add a note to the link',
    'link.noteAria': 'Note for the link with {title}',
    'link.remove': 'Remove the link',
    'link.removeAria': 'Remove the link with {title}',
    'link.out': 'Goes out from this concept',
    'link.in': 'Comes into this concept',
    'link.deleted': 'Link removed',
    'link.linkedTo': 'Linked to “{title}”',
    'link.already': 'These concepts are already linked.',

    'undo': 'Undo',

    'concept.untitled': 'Untitled concept',
    'concept.untitledShort': 'Untitled',
    'concept.deleted': '“{title}” deleted',

    'toast.imageAdded': 'Image added to the map',
    'toast.imageAddedOne': 'image added',
    'toast.imagesAdded': 'images added',
    'toast.notImage': 'Drop an image on the map to add it.',
    'toast.imported': 'Map imported',
    'toast.exported': 'Map exported',
    'toast.dataOpened': 'Data folder opened',
    'toast.dataError': 'The data folder could not be opened',

    'import.badMap': 'This file doesn’t look like a Concept map.',
    'import.title': 'Import this map',
    'import.text': 'The current map will be replaced by “{title}”. You can undo it afterwards.',
    'import.confirm': 'Import map',

    'file.invalid': 'The file does not contain a valid map.',
    'file.unreadable': 'The file could not be read.',

    'image.notImage': 'That file is not an image.',
    'image.tooLarge': 'The image is over 18 MB. Try a lighter one.',
    'image.readError': 'The image could not be read.',
    'image.saveError': 'The image could not be saved.',
    'image.errorFormat': 'Invalid image format.',
    'image.errorType': 'Use PNG, JPG, WEBP, GIF or AVIF.',
    'image.errorTooLarge': 'The image is over 18 MB.',
    'image.errorServer': 'The server could not process the image.',

    'node.dragTitle': 'Drag to link to another concept',
    'node.dragAria': 'Link “{title}” to another concept',
    'node.aria': '{title}. {relations}.',

    'pop.linkTitle': 'Link to…',
    'pop.search': 'Search for a concept',
    'pop.allLinked': 'It is already linked to every concept on the map.',
    'pop.noMatch': 'No concepts match.',
    'pop.close': 'Close',
    'pop.relation': 'Link',
    'pop.how': 'How they connect',
    'pop.labelPlaceholder': 'Optional: describe the connection',
    'pop.remove': 'Remove link',
    'pop.enterClose': 'Enter to close',

    'help.title': 'Everything you can do',
    'help.close': 'Close',
    'help.canvas': 'On the canvas',
    'help.keyboard': 'With the keyboard',
    'help.data': 'Your data',
    'help.dataBefore': 'Everything is saved in',
    'help.dataAfter': ', next to the app. No accounts, no connection.',
    'help.reveal': 'Open the data folder',
    'help.dblclick': 'Double-click',
    'help.dblclickDesc': 'Create a concept at that point',
    'help.dragEdge': 'Drag from the edge',
    'help.dragEdgeDesc': 'Connect two concepts',
    'help.wheel': 'Mouse wheel',
    'help.wheelDesc': 'Zoom in and out',
    'help.dragBg': 'Drag the background',
    'help.dragBgDesc': 'Move the map',
    'help.dropImage': 'Drop an image',
    'help.dropImageDesc': 'Add it as a visual concept',
    'help.dblclickNode': 'Double-click a concept',
    'help.dblclickNodeDesc': 'Isolate it with its neighbours',
    'help.tags': 'Tags',
    'help.tagsDesc': 'Classify a concept and filter the map from the index',
    'help.kNewDesc': 'New concept',
    'help.kSearchDesc': 'Search',
    'help.kFocusDesc': 'Isolate the selected concept',
    'help.kEscDesc': 'Exit focus or close panels',
    'help.kDelete': 'Del',
    'help.kDeleteDesc': 'Delete the selection',
    'help.kUndoDesc': 'Undo',
    'help.kFitDesc': 'Fit the whole map',

    'confirm.cancel': 'Cancel',
    'confirm.delete': 'Delete',
    'confirm.deleteTitle': 'Delete this concept?',

    'palette.pine': 'Pine',
    'palette.amber': 'Amber',
    'palette.indigo': 'Indigo',
    'palette.terracotta': 'Terracotta',
    'palette.verdigris': 'Verdigris',
    'palette.mauve': 'Mauve',
    'palette.ocean': 'Ocean',
    'palette.olive': 'Olive',
    'palette.rose': 'Rose',
    'palette.copper': 'Copper',
    'palette.slate': 'Slate',
    'palette.ruby': 'Ruby',

    'boards.aria': 'Boards',
    'boards.title': 'Your boards',
    'boards.new': 'New board',
    'boards.defaultName': 'Board',
    'boards.delete': 'Delete board',
    'boards.deleteAria': 'Delete “{title}”',
    'boards.deleteTitle': 'Delete this board?',
    'boards.deleteText':
      '“{title}” will be deleted along with all its concepts. This cannot be undone.',
    'boards.confirmDelete': 'Delete board',
    'boards.last': 'You need at least one board.',
    'boards.switchError': 'That board could not be opened.',
    'boards.createError': 'The board could not be created.',
    'boards.deleteError': 'The board could not be deleted.',
    'boards.deleted': 'Board “{title}” deleted',
    'boards.conceptOne': '{n} concept',
    'boards.conceptOther': '{n} concepts',
    'boards.untitled': 'Untitled board',

    'boot.opening': 'Opening your map',
    'boot.errorTitle': 'Concept couldn’t open your map',
    'boot.errorText':
      'Check that the server window is still open and try again. Your data is in the data folder.',
    'boot.retry': 'Try again',
  },
}

let current = detect()

function detect() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (SUPPORTED.includes(saved)) return saved
  } catch {}
  return (navigator.language || '').toLowerCase().startsWith('en') ? 'en' : 'es'
}

export function getLang() {
  return current
}

export function setLang(lang) {
  if (!SUPPORTED.includes(lang) || lang === current) return false
  current = lang
  document.documentElement.lang = lang
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {}
  window.dispatchEvent(new CustomEvent('concept:language', { detail: { lang } }))
  return true
}

export function t(key, vars) {
  const text = messages[current]?.[key] ?? messages.es[key] ?? key
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (_, name) => (vars[name] ?? ''))
}

export function applyStaticTranslations(root = document) {
  document.documentElement.lang = current
  for (const el of root.querySelectorAll('[data-i18n]')) {
    el.textContent = t(el.dataset.i18n)
  }
  for (const el of root.querySelectorAll('[data-i18n-placeholder]')) {
    el.setAttribute('placeholder', t(el.dataset.i18nPlaceholder))
  }
  for (const el of root.querySelectorAll('[data-i18n-title]')) {
    el.setAttribute('title', t(el.dataset.i18nTitle))
  }
  for (const el of root.querySelectorAll('[data-i18n-aria]')) {
    el.setAttribute('aria-label', t(el.dataset.i18nAria))
  }
  for (const el of root.querySelectorAll('[data-i18n-short]')) {
    el.setAttribute('data-short', t(el.dataset.i18nShort))
  }
}
