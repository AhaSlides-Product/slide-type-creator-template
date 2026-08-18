import { unref, computed, type Ref } from 'vue'
import { useSync } from '@aha/ui'

/**
 * Shared slide image URL, synced across the canvas / settings / audience surfaces
 * within the same browser via a BroadcastChannel keyed by slideId.
 */
export function useSlideImage(slideId: number | string | Ref<number | string | undefined>) {
  const channel = computed(() => {
    const id = unref(slideId)
    return id ? `slide-image-${id}` : ''
  })

  const imageUrl = useSync(channel, '')

  return { imageUrl }
}
