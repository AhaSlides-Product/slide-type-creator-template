<script setup lang="ts">
// Presenter Canvas surface — the slide as shown on the presenting stage.
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useXProps } from '@/composables/useXProps'

const route = useRoute()
const slideId = computed(() => route.params.slideId as string)
const xprops = useXProps()
</script>

<template>
  <div class="canvas-page" data-testid="canvas-root">
    <h1>Canvas</h1>
    <p>Slide: {{ slideId }} · lang: {{ xprops.presentation?.language ?? '—' }}</p>
    <!-- Render the presenter view of your slide type here. -->
  </div>
</template>
