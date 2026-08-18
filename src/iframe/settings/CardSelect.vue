<script setup lang="ts">
// CardSelect — single-select as a grid of icon + label cards. Use it when each
// choice benefits from an ICON (chart type, layout, a visual mode) — the one
// selection shape Ant has no built-in for, so it is a real component rather than a
// pass-through. For plain text choices use RadioGroup (2–4) or Select (5+).
//
// Ported from budget-allocation-v2's "results chart" picker so every slide type
// draws this the same way. Lives in the settings panel, whose ink is a fixed brand
// token, so the selected card uses a subtle brand tint — the same affordance the
// source slide ships.
import type { Component } from 'vue'

const value = defineModel<string>({ default: '' })

withDefaults(
  defineProps<{
    options: ReadonlyArray<{ value: string; label: string; icon?: Component }>
    /** Grid columns. */
    columns?: number
    disabled?: boolean
  }>(),
  { columns: 3, disabled: false },
)

function pick(v: string) {
  value.value = v
}
</script>

<template>
  <div
    class="aha-cardselect"
    role="radiogroup"
    :style="{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }"
  >
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      role="radio"
      :aria-checked="value === opt.value"
      :disabled="disabled"
      class="aha-card"
      :class="{ 'is-active': value === opt.value }"
      @click="pick(opt.value)"
    >
      <component :is="opt.icon" v-if="opt.icon" class="aha-card-icon" />
      <span class="aha-card-label">{{ opt.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.aha-cardselect {
  display: grid;
  gap: 8px;
}
.aha-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px;
  border: 1px solid #e3e3e3; /* colorBorder */
  border-radius: 8px;
  background: #fff;
  color: #1a1a1a;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease, background-color 0.15s ease;
}
.aha-card:hover:not(:disabled):not(.is-active) {
  color: #6a1ebb; /* colorPrimary */
}
.aha-card.is-active {
  border-color: #6a1ebb;
  color: #6a1ebb;
  background: rgba(106, 30, 187, 0.05); /* aha-purple/5 selection tint (settings ink is fixed brand) */
}
.aha-card:disabled {
  color: #b5b5b5;
  background: #f5f5f5;
  cursor: not-allowed;
}
.aha-card-icon {
  font-size: 20px;
}
.aha-card-label {
  font-size: 13px;
  line-height: 1.2;
  text-align: center;
}
</style>
