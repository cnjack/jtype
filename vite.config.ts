import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import { lingui, linguiTransformerBabelPreset } from "@lingui/vite-plugin";
import path from "path";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;
// @ts-expect-error process is a nodejs global
const devPort = Number(process.env.VITE_DEV_PORT ?? 1420);
// @ts-expect-error process is a nodejs global
const appVersion = process.env.VITE_JTYPE_VERSION ?? process.env.JTYPE_VERSION ?? process.env.npm_package_version ?? "0.1.0";
// @ts-expect-error process is a nodejs global
const packageVersion = process.env.npm_package_version ?? "0.1.0";

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [
    tailwindcss(),
    // @vitejs/plugin-react v6 (Vite 8 / Rolldown) transforms with oxc and no
    // longer accepts a `babel` option, so the Lingui macro must run as its own
    // Rolldown-babel pass — otherwise `@lingui/*/macro` imports leak into the
    // bundle and throw "executed outside the context of compilation" at runtime.
    react(),
    lingui(),
    babel({ presets: [linguiTransformerBabelPreset()] }),
  ],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'shared'),
    },
  },
  define: {
    __JTYPE_VERSION__: JSON.stringify(appVersion),
    __JTYPE_PACKAGE_VERSION__: JSON.stringify(packageVersion),
    // @excalidraw/excalidraw reads process.env.IS_PREACT at runtime; without
    // this define it throws "process is not defined" in the browser.
    "process.env.IS_PREACT": JSON.stringify("false"),
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: devPort,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
