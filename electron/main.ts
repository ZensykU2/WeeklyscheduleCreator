import { app, BrowserWindow, ipcMain } from 'electron'

// Electron Performance Optimization Switches
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-oop-rasterization');
app.commandLine.appendSwitch('force-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('disable-software-rasterizer');
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Store from 'electron-store'

const store = new Store<Record<string, any>>();

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.mjs'),
        },
        autoHideMenuBar: true,
        frame: false,
        backgroundColor: '#020617',
        icon: path.join(__dirname, VITE_DEV_SERVER_URL ? '../assets/icon.png' : '../assets/icon.png'),
    })

    if (VITE_DEV_SERVER_URL) {
        win.loadURL(VITE_DEV_SERVER_URL)
    } else {
        win.loadFile(path.join(__dirname, '../dist/index.html'))
    }
}

app.whenReady().then(() => {
    // @ts-ignore
    ipcMain.handle('store-get', (_, key: string) => store.get(key));
    // @ts-ignore
    ipcMain.handle('store-set', (_, key: string, value: any) => store.set(key, value));
    // @ts-ignore
    ipcMain.handle('store-delete', (_, key: string) => store.delete(key));
    ipcMain.on('window-minimize', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        win?.minimize();
    });

    ipcMain.on('window-maximize', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win?.isMaximized()) {
            win.unmaximize();
        } else {
            win?.maximize();
        }
    });

    ipcMain.on('window-close', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        win?.close();
    });

    createWindow();
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})
