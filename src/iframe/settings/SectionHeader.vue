<script setup lang="ts">
// SectionHeader — the BOLD header of a settings group (a group of controls, or a
// master toggle that governs nested sub-settings).
//
// Weight is 700 (`font-bold`), matching the host's own section labels — MEASURED
// on the live presenter at 14px / 700 (ui-standard.json → hostLabelReference).
// Use SectionHeader when the row HEADS a group; use SettingRow for a single
// standalone control (400 weight). A right-aligned action (a master Switch, a
// count badge, a link) goes in the `action` slot with an automatic gap.
import { SETTINGS_LABEL_CLASS } from '@/iframe/uiStandard'
import HelpTooltip from './HelpTooltip.vue'

defineProps<{
  /** The header text. A noun phrase, sentence case, no terminal punctuation. */
  label: string
  /** Optional (?) tooltip constraint/caveat shown right after the label. */
  help?: string
}>()
</script>

<template>
  <div :class="SETTINGS_LABEL_CLASS" class="aha-section-hd">
    <span>{{ label }}</span>
    <HelpTooltip v-if="help" :text="help" />
    <!-- Right-aligned action, auto gap in the middle. -->
    <span v-if="$slots.action" class="aha-section-action">
      <slot name="action" />
    </span>
  </div>
</template>

<style scoped>
/* SETTINGS_LABEL_CLASS already supplies flex + items-center + gap + weight + ink.
   This only pushes the action slot to the right edge. */
.aha-section-action {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
