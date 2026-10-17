import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";


// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],
  resolve: {
    alias: {
      "@": "/src",
      "@components": "/src/components",
      "@app": "/src/app",
    }
  },
  // Tailwind v4 emits modern CSS (oklch colors, etc.) that only Chromium 111+
  // understands. Older WebView2 runtimes on Windows drop those colors entirely,
  // so let Lightning CSS add hex/rgb fallbacks for older engines.
  css: {
    lightningcss: {
      targets: { chrome: 87 << 16, edge: 87 << 16, safari: 14 << 16 },
    },
  },
  build: {
    cssMinify: "lightningcss",
    rollupOptions: {
      input: {
        main: "index.html",
        print: "print.html",
      }
    }
  },
  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
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
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
