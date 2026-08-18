<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { ahaSlidesDefaultTheme } from '@aha/ui'
import { usePreloadActive } from '@/composables/usePreload'

const route = useRoute()
const slideId = computed(() => {
  const id = route.params.slideId
  return Array.isArray(id) ? id[0] : id
})

// Keep-alive preload gate: while the host preloads this iframe (xprops.active
// === false) the bundles boot but the slide component is NOT rendered. When the
// host flips active to true the router-view mounts with data — no bundle reload.
const { isActive } = usePreloadActive()
</script>

<template>
  <a-config-provider :theme="ahaSlidesDefaultTheme">
    <main>
      <router-view v-if="isActive" :key="slideId" />
    </main>
  </a-config-provider>
</template>
