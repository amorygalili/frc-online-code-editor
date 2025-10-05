import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import vsixPlugin from "@codingame/monaco-vscode-rollup-vsix-plugin";
import importMetaUrlPlugin from "@codingame/esbuild-import-meta-url-plugin";
import dts from "vite-plugin-dts";

// https://vitejs.dev/config/
// Library-only configuration for building the npm package
export default defineConfig({
  plugins: [
    vsixPlugin(),
    react(),
    dts({
      include: ['lib/index.tsx'],
      exclude: ['src/**/*', '**/*.test.*', '**/*.spec.*'],
      rollupTypes: true,
      entryRoot: 'lib',
      outDir: 'dist-lib',
      insertTypesEntry: true
    })
  ],
  build: {
    lib: {
      entry: resolve('lib/index.tsx'),
      name: 'FrcChallengeSite',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`
    },
    outDir: 'dist-lib',
    rollupOptions: {
      // Externalize deps that shouldn't be bundled into the library
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime'
      ],
      output: {
        globals: {
          'react': 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'jsxRuntime'
        }
      }
    },
    sourcemap: true,
    target: 'esnext'
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
  },
});