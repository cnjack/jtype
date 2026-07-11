import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { lingui, linguiTransformerBabelPreset } from '@lingui/vite-plugin'
import dts from 'vite-plugin-dts'
import path from 'path'

// Library build for the embeddable board. Mirrors the web frontend's plugin
// stack (react + tailwind v4 + the lingui macro babel pass — see the comment in
// services/jtype-web/frontend/vite.config.ts for why the macro needs its own
// babel pass under Vite 8/Rolldown), plus d.ts bundling.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    lingui(),
    babel({ presets: [linguiTransformerBabelPreset()] }),
    dts({
      rollupTypes: true,
      tsconfigPath: './tsconfig.json',
      // shared/lib/board.ts carries the public card model (BoardViewCard,
      // BoardTag). Without listing it, declaration rollup would leave a
      // relative `../../../shared/...` import in dist/index.d.ts that no
      // consumer can resolve.
      include: ['src', '../../shared/lib/board.ts', '../../shared/lib/frontmatter.ts'],
    }),
  ],
  resolve: {
    dedupe: ['@lingui/core', '@lingui/react'],
    alias: {
      '@shared': path.resolve(__dirname, '../../shared'),
      // use-sync-external-store is CJS-only; bundling it verbatim leaves a
      // runtime `require("react")` against the external react peer, breaking
      // pure-ESM consumers. Swap in a local ESM port (see the vendor file).
      'use-sync-external-store/with-selector': path.resolve(
        __dirname,
        'src/vendor/useSyncExternalStoreWithSelector.ts',
      ),
      'use-sync-external-store/shim/with-selector': path.resolve(
        __dirname,
        'src/vendor/useSyncExternalStoreWithSelector.ts',
      ),
    },
  },
  define: {
    // Library dist must not reference process.env at runtime (plain-ESM hosts
    // have no `process`). Ships the production branches of bundled deps.
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
      cssFileName: 'style',
    },
    rollupOptions: {
      // React is the only peer; everything else (headlessui, heroicons, lingui
      // runtime, shared board code) is bundled so a consumer needs no extra deps.
      external: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/client'],
    },
  },
})
