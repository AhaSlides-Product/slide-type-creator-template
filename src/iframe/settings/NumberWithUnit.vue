<script setup lang="ts">
// NumberWithUnit — a number field with a trailing UNIT written in full
// ("seconds", "points"), a hover-revealed ▲/▼ stepper, an optional error line,
// and an optional quick-preset select. Use it for durations and other
// numbers-with-a-unit, in place of a Segmented (which is for 2–4 short modes,
// not numbers).
//
// The number is a native digit input (not Ant InputNumber) so the value can be
// HARD-CAPPED at `maxDigits` digits — a 5th keystroke or paste is ignored,
// which a type=number input cannot enforce (it ignores maxlength). The stepper,
// clamping and cap logic live in ./numberWithUnit.ts so they stay unit-testable.
// The field is a fixed 4-char width so it never jitters as digits change and
// the unit stays anchored after the stepper.
//
// Reuse-first: a slide type's standard COUNTDOWN is host-native — turn on
// `enableTimeLimit` and read `slideProps.timeToAnswer`. Use NumberWithUnit only
// for a duration the host does NOT provide (a per-item timer, a spin time, etc.).
import { computed, ref, watch } from 'vue'
import { Select, SelectOption } from 'ant-design-vue'
import { sanitizeDigits, stepValue, atMax, atMin, showError } from './numberWithUnit'

// The model is `number | undefined` — undefined = empty. onNum() normalises the
// sanitized digit string back to number | undefined.
const value = defineModel<number | undefined>({ default: undefined })

const props = withDefaults(
  defineProps<{
    /** Unit label shown after the number, written in full (e.g. "seconds"). */
    unit: string
    min?: number
    max?: number
    step?: number
    disabled?: boolean
    /** Error state — red border + red ring (ring only, no message). */
    invalid?: boolean
    /**
     * When set, renders a red alert line BELOW the field AND shows the red ring.
     * Use for a specific validation reason ("Maximum is 6000 seconds.").
     */
    errorMessage?: string
    /**
     * Hard cap on the number of digits. Default 4 — a 5th digit is rejected.
     * Exposed for reuse; the marketplace default stays 4.
     */
    maxDigits?: number
    /** Optional quick-set values; renders a compact select beside the field. */
    presets?: ReadonlyArray<{ value: number; label: string }>
    presetPlaceholder?: string
  }>(),
  { step: 1, disabled: false, invalid: false, maxDigits: 4, presetPlaceholder: 'Quick set' },
)

// The input is driven by a display string so the cap can be enforced in the DOM.
const display = ref(value.value === undefined ? '' : String(value.value))
watch(value, (v) => {
  const s = v === undefined ? '' : String(v)
  if (s !== display.value) display.value = s
})

function onNum(v: string) {
  if (v === '') {
    value.value = undefined
    return
  }
  const n = Number(v)
  value.value = Number.isFinite(n) ? n : undefined
}

function onInput(e: Event) {
  const el = e.target as HTMLInputElement
  const clean = sanitizeDigits(el.value, props.maxDigits)
  // Force the DOM back to the capped value so a rejected 5th digit never shows.
  if (el.value !== clean) el.value = clean
  display.value = clean
  onNum(clean)
}

function stepBy(delta: number) {
  if (props.disabled) return
  value.value = stepValue(value.value, delta, props.step, props.min, props.max)
}

// Keyboard ↑/↓ step the value — parity with the Ant InputNumber this replaced,
// reusing the same stepBy logic. No visual change; the approved ▲/▼ combo is the
// mouse affordance, this is its keyboard equivalent.
function onKeydown(e: KeyboardEvent) {
  if (props.disabled) return
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    stepBy(props.step)
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    stepBy(-props.step)
  }
}

const upDisabled = computed(() => atMax(value.value, props.min, props.max))
const downDisabled = computed(() => atMin(value.value, props.min))
const isError = computed(() => showError(props.invalid, props.errorMessage))

function applyPreset(v: number) {
  value.value = v
}
</script>

<template>
  <div class="aha-nwu">
    <div class="aha-nwu-line">
      <div class="aha-nwu-field" :class="{ 'is-error': isError, 'is-disabled': disabled }">
        <input
          class="aha-nwu-input"
          type="text"
          inputmode="numeric"
          :maxlength="maxDigits"
          :value="display"
          :disabled="disabled"
          placeholder="—"
          @input="onInput"
          @keydown="onKeydown"
        />
        <span class="aha-nwu-stepper" aria-hidden="false">
          <button
            type="button"
            class="aha-nwu-arrow"
            aria-label="Increase"
            tabindex="-1"
            :disabled="disabled || upDisabled"
            @click="stepBy(props.step)"
            @mousedown.prevent
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
          </button>
          <button
            type="button"
            class="aha-nwu-arrow"
            aria-label="Decrease"
            tabindex="-1"
            :disabled="disabled || downDisabled"
            @click="stepBy(-props.step)"
            @mousedown.prevent
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
        </span>
        <span class="aha-nwu-unit">{{ unit }}</span>
      </div>

      <Select
        v-if="presets && presets.length"
        class="aha-nwu-preset"
        :value="undefined"
        :placeholder="presetPlaceholder"
        :disabled="disabled"
        @update:value="(v: unknown) => applyPreset(Number(v))"
      >
        <SelectOption v-for="p in presets" :key="p.value" :value="p.value">{{ p.label }}</SelectOption>
      </Select>
    </div>

    <div v-if="errorMessage" class="aha-nwu-err">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" /><line x1="12" y1="7.5" x2="12" y2="13" /><line x1="12" y1="16.5" x2="12.01" y2="16.5" /></svg>
      <span>{{ errorMessage }}</span>
    </div>
  </div>
</template>

<style scoped>
.aha-nwu {
  display: inline-flex;
  flex-direction: column;
}
.aha-nwu-line {
  display: flex;
  align-items: center;
  gap: 8px;
}
/* Bordered shell = input family look, at an 8px corner. */
.aha-nwu-field {
  display: inline-flex;
  align-items: center;
  height: 40px;
  padding: 0 12px;
  border: 1px solid #d3d7e1; /* GAP4 aha-input resting border */
  border-radius: 8px;
  background: #fff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.aha-nwu-field:hover:not(.is-disabled) {
  border-color: #6a1ebb; /* colorPrimary */
}
.aha-nwu-field:focus-within:not(.is-disabled) {
  border-color: #6a1ebb;
  box-shadow: 0 0 0 2px #d3b4ff; /* purple-80 focus ring (GAP1) */
}
.aha-nwu-field.is-error {
  border-color: #f5222d; /* colorError */
  box-shadow: 0 0 0 2px #ffd6d3;
}
.aha-nwu-field.is-disabled {
  background: #f5f5f5;
  border-color: #e3e3e3;
  cursor: not-allowed;
  box-shadow: none;
}
/* Fixed 4-char width: never shrinks on short values, never jitters as digits
   change. The cap keeps content to 4 digits, so nothing overflows. */
.aha-nwu-input {
  width: 4ch;
  padding: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: #1a1a2e;
  font: inherit;
  font-size: 15px;
  font-weight: 400;
  font-variant-numeric: tabular-nums;
  text-align: left;
}
.aha-nwu-input::placeholder {
  color: #8a8a99;
}
.aha-nwu-input::-webkit-outer-spin-button,
.aha-nwu-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.aha-nwu-field.is-disabled .aha-nwu-input {
  color: #8a8a99;
}
/* ▲/▼ combo — tertiary borderless icon buttons, right after the number, hidden
   at rest with space reserved (no layout shift), revealed on hover/focus. */
.aha-nwu-stepper {
  display: flex;
  flex-direction: column;
  margin-left: 6px;
  visibility: hidden;
}
.aha-nwu-field:hover .aha-nwu-stepper,
.aha-nwu-field:focus-within .aha-nwu-stepper {
  visibility: visible;
}
.aha-nwu-field.is-disabled .aha-nwu-stepper {
  visibility: hidden;
}
.aha-nwu-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 15px;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: #5b5b6b;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
}
.aha-nwu-arrow:hover:not(:disabled) {
  background: color-mix(in srgb, #6a1ebb 12%, transparent);
  color: #6a1ebb;
}
.aha-nwu-arrow:disabled {
  color: #8a8a99;
  opacity: 0.4;
  cursor: not-allowed;
}
.aha-nwu-arrow svg {
  width: 11px;
  height: 11px;
}
/* Unit sits 4px after the ▲/▼ combo. */
.aha-nwu-unit {
  margin-left: 4px;
  color: #999999; /* colorTextPlaceholder — the unit is secondary to the number */
  font-size: 14px;
  white-space: nowrap;
}
.aha-nwu-field.is-disabled .aha-nwu-unit {
  color: #cfcfcf;
}
.aha-nwu-preset {
  min-width: 120px;
}
/* Error line below the field: alert-circle + reason, red, 12px. */
.aha-nwu-err {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 6px;
  color: #f5222d;
  font-size: 12px;
}
.aha-nwu-err svg {
  flex: 0 0 auto;
  width: 13px;
  height: 13px;
}
</style>
