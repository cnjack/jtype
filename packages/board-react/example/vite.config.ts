import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    // `jtype-board-react` is a file: symlink into ../ which carries its own
    // node_modules (react 19 devDeps). Pin react resolution to THIS app's
    // react 18 so the peer-external dist import can't load two reacts —
    // dedupe covers the production build, the explicit aliases cover the dev
    // server (which serves the symlinked dist via /@fs/ and would otherwise
    // resolve react from the package's own node_modules). Real consumers
    // (git/npm install) get a packed copy without node_modules and need none
    // of this.
    dedupe: ['react', 'react-dom'],
    alias: {
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    },
  },
})
