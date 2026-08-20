import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
// Real package name — @aha/* resolves directly from node_modules (installed from
// the aha-slide-plugin GitHub Release tarballs), so no alias is needed for it.
import { ahaViteIconPlugin } from '@aha/ui/vite.config.icon'

// DEV backend for the `/api/*` proxy — the shared slide-type-creator endpoints.
const DEV_API_TARGET = 'https://aha-slide-types-creator.pages.dev'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // HTTPS is the DEFAULT: the plugin loads as an iframe inside HTTPS hosts (the
  // presenter/audience apps), and an http://localhost iframe is mixed-content-
  // blocked. Opt out with `HTTPS=false` (npm run dev:http).
  const useHttps = env.HTTPS !== 'false'

  // The REQUIRED standard is a locally-TRUSTED cert (mkcert) — run
  // `npm run setup:https` to generate `certs/localhost.pem` + `certs/localhost-key.pem`.
  // A trusted cert is what makes the host's cross-origin background
  // `fetch(https://localhost:5173/manifest.json)` succeed; with an UNtrusted cert
  // the browser silently rejects that fetch and it surfaces to a new dev as a
  // "CORS"/network error they can't click through. basic-ssl's self-signed cert is
  // only the FALLBACK for a quick look (accept it once at https://localhost:5173),
  // not for testing inside the real presenter/audience host.
  const certPath = fileURLToPath(new URL('./certs/localhost.pem', import.meta.url))
  const keyPath = fileURLToPath(new URL('./certs/localhost-key.pem', import.meta.url))
  const hasTrustedCert = useHttps && existsSync(certPath) && existsSync(keyPath)

  return {
    base: env.VITE_BASE_PATH || '/',
    plugins: [
      vue(),
      tailwindcss(),
      ahaViteIconPlugin,
      // Only fall back to a self-signed cert when no trusted mkcert cert is present.
      ...(useHttps && !hasTrustedCert ? [basicSsl()] : []),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: 'localhost',
      port: Number(env.PORT) || 5173,
      strictPort: false,
      // Trusted mkcert cert wins; otherwise basic-ssl (above) provides HTTPS.
      ...(hasTrustedCert
        ? { https: { key: readFileSync(keyPath), cert: readFileSync(certPath) } }
        : {}),
      // The presenter/audience apps (another origin) fetch this dev server's
      // manifest.json + load its surfaces in an iframe, so reflect the requesting
      // origin on every response. Dev-only; a local dev server serving a plugin.
      cors: { origin: true, credentials: true },
      proxy: {
        '/api': { target: env.VITE_API_BASE || DEV_API_TARGET, changeOrigin: true, secure: true },
      },
    },
  }
})
