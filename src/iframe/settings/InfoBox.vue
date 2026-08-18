<script setup lang="ts">
// InfoBox — a callout / notice box for the settings panel (the "Once responses are
// submitted…" note is the canonical use). Replicated 1:1 from the presenter app's
// storybook component (stpancras-storybook-app/src/components/UI/InfoBox.vue), which
// is BESPOKE — not an Ant Alert. Ant Alert is close conceptually but diverges on the
// brand tints (error is Radical Pink #FF4081, not red), on persistence (InfoBox saves
// its dismissed state to localStorage), and on icons, so matching it would mean
// overriding all of that; replicating the source is the faithful, smaller path.
//
// SETTINGS-ONLY: it paints a tinted background, which is fine in the host editor
// chrome (fixed brand ink) but violates the transparent-surface rule on Canvas /
// Audience — do not use it there.
//
// A closable box persists its dismissal in localStorage keyed by `name`, so give
// each closable InfoBox a UNIQUE name (ideally include the slide id) or they share
// one dismiss flag.
import { onMounted, ref } from 'vue'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CloseOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons-vue'

type InfoBoxVariant = 'information' | 'success' | 'warning' | 'error'

const props = withDefaults(
  defineProps<{
    variant?: InfoBoxVariant
    /** Show a close button; the dismissal is remembered in localStorage. */
    closable?: boolean
    /** localStorage key suffix — MUST be unique per closable box. */
    name?: string
  }>(),
  { variant: 'information', closable: false, name: 'aha-info-box' },
)

const emit = defineEmits<{ (e: 'close'): void }>()

const ICONS = {
  information: InfoCircleOutlined,
  success: CheckCircleOutlined,
  warning: ExclamationCircleOutlined,
  error: CloseCircleOutlined,
} as const

const isVisible = ref(true)

function storageKey() {
  return `aha-info-box-${props.name}-is-visible`
}

onMounted(() => {
  // Only a closable box persists/restores — a non-closable one is always shown,
  // so it never reads storage (avoids a shared default name hiding an un-closable note).
  if (!props.closable) return
  try {
    isVisible.value = localStorage.getItem(storageKey()) !== 'false'
  } catch {
    /* localStorage unavailable — stay visible */
  }
})

function handleClose() {
  isVisible.value = false
  try {
    localStorage.setItem(storageKey(), 'false')
  } catch {
    /* ignore */
  }
  emit('close')
}
</script>

<template>
  <div v-if="isVisible" class="aha-infobox" :class="`aha-infobox--${variant}`" role="note">
    <div class="aha-infobox-row">
      <component :is="ICONS[variant]" class="aha-infobox-icon" />
      <span class="aha-infobox-text"><slot /></span>
      <button
        v-if="closable"
        type="button"
        class="aha-infobox-close"
        aria-label="Dismiss"
        @click="handleClose"
      >
        <CloseOutlined />
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Exact values from the storybook InfoBox.vue (radius 8, pad 12/16, text gray-100). */
.aha-infobox {
  position: relative;
  border-radius: 8px;
  color: #1a1a1a;
  background-color: var(--ib-bg);
  border: 1px solid var(--ib-border);
}
.aha-infobox-row {
  display: flex;
  align-items: flex-start;
  padding: 0.75rem 1rem;
  padding-right: 2.5rem; /* room for the close button */
}
.aha-infobox-icon {
  margin-top: 2px;
  margin-right: 8px;
  flex-shrink: 0;
  font-size: 16px;
  color: var(--ib-icon);
}
.aha-infobox-text {
  font-size: 14px;
  line-height: 1.45;
}
.aha-infobox-close {
  position: absolute;
  right: 12px;
  top: 12px;
  display: inline-flex;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--ib-icon);
  opacity: 0.7;
  cursor: pointer;
  transition: opacity 0.2s ease;
}
.aha-infobox-close:hover {
  opacity: 1;
}
.aha-infobox-close:focus-visible {
  outline: 2px solid #6a1ebb;
  outline-offset: 2px;
  border-radius: 4px;
}

/* Variant tints — verbatim from the source. */
.aha-infobox--information {
  --ib-bg: #eaf0ff;
  --ib-border: #bfd2ff;
  --ib-icon: #9bb3e9; /* seed colorInfo */
}
.aha-infobox--error {
  --ib-bg: #ffe3e9;
  --ib-border: #ff4081; /* Radical Pink — NOT red */
  --ib-icon: #ff4081;
}
.aha-infobox--warning {
  --ib-bg: #ffe5d6; /* coral.25 */
  --ib-border: #ff7747; /* coral.60 */
  --ib-icon: #ff7747;
}
.aha-infobox--success {
  --ib-bg: #d8faef; /* emerald.20 */
  --ib-border: #20e8b5; /* emerald.50 / brand teal */
  --ib-icon: #16c49a; /* emerald.60 / brand success */
}
</style>
