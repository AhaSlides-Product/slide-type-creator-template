<script setup lang="ts">
// OptionRow — one repeatable option/answer row, ported from the Ranking slide's
// settings item so every slide type edits options the same way.
//
// Anatomy (left → right): drag handle · optional correct-answer toggle · borderless
// textarea with a hover char-counter · optional image control · floating delete
// that appears at the top-right corner on hover/focus.
//
// Toggle the parts per slide:
//   showImage    — the per-option image control (default off)
//   allowCorrect — the correct-answer toggle, for scored slides only (default off)
//   draggable    — show the drag handle (the parent owns the actual DnD)
//
// Image actions are emitted as INTENTS (addImage / changeImage / editImage /
// removeImage); the parent runs the host modals and flips `imageLoading`. Text,
// imageUrl and correct are v-models the parent owns.
import { Button, Textarea, Tooltip } from 'ant-design-vue'
import { CheckOutlined, DeleteOutlined, HolderOutlined } from '@ant-design/icons-vue'
import { TOOLTIP_ARROW } from '@/iframe/uiStandard'
import ImageActionButton from './ImageActionButton.vue'

const text = defineModel<string>('text', { default: '' })
const imageUrl = defineModel<string>('imageUrl', { default: '' })
const correct = defineModel<boolean>('correct', { default: false })

const props = withDefaults(
  defineProps<{
    index: number
    placeholder?: string
    maxLength?: number
    showImage?: boolean
    imageLoading?: boolean
    allowCorrect?: boolean
    canDelete?: boolean
    draggable?: boolean
    /** Optional deck-colour swatch shown at the row start (e.g. a poll option's palette colour). */
    swatchColor?: string
    correctLabel?: string
    deleteLabel?: string
  }>(),
  {
    placeholder: '',
    maxLength: 1000,
    showImage: false,
    imageLoading: false,
    allowCorrect: false,
    canDelete: true,
    draggable: true,
    correctLabel: 'Mark as correct answer',
    deleteLabel: 'Delete',
  },
)

const emit = defineEmits<{
  (e: 'delete'): void
  (e: 'addImage'): void
  (e: 'changeImage'): void
  (e: 'editImage'): void
  (e: 'removeImage'): void
}>()

function toggleCorrect() {
  correct.value = !correct.value
}
</script>

<template>
  <div class="aha-opt" :class="{ 'is-correct': allowCorrect && correct, 'no-handle': !draggable }">
    <!-- Drag handle (the parent wires the actual drag; this is the grip). -->
    <span v-if="draggable" class="aha-opt-drag" data-drag-handle aria-hidden="true">
      <HolderOutlined />
    </span>

    <div class="aha-opt-main">
      <!-- Deck-colour swatch (a MARK, so it may carry colour) — the option's palette colour. -->
      <span
        v-if="swatchColor"
        class="aha-opt-swatch"
        :style="{ backgroundColor: swatchColor }"
        aria-hidden="true"
      />

      <!-- Correct-answer toggle — per-row (several options can be correct). -->
      <Tooltip v-if="allowCorrect" :title="correctLabel" placement="bottomLeft" :arrow="TOOLTIP_ARROW">
        <button
          type="button"
          class="aha-opt-correct"
          :class="{ 'is-on': correct }"
          :aria-pressed="correct"
          :aria-label="correctLabel"
          @click="toggleCorrect"
        >
          <CheckOutlined />
        </button>
      </Tooltip>

      <Textarea
        v-model:value="text"
        class="aha-opt-ta"
        :placeholder="placeholder || `Option ${index + 1}`"
        :bordered="false"
        :auto-size="{ minRows: 1, maxRows: 4 }"
        :maxlength="maxLength"
      />

      <span class="aha-opt-count" aria-hidden="true">{{ maxLength - (text?.length ?? 0) }}</span>

      <ImageActionButton
        v-if="showImage"
        :image-url="imageUrl"
        :loading="imageLoading"
        @add="emit('addImage')"
        @change="emit('changeImage')"
        @edit="emit('editImage')"
        @remove="emit('removeImage')"
      />
    </div>

    <!-- Floating delete — appears on hover/focus at the top-right corner. -->
    <!-- The delete floats on the row's top-right corner, ~flush with the iframe's
         right edge. A top/topRight bubble there overflows the edge → Ant shifts it
         and (with pointAtCenter) the caret detaches + the bubble clips. `left` opens
         the bubble INTO the panel with the caret on its right pointing at the trash —
         no edge to clip against, no shift. -->
    <Tooltip :title="deleteLabel" placement="left" :arrow="TOOLTIP_ARROW">
      <Button
        v-if="canDelete"
        class="aha-opt-del"
        size="small"
        :aria-label="deleteLabel"
        @click="emit('delete')"
      >
        <template #icon><DeleteOutlined /></template>
      </Button>
    </Tooltip>
  </div>
</template>

<style scoped>
.aha-opt {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px; /* drag handle → content; the inner .aha-opt-main keeps its own 8px */
  min-height: 44px; /* fixed row height — an enabled image button (36px) must not grow it */
  box-sizing: border-box;
  padding: 0 4px; /* no vertical padding: min-height + centring hold 44px in every state */
  background: #fff;
  border: 1.5px solid #e3e3e3; /* colorBorder — the secondary-button border, one notch thicker */
  border-radius: 8px;
  transition: border-color 0.18s ease, background-color 0.18s ease;
}
/* When the drag handle is hidden, keep the first element off the left edge (~16px). */
.aha-opt.no-handle {
  padding-left: 16px;
}
.aha-opt:hover,
.aha-opt:focus-within {
  border-color: #6a1ebb; /* colorPrimary */
}
.aha-opt:focus-within {
  box-shadow: 0 0 0 2px #d3b4ff; /* purple-80 ring — matches the input family */
}
/* Correct → the whole card turns semantic-success green. */
.aha-opt.is-correct,
.aha-opt.is-correct:hover {
  border-color: #16c49a; /* brand success */
  background: rgba(22, 196, 154, 0.08);
}
.aha-opt-drag {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  color: #1a1a1a;
  cursor: grab;
  transition: background-color 0.18s ease;
}
.aha-opt-drag:hover {
  background: #f3ecfc; /* faint purple */
}
.aha-opt-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}
.aha-opt-swatch {
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  border-radius: 50%;
}
/* Correct toggle — 20px outline circle; fills success-green with a white tick when on. */
.aha-opt-correct {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1.5px solid #d4d4d8;
  background: transparent;
  color: transparent;
  font-size: 11px;
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease;
}
.aha-opt-correct:hover {
  border-color: #16c49a;
  color: rgba(22, 196, 154, 0.5);
}
.aha-opt-correct.is-on {
  background: #16c49a;
  border-color: #16c49a;
  color: #fff;
}
.aha-opt-correct:focus-visible {
  outline: 2px solid #6a1ebb;
  outline-offset: 2px;
}
.aha-opt-ta {
  flex: 1;
  min-width: 0;
  padding: 0;
}
/* The ROW owns the focus affordance (.aha-opt:focus-within → border + ring).
   The inner borderless textarea must stay flat, but the global storybook-overrides
   input rules re-colour it on hover/focus anyway (GAP 3 border #d3b4ff, GAP 1 ring),
   which renders a SECOND focus box inside the row. Suppress them so focus shows
   exactly one frame — the row's. */
.aha-opt-ta:hover,
.aha-opt-ta:focus,
.aha-opt-ta:focus-visible {
  border-color: transparent !important;
  box-shadow: none !important;
}
.aha-opt-count {
  flex: 0 0 auto;
  font-size: 12px;
  color: #6b6b6b;
  opacity: 0;
  transition: opacity 0.18s ease;
}
.aha-opt:hover .aha-opt-count,
.aha-opt:focus-within .aha-opt-count {
  opacity: 1;
}
/* Delete — floats centred on the top-right corner, revealed on hover/focus. */
.aha-opt-del {
  position: absolute;
  top: -14px;
  right: -14px;
  z-index: 5;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
}
.aha-opt:hover .aha-opt-del,
.aha-opt:focus-within .aha-opt-del {
  opacity: 1;
  pointer-events: auto;
}
</style>
