import fs from "fs"
import path from "path"
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite"

function isRunningInDocker() {
  return fs.existsSync("/.dockerenv")
}

function resolveProxyTarget(target: string) {
  const url = new URL(target)

  if (url.hostname === "api-gateway" && !isRunningInDocker()) {
    url.hostname = "localhost"
  }

  return url.toString()
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const proxyTarget = resolveProxyTarget(
    process.env.VITE_PROXY_TARGET ?? env.VITE_PROXY_TARGET ?? "http://localhost:8080"
  )

  return {
    plugins: [react(), tailwindcss()],
    server: {
      allowedHosts: [
        "localhost",
        "127.0.0.1",
        "fawnixverse.acstechnologies.co.in",
        "54.76.187.129",
        "108.131.209.156",
      ],
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        jspdf: path.resolve(__dirname, "./node_modules/jspdf/dist/jspdf.es.min.js"),
      },
    },
  }
})
