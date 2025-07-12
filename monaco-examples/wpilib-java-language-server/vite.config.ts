import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import vsixPlugin from "@codingame/monaco-vscode-rollup-vsix-plugin";
import importMetaUrlPlugin from "@codingame/esbuild-import-meta-url-plugin";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vsixPlugin(), react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve("index.html"),
        test: resolve("test.html"),
      },
      // Increase max parallel file operations
      maxParallelFileOps: 5,
      output: {
        format: 'es',
      },
    },
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

      // "@codingame/monaco-vscode-api",
      // "@codingame/monaco-vscode-environment-service-override",
      // "@codingame/monaco-vscode-explorer-service-override",
      // "@codingame/monaco-vscode-extension-api",
      // "@codingame/monaco-vscode-files-service-override",
      // "@codingame/monaco-vscode-java-default-extension",
      // "@codingame/monaco-vscode-keybindings-service-override",
      // "@codingame/monaco-vscode-lifecycle-service-override",
      // "@codingame/monaco-vscode-localization-service-override",
      // "@codingame/monaco-vscode-outline-service-override",
      // "@codingame/monaco-vscode-remote-agent-service-override",
      // "@codingame/monaco-vscode-search-result-default-extension",
      // "@codingame/monaco-vscode-search-service-override",
      // "@codingame/monaco-vscode-secret-storage-service-override",
      // "@codingame/monaco-vscode-storage-service-override",
      // "@codingame/monaco-vscode-textmate-service-override",
      // "@codingame/monaco-vscode-typescript-basics-default-extension",
      // "@codingame/monaco-vscode-typescript-language-features-default-extension",
      // "@codingame/monaco-vscode-view-banner-service-override",
      // "@codingame/monaco-vscode-view-status-bar-service-override",
      // "@codingame/monaco-vscode-view-title-bar-service-override",
      // "monaco-editor-wrapper",
      // "monaco-languageclient",
      // "@typefox/monaco-editor-react",
      // "vscode-textmate",
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
