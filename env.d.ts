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

// @aha/design ships as untyped JS (design-system tokens). We only read a handful
// of semantic colour constants (colorSuccess / colorError / …), so a loose shape
// is enough.
declare module '@aha/design' {
  export const SeedTokens: Record<string, string>
  export const MapTokens: Record<string, string>
  export const AliasTokens: Record<string, string>
  export const CustomColors: Record<string, any>
  export const antDesignTokens: Record<string, string>
  const _default: Record<string, string>
  export default _default
}
