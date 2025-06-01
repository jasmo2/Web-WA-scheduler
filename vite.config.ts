import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import { resolve } from "path"
import webExtension from "vite-plugin-web-extension"
import svgLoader from "vite-svg-loader"
import hotReload from "hot-reload-extension-vite";

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  plugins: [
    vue(),
    svgLoader(),
    webExtension({
      manifest: "src/manifest.json",
      browser: "chrome",
      watchFilePaths: [
        "src/background/index.ts",
        "src/components/**/*",
        "src/content/scheduler-button.js",
        "src/manifest.json",
      ],
    }),
    hotReload(),
  ],
  build: {
    sourcemap: "inline",
  },
})
