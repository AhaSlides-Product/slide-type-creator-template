<script setup lang="ts">
// CountedInput — a single-line text field with a focus-only character counter.
//
// WHY THIS EXISTS (AHAM-463): a focus-only counter must NEVER be built by
// reactively toggling AntD's built-in `:show-count` on @focus. Doing so rebuilds
// the AntD Input's internal DOM on every focus/blur, which drops the caret and
// makes the field feel unclickable/unfocusable in the real host editor. The
// correct pattern — the one OptionRow already uses for its option textarea — is:
// the counter is ALWAYS in the DOM as a sibling element, hidden at rest with CSS
// and revealed with the container's `:focus-within`. The input's structure never
// changes on focus, so the caret is never lost.
//
// This is the shared home for that pattern for a BARE single field (OptionRow
// owns it for option lists). Compose it inside a SettingRow, which supplies the
// label — CountedInput is just the control.
//
// Production-portable: pure Vue + Ant, no cross-slide-type imports — same rule as
// the rest of @/iframe/settings.
import { Input } from 'ant-design-vue'

// inheritAttrs off so data-testid / aria-* / etc. flow to the inner <Input> (and
// on to its native <input>), not the wrapper — keeping the field itself the test/
// a11y target exactly as a plain <Input> would.
defineOptions({ inheritAttrs: false })

const value = defineModel<string>({ default: '' })

withDefaults(
  defineProps<{
    placeholder?: string
    /** Hard character cap; also the number the counter counts down from. */
    maxLength?: number
  }>(),
  { placeholder: '', maxLength: 100 },
)
</script>

<template>
  <div class="aha-counted">
    <Input
      v-model:value="value"
      v-bind="$attrs"
      :placeholder="placeholder"
      :maxlength="maxLength"
    />
    <!-- Always rendered; hidden at rest, revealed on :focus-within. The input's
         DOM is untouched on focus, so the caret is never dropped. -->
    <span class="aha-counted-count" aria-hidden="true">{{ maxLength - (value?.length ?? 0) }}</span>
  </div>
</template>

<style scoped>
.aha-counted {
  position: relative;
}
/* Reserve the counter's gutter at all times so text never reflows when the
   counter fades in on focus. */
.aha-counted :deep(.ant-input) {
  padding-right: 40px;
}
.aha-counted-count {
  position: absolute;
  top: 50%;
  right: 12px;
  transform: translateY(-50%);
  font-size: 12px;
  color: #6b6b6b; /* muted ink — matches OptionRow's counter */
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.18s ease;
}
.aha-counted:focus-within .aha-counted-count {
  opacity: 1;
}
</style>
