import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import checker from 'vite-plugin-checker';
import run from 'vite-plugin-run';
import Sitemap from 'vite-plugin-sitemap'

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        tsconfigPaths(),
        checker({
            typescript: true
        }),
        Sitemap({
            hostname: 'https://flaights.es',
            dynamicRoutes: [
                '/',
                '/about',
                '/contact',
                '/genetic-trip',
                '/login',
                '/register',
                '/forgot-password',
                '/terms',
                '/privacy',
                '/acknowledgements',
            ]
        }),
        run({
            run: ['npm', 'run', 'orval'],
            startup: false,
            condition: (file) => file.includes('openapi.json') || file.includes('orval.config.js'),
        }),
        run({
            run: ['npm', 'run', 'asyncapi:client'],
            startup: false,
            condition: (file) => file.includes('asyncapi.json'),
        })
    ],
    assetsInclude: ['**/*.glb'],
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
        proxy: {
            '/api': {
                target: 'http://server:3000',
                changeOrigin: true,
                ws: true,
                rewrite: (path) => path.replace(/^\/api/, ''),
            }
        }
    },
    build: {
        sourcemap: false,
    },
}) 