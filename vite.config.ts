import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
// Real package name — @aha/* resolves directly from node_modules (installed from
// the aha-slide-plugin GitHub Release tarballs), so no alias is needed for it.
import { ahaViteIconPlugin } from '@aha/ui/vite.config.icon'

// DEV backend for the `/api/*` proxy — the shared slide-type-creator endpoints.
const DEV_API_TARGET = 'https://aha-slide-types-creator.pages.dev'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: env.VITE_BASE_PATH || '/',
    plugins: [vue(), tailwindcss(), ahaViteIconPlugin],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      proxy: {
        '/api': { target: env.VITE_API_BASE || DEV_API_TARGET, changeOrigin: true, secure: true },
      },
    },
  }
})
