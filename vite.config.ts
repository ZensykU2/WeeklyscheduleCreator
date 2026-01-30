import { defineConfig } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        electron({
            main: {
                // Shortcut of `build.lib.entry`.
                entry: 'electron/main.ts',
            },
            preload: {
                // Shortcut of `build.rollupOptions.input`.
                // Preload scripts may contain WebAssembly, so we use `build.rollupOptions.input` instead of `build.lib.entry`.
                input: path.resolve('electron/preload.ts'),
            },
            // PWA with Electron is a bad idea, so we disable it.
            // https://github.com/electron-vite/vite-plugin-electron/issues/112
            renderer: {},
        }),
    ],
})
