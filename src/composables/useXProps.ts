import { reactive, onMounted } from 'vue'

/**
 * Reactive access to the host `window.xprops` that the AhaSlides host passes into
 * the plugin iframe (presentation, slide, language, participant, submissions
 * bridge, …). Present only when this app runs inside the real host.
 *
 * Token-free: this reads the raw host object and does not import the private
 * @aha/* SDK. When the SDK is wired in, prefer its typed `usePresenterPlugin()` /
 * `useAudiencePlugin()` hooks over this raw accessor.
 */
export function useXProps() {
  const xprops = reactive<Record<string, any>>((window as any).xprops || {})

  onMounted(() => {
    const host = (window as any).xprops
    if (host && typeof host.onProps === 'function') {
      host.onProps((newProps: Record<string, any>) => Object.assign(xprops, newProps))
    }
  })

  return xprops
}
