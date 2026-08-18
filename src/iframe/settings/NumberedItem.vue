<script setup lang="ts">
// NumberedItem — a repeatable, numbered SECTION wrapper for a settings list whose
// items are COMPOSITES (each holds a body of fields and/or a nested option list),
// not a single value. It standardises three things that otherwise drift item-by-item
// across slide types: the sequence badge (ONE muted grey chip size — this kills the
// h-5-vs-h-6 badge drift), the "<Label> N" header, and a TERTIARY (borderless,
// non-danger) delete matching QuestionList's own per-question delete — shown on
// hover of the whole item, and droppable entirely via `deletable=false`.
//
// It owns ONLY the chrome. The item body is a DEFAULT SLOT — the consumer drops in
// OptionRow / ModeField / any Ant control; NumberedItem never rebuilds those. Two
// container shapes: 'contained' (default) wraps the WHOLE item — chip, label, and body
// — on the secondary-fill grey card the settings system already uses (ImageDropzone/
// InfoBox paint the same faint fill — the "transparent surface" rule is for Canvas/
// Audience, NOT the host editor), so the composite reads as one grouped card per
// SETTINGS-43; 'plain' drops the fill so the parent owns spacing between single-field
// items.
//
// Delete is OPTIONAL. `deletable` (default true) governs whether the delete affordance
// EXISTS at all: false hides it entirely (nothing renders — no greyed dead icon) for
// items whose add/remove is owned elsewhere (e.g. FiB blanks, added/removed by editing
// the sentence's `[ ]` markers, the single source of truth). `canDelete` is the
// separate at-min-count semantic — is deletion currently ALLOWED — and only matters
// while `deletable` is true.
//
// SETTINGS-ONLY, and production-portable: pure Vue + Ant, no cross-slide-type imports.
import { computed } from 'vue'
import { Button, Tooltip } from 'ant-design-vue'
import { DeleteOutlined } from '@ant-design/icons-vue'
import { TOOLTIP_ARROW, TOOLTIP_OVERLAY_STYLE } from '@/iframe/uiStandard'
import { numberedItemLabel } from './numberedItemLabel'

const props = withDefaults(
  defineProps<{
    /** 0-based position; the chip and header show `index + 1`. */
    index: number
    /** Optional item noun — the header reads `${label} ${index + 1}` ("Blank 1"). */
    label?: string
    /** Whether the delete affordance EXISTS at all. false hides it entirely (no greyed
     *  icon) — for items whose add/remove is owned elsewhere. Default true. */
    deletable?: boolean
    /** Disable the delete button (e.g. at the minimum item count). Only applies when
     *  `deletable` is true. */
    canDelete?: boolean
    /** 'contained' = whole item (chip + label + body) on the secondary-fill grey card;
     *  'plain' = no fill, header + slot only. */
    variant?: 'contained' | 'plain'
  }>(),
  { deletable: true, canDelete: true, variant: 'contained' },
)

const emit = defineEmits<{ (e: 'delete'): void }>()

const headerText = computed(() => numberedItemLabel(props.label, props.index))
</script>

<template>
  <div class="aha-ni" :class="`aha-ni--${variant}`">
    <div class="aha-ni-head">
      <!-- Sequence identity — MUTED grey (NOT radical purple), ONE fixed size. -->
      <span class="aha-ni-chip" aria-hidden="true">{{ index + 1 }}</span>
      <!-- Always rendered (flex-1) so the delete stays right-aligned even with no
           label; the chip carries the number when `label` is absent. -->
      <span class="aha-ni-label">{{ label ? headerText : '' }}</span>
      <!-- TERTIARY delete: Ant type="text" (borderless, no fill, NOT danger), with the
           capped, Ant-positioned tooltip that never clips out of the iframe — the same
           pattern QuestionList's per-question delete uses. `deletable=false` removes it
           entirely (no greyed stub) for items whose add/remove lives elsewhere. -->
      <Tooltip v-if="deletable" :overlay-style="TOOLTIP_OVERLAY_STYLE" placement="bottomRight" title="Delete" :arrow="TOOLTIP_ARROW">
        <Button
          class="aha-ni-del"
          type="text"
          size="small"
          :disabled="!canDelete"
          :aria-label="`Delete ${headerText}`"
          @click="emit('delete')"
        >
          <template #icon><DeleteOutlined /></template>
        </Button>
      </Tooltip>
    </div>

    <div class="aha-ni-body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
/* 'contained' — the WHOLE item on the secondary-fill grey card: chip + label + body
   share one #F7F7F7 rounded, borderless container so they read as a single grouped
   card (SETTINGS-43). The head's margin-bottom then acts as internal card spacing
   between the header row and the fields below. */
.aha-ni--contained {
  background: #f7f7f7; /* bg-gray-20 — the settings system's secondary faint fill */
  border-radius: 12px; /* rounded-aha */
  padding: 12px;
}
.aha-ni-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
/* Number chip — a single 22px circle on the storybook neutral grey (#E6E6E6, a
   touch darker than the #F7F7F7 container so it reads), dark panel-ink digit. */
.aha-ni-chip {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #e6e6e6; /* storybook neutral grey (GAP 8) */
  color: #4b4b4b; /* aha-panel-ink — host editor chrome ink */
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.aha-ni-label {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 700;
  color: #1a1a1a; /* gray-100 — primary settings text */
}
/* 'plain' — no fill, no padding; the parent owns spacing between items. */

/* Delete is hover-only: hidden at rest, revealed on hovering (or focusing within) the
   whole item. Opacity keeps its space reserved, so the label never shifts. */
.aha-ni-del {
  opacity: 0;
  transition: opacity 0.12s ease;
}
.aha-ni:hover .aha-ni-del,
.aha-ni:focus-within .aha-ni-del {
  opacity: 1;
}
</style>
