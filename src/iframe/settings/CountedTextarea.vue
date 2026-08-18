<script setup lang="ts">
// CountedTextarea — a multi-line text field with a focus-only character counter.
//
// The multi-line sibling of CountedInput. Same rule (AHAM-463): NEVER build the
// counter by reactively toggling AntD's built-in `:show-count` on @focus — that
// rebuilds the Textarea's internal DOM on every focus/blur and drops the caret.
// The counter is ALWAYS in the DOM, hidden at rest and revealed with the
// container's `:focus-within`, so the textarea's structure never changes on focus.
//
// Production-portable: pure Vue + Ant, no cross-slide-type imports.
import { Textarea } from 'ant-design-vue'

// inheritAttrs off so data-testid / aria-* flow to the inner <Textarea>.
defineOptions({ inheritAttrs: false })

const value = defineModel<string>({ default: '' })

withDefaults(
  defineProps<{
    placeholder?: string
    /** Hard character cap; also the number the counter counts down from. */
    maxLength?: number
    /** Rows shown at rest; the field auto-grows up to `maxRows`. */
    minRows?: number
    maxRows?: number
  }>(),
  { placeholder: '', maxLength: 150, minRows: 2, maxRows: 5 },
)
</script>

<template>
  <div class="aha-counted-ta">
    <Textarea
      v-model:value="value"
      v-bind="$attrs"
      :placeholder="placeholder"
      :maxlength="maxLength"
      :auto-size="{ minRows, maxRows }"
    />
    <!-- Always rendered; hidden at rest, revealed on :focus-within. The textarea's
         DOM is untouched on focus, so the caret is never dropped. -->
    <span class="aha-counted-ta-count" aria-hidden="true">{{ maxLength - (value?.length ?? 0) }}</span>
  </div>
</template>

<style scoped>
.aha-counted-ta {
  position: relative;
}
/* Reserve the counter's gutter in the bottom-right so text never reflows when the
   counter fades in on focus. */
.aha-counted-ta :deep(.ant-input) {
  padding-bottom: 22px;
}
.aha-counted-ta-count {
  position: absolute;
  bottom: 8px;
  right: 12px;
  font-size: 12px;
  color: #6b6b6b; /* muted ink — matches CountedInput / OptionRow */
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.18s ease;
}
.aha-counted-ta:focus-within .aha-counted-ta-count {
  opacity: 1;
}
</style>
