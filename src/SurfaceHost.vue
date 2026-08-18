<script setup lang="ts">
// Dispatches a host surface (Canvas / Settings / Audience) to the component of the
// slide type named in the route `:type` param. Each slide type lives in
// `src/slide-types/<type>/{Canvas,Settings,Audience}.vue`; adding a new folder makes
// a new slide type — no router edit needed. Unknown types fall back to `demo`.
import { computed, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'

const props = defineProps<{ role: 'Canvas' | 'Settings' | 'Audience' }>()
const route = useRoute()

// Build-time glob: every slide-type surface is bundled (code-split) and resolved by key.
const modules = import.meta.glob('./slide-types/*/*.vue')

const resolved = computed(() => {
  const type = String(route.params.type ?? 'demo')
  const key = `./slide-types/${type}/${props.role}.vue`
  const fallback = `./slide-types/demo/${props.role}.vue`
  const loader = modules[key] ?? modules[fallback]
  return { type, component: defineAsyncComponent(loader as any) }
})
</script>

<template>
  <component :is="resolved.component" :key="resolved.type + role" />
</template>
