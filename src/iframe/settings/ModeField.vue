<script setup lang="ts">
// ModeField — a labelled field whose INPUT changes with an inline mode switch.
// The label and a small exclusive control (Text | Image, List | Grid, …) share the
// top row; the body below renders the slot that matches the selected mode, and
// swaps in place when the mode changes. This is the "Front label: [Text|Image]"
// pattern — one field, one label, but the editor picks which kind of value it holds.
//
//   <ModeField v-model="mode" label="Front label"
//              :options="[{ value: 'text', label: 'Text' }, { value: 'image', label: 'Image' }]">
//     <template #text><CountedInput v-model="label" :max-length="60" /></template>
//     <template #image><ImageDropzone :image-url="img" @select="pickImage" /></template>
//   </ModeField>
//
// It COMPOSES: HelpTooltip for the (?) affordance and the documented mode-switch
// conventions. Its own value is the LAYOUT + the guardrail that ONLY the active
// body is rendered — so a hidden mode's control never persists a value the user
// can't see. Slot names MUST match the option `value`s.
//
// RADIO STYLE RULE — the button RadioGroup uses `button-style="outline"` ONLY
// (selected = purple border + purple text on a white fill). The solid variant
// (a filled purple pill) is NOT allowed for this control. The alternative is Ant
// `Segmented` (neutral grey), never a solid RadioGroup.
import type { Component } from 'vue'
import { computed } from 'vue'
import { RadioButton, RadioGroup, Segmented } from 'ant-design-vue'
import { SETTINGS_HELP_CLASS } from '@/iframe/uiStandard'
import HelpTooltip from './HelpTooltip.vue'

const value = defineModel<string>({ default: '' })

const props = withDefaults(
  defineProps<{
    /** Field label — a noun phrase, sentence case, no terminal punctuation. */
    label: string
    /** The exclusive modes. Each `value` must have a matching slot. */
    options: ReadonlyArray<{ value: string; label: string; icon?: Component }>
    /** Optional (?) tooltip on the label — a constraint/caveat, ~2 lines max. */
    help?: string
    /** Optional muted help line under the label. */
    description?: string
    /** 'radio' = outline RadioButton group (purple border/text when selected); 'segmented' = neutral Ant Segmented. */
    variant?: 'radio' | 'segmented'
    disabled?: boolean
  }>(),
  { variant: 'radio', disabled: false },
)

// Segmented takes plain { label, value } (no icon slot wiring here — use 'solid' for icons).
const segmentedOptions = computed(() => props.options.map((o) => ({ label: o.label, value: o.value })))
</script>

<template>
  <div>
    <div class="aha-mf-head">
      <div class="aha-mf-label flex items-center gap-1 text-sm font-normal text-aha-panel-ink">
        <span>{{ label }}</span>
        <HelpTooltip v-if="help" :text="help" />
      </div>

      <!-- outline radio buttons ONLY — selected shows purple border + text, no
           solid fill (see the RADIO STYLE RULE in the header). -->
      <RadioGroup
        v-if="variant === 'radio'"
        v-model:value="value"
        button-style="outline"
        :disabled="disabled"
      >
        <RadioButton v-for="opt in options" :key="opt.value" :value="opt.value">
          <component :is="opt.icon" v-if="opt.icon" class="aha-mf-opt-icon" />
          {{ opt.label }}
        </RadioButton>
      </RadioGroup>

      <!-- segmented = neutral Ant look (the documented alternative). -->
      <Segmented v-else v-model:value="value" :options="segmentedOptions" :disabled="disabled" />
    </div>

    <div v-if="description" :class="SETTINGS_HELP_CLASS" class="aha-mf-desc">{{ description }}</div>

    <!-- Only the active mode's body is rendered, so a hidden mode holds no live control. -->
    <div class="aha-mf-body">
      <slot :name="value" />
    </div>
  </div>
</template>

<style scoped>
.aha-mf-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.aha-mf-label {
  min-width: 0;
}
.aha-mf-opt-icon {
  margin-right: 4px;
}
.aha-mf-desc {
  margin-top: 2px;
  margin-bottom: 0;
}
.aha-mf-body {
  margin-top: 12px;
}
</style>
