<script setup lang="ts">
// SettingRow — ONE standalone control with its label.
//
// Label weight is 400 (normal) — MEASURED: a single-row host setting label is
// 14px / 400, lighter than a section header (700, use SectionHeader for that).
// The convention this encodes: a lone control is a SettingRow (never bold); group
// several loose controls under a bold SectionHeader instead of leaving a mix of
// bold and normal rows.
//
// Two layouts:
//   inline (default) — label left, control right on the same line (toggles, short
//                      selects, number inputs). Matches SETTINGS_TOGGLE_ROW_CLASS.
//   stack            — label on top, control full-width below (textarea, a wide
//                      select, anything that needs the whole row).
import { SETTINGS_HELP_CLASS } from '@/iframe/uiStandard'
import HelpTooltip from './HelpTooltip.vue'

withDefaults(
  defineProps<{
    /** Control label — a noun phrase, sentence case, no terminal punctuation. */
    label: string
    /** Optional (?) tooltip: a constraint or caveat, ~2 lines max. */
    help?: string
    /** Optional muted help line under the label. Explains WHY; never restates the label. */
    description?: string
    /** 'inline' = label left / control right; 'stack' = control full-width below. */
    layout?: 'inline' | 'stack'
  }>(),
  { layout: 'inline' },
)
</script>

<template>
  <div :class="layout === 'inline' ? 'aha-row-inline' : 'aha-row-stack'">
    <div class="aha-row-main">
      <div class="aha-row-label flex items-center gap-1 text-sm font-normal text-aha-panel-ink">
        <span>{{ label }}</span>
        <HelpTooltip v-if="help" :text="help" />
      </div>
      <div v-if="description" :class="SETTINGS_HELP_CLASS" class="aha-row-desc">{{ description }}</div>
    </div>
    <div :class="layout === 'inline' ? 'aha-row-control-inline' : 'aha-row-control-stack'">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.aha-row-inline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.aha-row-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.aha-row-main {
  min-width: 0;
}
.aha-row-inline .aha-row-main {
  flex: 1;
}
/* Label weight/ink/size come from the Tailwind utilities in the template
   (text-sm font-normal text-aha-panel-ink) — SettingRow is deliberately NOT bold. */
/* Kill the help line's own bottom margin when it sits inside the stacked label. */
.aha-row-desc {
  margin-bottom: 0;
  margin-top: 2px;
}
.aha-row-control-inline {
  flex: 0 0 auto;
}
.aha-row-control-stack {
  width: 100%;
}
</style>
