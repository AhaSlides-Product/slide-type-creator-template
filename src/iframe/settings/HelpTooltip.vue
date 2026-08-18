<script setup lang="ts">
// HelpTooltip — the trailing "(?)" info affordance on a settings label.
//
// It is a THIN composition, not a new primitive: Ant's `Tooltip` (so it inherits
// the themed dark bubble, the flip/shift positioning and the a11y wiring) plus the
// question-mark icon the host puts on every native settings label. The tooltip copy
// is capped to ~2 lines via the shared TOOLTIP_OVERLAY_STYLE — anything longer
// belongs in a help line under the label, which is the whole point of keeping the
// (?) constrained (see the help-text discipline in aha-design-settings).
import { Tooltip } from 'ant-design-vue'
import { QuestionCircleOutlined } from '@ant-design/icons-vue'
import { SETTINGS_LABEL_ICON_CLASS, TOOLTIP_ARROW, TOOLTIP_OVERLAY_STYLE } from '@/iframe/uiStandard'

withDefaults(
  defineProps<{
    /** The constraint or caveat to show. Keep it short — it is capped to ~2 lines. */
    text: string
    /** Tooltip placement; defaults to `bottomLeft`. */
    placement?: 'top' | 'topLeft' | 'topRight' | 'bottom' | 'bottomLeft' | 'bottomRight' | 'left' | 'right'
  }>(),
  // `bottomLeft`, NOT `top`: the panel is narrow (~300px) and the (?) icon sits near
  // the LEFT edge, so a top-centred bubble overflows left and Ant clamps it. `bottomLeft`
  // left-aligns the bubble under the icon and extends it rightward, keeping it inside the
  // panel. There is no caret (TOOLTIP_ARROW is `false` — see uiStandard.ts for why), so
  // placement only governs where the bubble opens, not where a caret points. (AHAM-458)
  { placement: 'bottomLeft' },
)
</script>

<template>
  <Tooltip
    :overlay-style="TOOLTIP_OVERLAY_STYLE"
    :title="text"
    :placement="placement"
    :arrow="TOOLTIP_ARROW"
  >
    <QuestionCircleOutlined
      :class="SETTINGS_LABEL_ICON_CLASS"
      class="aha-help-icon"
      role="button"
      tabindex="0"
      aria-label="More information"
    />
  </Tooltip>
</template>

<style scoped>
/* Only the interaction affordances Ant's icon doesn't carry: a pointer and a
   focus ring. Colour comes from SETTINGS_LABEL_ICON_CLASS (text-aha-panel-ink/50),
   the same token the reference uses for its label info icon. */
.aha-help-icon {
  cursor: pointer;
  outline: none;
}
.aha-help-icon:focus-visible {
  outline: 2px solid #6a1ebb;
  outline-offset: 2px;
  border-radius: 50%;
}
</style>
