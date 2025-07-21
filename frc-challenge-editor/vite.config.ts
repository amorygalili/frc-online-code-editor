import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), dts({ include: ["src"] })],
  build: {
    lib: {
      entry: "src/index.ts",
      name: "FRCChallengeEditor",
      formats: ["es"],
      fileName: () => "index.js",
    },
    rollupOptions: {
      external: (id) => {
        // Always externalize React
        if (id === "react" || id === "react-dom") return true;

        // Externalize all @codingame packages
        if (id.indexOf("@codingame/") === 0) return true;

        // Externalize all monaco packages
        if (id.indexOf("monaco-") === 0) return true;
        if (id.indexOf("monaco") !== -1) return true;

        // Externalize specific packages
        if (id.indexOf("@typefox/monaco-editor-react") === 0) return true;
        if (id.indexOf("vscode-") === 0) return true;

        return false;
      },
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
        // manualChunks: (id) => {
        //   // All @codingame packages go into the same chunk
        //   if (id.includes('node_modules/@codingame/')) {
        //     return 'codingame'
        //   }

        //   // Optionally split other vendors
        //   if (id.includes('node_modules/')) {
        //     return 'vendor'
        //   }
        // }
      },
    },
  },
  worker: {
    format: "es",
  },
  define: {
    global: "globalThis",
    "process.env": {},
  },

});
