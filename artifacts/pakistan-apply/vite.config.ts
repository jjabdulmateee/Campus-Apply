import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

/** Replit-only Vite plugins — skipped outside a Replit container. */
async function replitPlugins(): Promise<PluginOption[]> {
  if (process.env.REPL_ID === undefined) return [];

  const plugins: PluginOption[] = [];
  const runtimeErrorOverlay = (
    await import("@replit/vite-plugin-runtime-error-modal")
  ).default;
  plugins.push(runtimeErrorOverlay());

  if (process.env.NODE_ENV !== "production") {
    plugins.push(
      (
        await import("@replit/vite-plugin-cartographer")
      ).cartographer({
        root: path.resolve(import.meta.dirname, ".."),
      }),
      (await import("@replit/vite-plugin-dev-banner")).devBanner(),
    );
  }

  return plugins;
}

export default defineConfig(async () => ({
  base: basePath,
  envDir: path.resolve(import.meta.dirname, "..", ".."),
  plugins: [react(), tailwindcss(), ...(await replitPlugins())],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
    proxy: {
      "/api": {
        target:
          process.env.VITE_API_PROXY_TARGET ?? "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      "/api": {
        target:
          process.env.VITE_API_PROXY_TARGET ?? "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
}));
