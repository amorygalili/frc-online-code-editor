import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import vsixPlugin from "@codingame/monaco-vscode-rollup-vsix-plugin";
import importMetaUrlPlugin from "@codingame/esbuild-import-meta-url-plugin";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vsixPlugin(), react()],
  define: {
    global: "globalThis",
  },
  resolve: {
    alias: {
      vscode: "@codingame/monaco-vscode-extension-api",
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      plugins: [importMetaUrlPlugin],
    },
    include: [
      "@codingame/monaco-vscode-api",
      "monaco-editor-wrapper",
      "monaco-languageclient",
      "@typefox/monaco-editor-react",
    ],
  },
  server: {
    cors: {
      origin: "*",
    },
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  },
});
