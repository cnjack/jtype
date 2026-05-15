import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { lingui } from '@lingui/vite-plugin'
import path from 'path'

const appVersion = process.env.VITE_JTYPE_VERSION ?? process.env.JTYPE_VERSION ?? process.env.npm_package_version ?? '0.1.0'
const packageVersion = process.env.npm_package_version ?? '0.1.0'

export default defineConfig({
  plugins: [
    react({ babel: { plugins: ['@lingui/babel-plugin-lingui-macro'] } }),
    tailwindcss(),
    lingui(),
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
      '/api': 'http://localhost:13345',
      '/health': 'http://localhost:13345',
    },
  },
})
