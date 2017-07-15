// TODO: put somewhere else
const logger = (str: TemplateStringsArray | string, v: any[]) => typeof str === 'string'
  ? console.log(str as string)
  : console.log((str as TemplateStringsArray).map((s, ix) => s + (v[ix] || '')).join(''))

export const log = (str: TemplateStringsArray | string, ...vars: any[]) => logger(str, vars)
export const onProp = <T>(cb: Function): T => new Proxy({}, { get: (_, name) => cb(name) }) as T

import { attach, onRedraw } from '../neovim'
const merge = Object.assign

type ScrollRegion = [number, number, number, number]

interface Colors {
  fg: string,
  bg: string,
  sp: string
}

interface Font {
  height: number,
  width: number,
  lineHeight: number,
  face: string
}

interface GridPos {
  col: number,
  row: number,
  x: number,
  y: number
}

const { devicePixelRatio: pxRatio, innerHeight: winHeight, innerWidth: winWidth } = window
const canvas = document.getElementById('nvim') as HTMLCanvasElement
const ui = canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D

const resizeCanvas = (height: number, width: number) => merge(canvas, { height, width })
const updateCursor = ({ row, col, x, y }: GridPos) => console.log(`move cursor to row:${row} col:${col} x:${x} y:${y}`)

const sizeToGrid = (height: number, width: number) => ({
  row: Math.floor(height / font.height),
  col: Math.floor(width / font.width)
})

const extGridToPixels = (obj: { col: number, row: number }) => new Proxy(obj, { get: (t, key) => {
  if (key === 'x') return t.col * font.width
  if (key === 'y') return t.row * font.height
  else return Reflect.get(t, key)
}}) as GridPos

const setFontSize = (px: number) => {
  const { lineHeight, face } = font
  console.log(pxRatio)
  //const fontHeight = px * (pxRatio || 1)
  const fontHeight = px
  ui.font = `${fontHeight}px ${face}`

  const { width } = ui.measureText('m')
  const height = Math.ceil(lineHeight === 1.2
    ? width * 2
    : fontHeight * lineHeight)

  merge(font, { width, height })
  // resize canvas?
}

const api = new Map<string, Function>()
const r = new Proxy(api, {
  set: (_: any, name, fn) => {
    api.set(name as string, fn)
    return true
  }
})

let lastScrollRegion: ScrollRegion | null = null
const colors: Colors = {
  fg: '#ddd',
  bg: '#222',
  sp: '#f00'
}

const font: Font = {
  height: 0,
  width: 0,
  lineHeight: 1.2,
  face: 'Roboto Mono'
}

const clearBlock = (col: number, row: number, width: number, height: number) =>
  fillBlock(col, row, width, height, colors.bg)

const fillBlock = (col: number, row: number, width: number, height: number, color: string) => {
  const { width: fw, height: fh } = font
  ui.fillStyle = color
  ui.fillRect(col * fw, row * fh, width * fw, height * fh)
}

r.cursor_goto = (row: number, col: number) => merge(cursor, { col, row })
r.update_fg = (fg: number) => fg > -1 && merge(colors, { fg })
r.update_bg = (bg: number) => bg > -1 && merge(colors, { bg })
r.update_sp = (sp: number) => sp > -1 && merge(colors, { sp })
r.set_scroll_region = (m: any[]) => lastScrollRegion = m[0]
r.eol_clear = () => clearBlock(cursor.col, cursor.row, grid.col - cursor.col + 1, 1)
r.clear = () => clearBlock(0, 0, grid.col, grid.row)

r.put = (m: any[]) => {
  const total = m.length
  if (!total) return
  clearBlock(cursor.col, cursor.row, total, 1)

  ui.fillStyle = colors.fg

  for (let ix = 0; ix < total; ix++) {
    ui.fillText(m[ix][0], cursor.x, cursor.y)
    cursor.col++
    if (cursor.col > grid.col) {
      cursor.col = 0
      cursor.row++
    }
  }
}

resizeCanvas(winHeight, winWidth)
setFontSize(12)
const cursor = extGridToPixels({ row: 0, col: 0 })
const grid = extGridToPixels(sizeToGrid(winHeight, winWidth))

onRedraw((m: any[]) => {
  const count = m.length
  for (let ix = 0; ix < count; ix++) {
    const [ method, ...args ] = m[ix]
    const fn = api.get(method)
    if (fn) method === 'put' 
      ? fn(args)
      : args.forEach((a: any[]) => fn(...a))
  }

  lastScrollRegion = null
  updateCursor(cursor)
})

attach(grid.col, grid.row)
