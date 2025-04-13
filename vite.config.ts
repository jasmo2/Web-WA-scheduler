import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import { resolve } from "path"
import webExtension from "vite-plugin-web-extension"

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  plugins: [
    vue(),
    webExtension({
      manifest: "src/manifest.json",
    }),
  ],
  build: {
    sourcemap: "inline",
  },
})
