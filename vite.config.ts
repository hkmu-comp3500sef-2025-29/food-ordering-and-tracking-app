import { defineConfig } from "vite";
import { VitePluginNode } from "vite-plugin-node";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
    plugins: [
        tsconfigPaths(),
        ...VitePluginNode({
            appPath: "./src/index.ts",
            adapter: "express",
            reloadAppOnFileChange: true,
            exportName: "app",
            outputFormat: "cjs",
        }),
    ],
    server: {
        // development server port
        port: 4001,
    },
});
