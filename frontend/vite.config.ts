import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        tsconfigPaths()
    ],
    server: {
        port: 5173,
        host: '0.0.0.0',
        open: false,
        watch: {
            usePolling: true,
            interval: 1000,
        },
        hmr: {
            host: 'localhost',
            port: 5173,
            protocol: 'ws',
        },
        middlewareMode: false,
    },
    build: {
        sourcemap: false,
    },
})