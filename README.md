# Concept

Un mapa de conceptos local para pensar despacio: escribe una idea, añade una imagen, relaciónala con las demás y abre su ficha para desarrollarla. Todo se guarda en tu equipo; nada viaja a internet.

## Abrir Concept

1. Haz doble clic en **`Iniciar Concept.bat`**.
2. Se abre Concept en una ventana de aplicación.
3. Para cerrarla, cierra esa ventana. El servidor se detiene solo.

**Requisitos:** Windows 10 u 11, Microsoft Edge y [Node.js 18 o superior](https://nodejs.org). El lanzador avisa si falta Node.

También puedes arrancarlo desde una consola:

```powershell
node server.mjs
```

y abrir la dirección que aparece (normalmente `http://127.0.0.1:7311`). Sin `--desktop` el servidor sigue activo hasta que pulses `Ctrl+C`.

## Lo esencial

| Quiero… | Cómo |
| --- | --- |
| Crear un concepto | Doble clic en el lienzo, botón **Concepto** o tecla `N`. |
| Añadir una imagen | Botón **Imagen**, arrastra un archivo al lienzo o pega una imagen con `Ctrl+V`. |
| Relacionar dos conceptos | Arrastra el tirador del borde de un concepto hasta otro. |
| Etiquetar o borrar una relación | Haz clic sobre la línea. |
| Describir un concepto | Haz clic en él: el panel lateral tiene título, descripción, imagen y relaciones. |
| Ver solo un concepto y lo relacionado | Doble clic en el concepto o tecla `F`. |
| Volver al mapa completo | **Ver el mapa completo**, `Esc` o `F` de nuevo. |
| Buscar | Tecla `/`; las coincidencias se resaltan. |
| Tener varios tableros | Botón **Tableros** (barra superior): crea, cambia o elimina tableros. |
| Cambiar el idioma | Selector **ES / EN** de la barra superior. El cambio es inmediato. |
| Moverme por el mapa | Arrastra el fondo, usa la rueda para el zoom y `0` para encuadrar todo. |
| Deshacer un cambio | `Ctrl+Z` (rehacer con `Ctrl+Y`). |

El **modo foco** ordena el concepto elegido y sus vecinos en un anillo, para leer una idea y su entorno sin ruido. Si entras en un vecino, se abre otro foco; la flecha del rótulo superior te devuelve al anterior.

## Atajos

| Atajo | Acción |
| --- | --- |
| `N` | Nuevo concepto |
| `/` | Buscar |
| `F` | Entrar o salir del foco |
| `Esc` | Cerrar panel, salir del foco o quitar la selección |
| `Supr` / `Retroceso` | Eliminar la selección |
| `Ctrl+Z` / `Ctrl+Y` | Deshacer / rehacer |
| `Ctrl+S` | Guardar ahora |
| `0` | Encuadrar el mapa |
| `+` / `-` | Acercar / alejar |
| `?` | Ayuda y atajos |

## Tus datos

- Cada tablero vive en su propio archivo dentro de **`data/boards/`**; **`data/boards.json`** guarda el índice con los títulos.
- Las imágenes se guardan en **`data/images/`** y los tableros las referencian; puedes usar la misma imagen en varios tableros.
- El guardado es automático; el indicador de la barra superior muestra si hay cambios pendientes.
- Desde el menú **⋮** puedes **exportar** el tablero actual a un `.json` e **importarlo** en otro equipo. Es la forma más sencilla de hacer una copia de seguridad portátil.

Si quieres empezar de cero con el tablero de ejemplo, cierra Concept y elimina los archivos de `data/boards/` y `data/boards.json`; al volver a abrir se copia `seed.json` como primer tablero. Haz antes una exportación si quieres conservar tus tableros.

El mapa antiguo en `data/atlas.json` se importa automáticamente como primer tablero la primera vez que arrancas esta versión; después queda como copia de seguridad.

Las imágenes que dejan de usarse no se borran automáticamente: puedes limpiar `data/images/` cuando te asegures de que ningún tablero las referencia.

## Cómo está hecho

Concept no tiene dependencias ni proceso de compilación:

- `server.mjs`: servidor HTTP local en Node, guardado atómico, imágenes y API mínima.
- `public/`: interfaz en HTML, CSS y módulos ES nativos.
- `seed.json`: mapa de ejemplo que se copia como primer tablero.
- `data/`: tus tableros e imágenes (no se versiona).
