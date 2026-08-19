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
  // HTTPS is needed when the plugin is loaded as an iframe by an HTTPS host (the
  // presenter/audience apps) — an http://localhost iframe is mixed-content-blocked.
  // Opt in with `HTTPS=true` (npm run dev:https). Self-signed via basic-ssl:
  // accept the cert once at https://localhost:5173 (or use a CORS/security-off
  // Chrome). For a zero-warning cert, generate one with mkcert instead.
  const useHttps = env.HTTPS === 'true'
  return {
    base: env.VITE_BASE_PATH || '/',
    plugins: [vue(), tailwindcss(), ahaViteIconPlugin, ...(useHttps ? [basicSsl()] : [])],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: 'localhost',
      port: Number(env.PORT) || 5173,
      strictPort: false,
      proxy: {
        '/api': { target: env.VITE_API_BASE || DEV_API_TARGET, changeOrigin: true, secure: true },
      },
    },
  }
})
