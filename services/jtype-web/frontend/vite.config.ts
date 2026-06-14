import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { lingui, linguiTransformerBabelPreset } from '@lingui/vite-plugin'
import path from 'path'

const appVersion = process.env.VITE_JTYPE_VERSION ?? process.env.JTYPE_VERSION ?? process.env.npm_package_version ?? '0.1.0'
const packageVersion = process.env.npm_package_version ?? '0.1.0'

export default defineConfig({
  plugins: [
    // @vitejs/plugin-react v6 (Vite 8 / Rolldown) transforms with oxc and no
    // longer accepts a `babel` option, so the Lingui macro must run as its own
    // Rolldown-babel pass — otherwise `@lingui/*/macro` imports leak into the
    // bundle and throw "executed outside the context of compilation" at runtime.
    react(),
    tailwindcss(),
    lingui(),
    babel({ presets: [linguiTransformerBabelPreset()] }),
  ],
  resolve: {
    dedupe: ['@lingui/core', '@lingui/react'],
    alias: {
      '@shared': path.resolve(__dirname, '../../../shared'),
    },
  },
  define: {
    __JTYPE_VERSION__: JSON.stringify(appVersion),
    __JTYPE_PACKAGE_VERSION__: JSON.stringify(packageVersion),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      // `ws: true` proxies the WebSocket upgrade for /api/v1/workspaces/:id/live
      // so realtime kanban/document events work through the dev server too.
      '/api': { target: 'http://localhost:13345', ws: true },
      '/health': 'http://localhost:13345',
    },
  },
})
