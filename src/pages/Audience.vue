<script setup lang="ts">
// Audience surface — what a participant sees/interacts with on their device.
// When the @aha/* SDK is wired in, submissions go through ApiClient.sendLiveSubmission
// (see the sample-slide template). Design the participant UI per `aha-design-audience`.
import { useXProps } from '@/composables/useXProps'
const xprops = useXProps()
</script>

<template>
  <div class="audience-page" data-testid="audience-root">
    <h1>Audience</h1>
    <p>Render the participant UI here.</p>
    <p style="font-size:12px">joined as: {{ xprops.participant?.name ?? 'guest' }}</p>
  </div>
</template>
