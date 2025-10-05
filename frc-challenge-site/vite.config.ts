import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import vsixPlugin from "@codingame/monaco-vscode-rollup-vsix-plugin";
import importMetaUrlPlugin from "@codingame/esbuild-import-meta-url-plugin";


// https://vitejs.dev/config/
// Unified configuration that builds both library and app
export default defineConfig({
  plugins: [
    vsixPlugin(),
    react(),
// DTS plugin removed - only needed for library builds
  ],
  build: {
    rollupOptions: {
      input: {
        // App entries
        main: resolve("index.html"),
        test: resolve("test.html")
      },
      output: {
        format: 'es',
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      },
      maxParallelFileOps: 5
    },
    sourcemap: true,
    target: 'esnext'
  },
  worker: {
    format: 'es',
  },
  define: {
    global: "globalThis",
    // AWS SDK compatibility
    "process.env": {},
  },
  resolve: {
    alias: {
      vscode: "@codingame/monaco-vscode-extension-api",
      "@codingame/monaco-vscode-api/vscode/vs/base/browser/cssValue": resolve("node_modules/@codingame/monaco-vscode-api/vscode/src/vs/base/browser/cssValue.js"),
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
      "@codingame/monaco-vscode-textmate-service-override",
      "@codingame/monaco-vscode-base-service-override",
      "@codingame/monaco-vscode-files-service-override",
      "@codingame/monaco-vscode-keybindings-service-override",
      "vscode-textmate",
      "@codingame/monaco-vscode-java-default-extension",
      "vscode-oniguruma",
      // DOM utilities
      "dompurify",
      // MessagePack
      "@msgpack/msgpack",
      // AWS SDK dependencies
      "aws-amplify",
      "@aws-amplify/auth",
      "@aws-amplify/ui-react",
      "@aws-crypto/sha256-js",
      "@aws-crypto/sha256-browser",
      "@aws-crypto/crc32",
      "@aws-crypto/util",
      "@aws-crypto/supports-web-crypto",
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
  assetsInclude: ["**/*.java"],
});
