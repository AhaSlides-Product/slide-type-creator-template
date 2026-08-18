import { ref, onMounted, onUnmounted, readonly } from 'vue'

/**
 * Host-driven keep-alive preload flag (host setting `enablePreloadIframe`).
 *
 * The host preloads the next slide's iframe with `active: false` so bundles
 * download/parse ahead of time while this flag stays false — the real slide
 * component must NOT render or consume data yet. When the slide becomes active
 * the host flips it to true via zoid `updateProps` (no reload), and the component
 * renders instantly with full data. When the host never passes `active`
 * (undefined) the slide is treated as active, as before.
 */
export function usePreloadActive() {
  const xprops = (window as any).xprops
  const isActive = ref(xprops?.active !== false)
  let handle: { cancel?: () => void } | undefined

  onMounted(() => {
    if (xprops && typeof xprops.onProps === 'function') {
      handle = xprops.onProps((newProps: any) => {
        if (newProps && newProps.active !== undefined) {
          isActive.value = newProps.active !== false
        }
      })
    }
  })

  onUnmounted(() => handle?.cancel?.())

  return { isActive: readonly(isActive) }
}
