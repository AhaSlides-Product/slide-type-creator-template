/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Default slide type used by the `/` → `/canvas/<type>` redirect in dev. */
  readonly VITE_AHA_DEFAULT_SLIDE?: string
  /** Deploy base path (e.g. '/my-plugin/'). Defaults to '/'. */
  readonly VITE_BASE_PATH?: string
  /** Absolute base for the shared `/api/*` backend (deferred; dev uses the proxy). */
  readonly VITE_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
