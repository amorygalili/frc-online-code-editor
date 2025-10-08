import { defineConfig } from "vite";
import { resolve } from "path";
import dts from "vite-plugin-dts";

// https://vitejs.dev/config/
// Configuration for building the Vite plugin
export default defineConfig({
  plugins: [
    dts({
      include: ["lib/vite-plugin-frc-challenge-api.ts"],
      exclude: ["**/*.test.*", "**/*.spec.*"],
      rollupTypes: true,
      entryRoot: "lib",
      outDir: "dist-vite-plugin",
      insertTypesEntry: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve("lib/vite-plugin-frc-challenge-api.ts"),
      name: "FrcChallengeApiPlugin",
      formats: ["es"],
      fileName: `vite-plugin-frc-challenge-api.js`,
    },
    rollupOptions: {
      // Externalize Node.js modules for the plugin
      external: ["vite", "fs", "path"],
      // output: {
      //   exports: 'named',
      //   preserveModules: false,
      //   globals: {
      //     'vite': 'vite',
      //     'fs': 'fs',
      //     'path': 'path'
      //   }
      // }
    },
    outDir: "dist-vite-plugin",
    sourcemap: true,
    target: "node14",
    // minify: false
  },
  define: {
    global: "globalThis",
    // AWS SDK compatibility for window-api
    "process.env": {},
  },
  // resolve: {
  //   alias: {
  //     vscode: "@codingame/monaco-vscode-extension-api",
  //     "@codingame/monaco-vscode-api/vscode/vs/base/browser/cssValue": resolve("node_modules/@codingame/monaco-vscode-api/vscode/src/vs/base/browser/cssValue.js"),
  //   },
  // }
});
