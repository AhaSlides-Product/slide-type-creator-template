<script setup lang="ts">
// Editor Settings surface — the Content-tab panel for this slide type.
// Build the editor options here following the `aha-design-settings` skill
// (from the aha-design-public plugin): Ant Design Vue rows, toggle vs checkbox,
// help via ? tooltips, spacing-based grouping.
import { useXProps } from '@/composables/useXProps'
const xprops = useXProps()
</script>

<template>
  <div class="settings-page" data-testid="settings-root">
    <h1>Settings</h1>
    <p>Build the editor options here (Ant Design Vue rows).</p>
    <pre style="font-size:12px">{{ Object.keys(xprops) }}</pre>
  </div>
</template>
