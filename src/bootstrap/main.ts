import { app, BrowserWindow, Menu } from 'electron'

let win: Electron.BrowserWindow
app.setName('veonim')
Menu.setApplicationMenu(new Menu())

const comscan = (() => {
  const windows = new Set()
  const register = (fn: (ch: string, msg: any) => void) => windows.add(fn)
  const dispatch = (ch: string, message: any) => windows.forEach(cb => cb(ch, message))
  return { register, dispatch }
})()

app.on('ready', async () => {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 600,
    minHeight: 400,
    frame: true,
    titleBarStyle: 'hidden',
    backgroundColor: '#222',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegrationInWorker: true,
      experimentalFeatures: true,
    }
  })

  win.loadURL(`file:///${__dirname}/index.html`)
  comscan.register((ch, msg) => win.webContents.send(ch, msg))

  if (process.env.VEONIM_DEV) {
    function debounce (fn: Function, wait = 1) {
      let timeout: NodeJS.Timer
      return function(this: any, ...args: any[]) {
        const ctx = this
        clearTimeout(timeout)
        timeout = setTimeout(() => fn.apply(ctx, args), wait)
      }
    }

    const { watch } = require('fs')
    const srcDir = require('path').resolve(__dirname, '../../build')
    console.log('scrdir:', srcDir)

    const reloader = () => {
      console.log('reloading changes...')
      win.webContents.reload()
    }

    watch(srcDir, { recursive: true }, debounce(reloader, 250))

    console.log(`veonim started in develop mode. you're welcome`)

    const {
      default: installExtension,
      REACT_DEVELOPER_TOOLS,
      REDUX_DEVTOOLS,
    } = require('electron-devtools-installer')

    const load = (ext: any) => installExtension(ext)
      .then((n: any) => console.log('loaded ext:', n))
      .catch((e: any) => console.log('failed to load ext because...', e))

    // TODO: .id is a hack to make it work for electron 2.0+
    load(REACT_DEVELOPER_TOOLS.id)
    load(REDUX_DEVTOOLS.id)

    win.webContents.on('devtools-opened', () => setImmediate(() => win.focus()))
    win.webContents.openDevTools()
  }
})
