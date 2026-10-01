import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { rmSync } from 'node:fs'

export default defineConfig({
    plugins: [
        react(),
        // public/ is copied verbatim; keep its dev docs out of the shipped extension
        {
            name: 'drop-dev-docs',
            closeBundle: () => rmSync('dist/CLAUDE.md', { force: true }),
        },
    ],
    build: {
        outDir: 'dist',
        rollupOptions: {
            input: {
                popup: 'index.html',
                timeline: 'timeline.html',
                settings: 'settings.html',
                'service-worker': 'src/service-worker.ts'
            },
            output: {
                entryFileNames: (assetInfo) => {
                    return assetInfo.name === 'service-worker' ? '[name].js' : 'assets/[name]-[hash].js'
                }
            }
        },
    },
})
