import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: { "@core": resolve(root, "../../packages/core/src") } },
  },
  preload: {
    // Emit a CommonJS preload that can run inside Electron's sandbox.
    build: {
      rollupOptions: {
        output: {
          format: "cjs",
          entryFileNames: "index.cjs",
        },
      },
    },
  },
  renderer: {
    root: resolve(root, "src/renderer"),
    resolve: { alias: { "@": resolve(root, "src/renderer/src") } },
    plugins: [react()],
  },
});
