/// <reference types="vitest" />
import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

export default defineConfig({
  plugins: [preact()],
  server: { fs: { allow: [".."] } },
  build: {
    rollupOptions: {
      output: { manualChunks: (id) => (id.includes("@breeztech") ? "breez" : undefined) },
    },
  },
  test: { environment: "jsdom", globals: false },
});
