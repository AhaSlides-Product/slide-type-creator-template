<script setup lang="ts">
// ImageDropzone — a standalone, full-width image field: the dashed upload card,
// with every state (empty → loading → filled). The large-format sibling of
// ImageActionButton (which is the compact per-option control); use this when the
// image IS the field, not a thumbnail beside a row.
//
// STYLE MATCHES the AhaSlides storybook `LocalFileUploader`
// (stpancras-storybook-app/src/components/UI/LocalFileUploader.vue): a 2px dashed
// grey card (`border-gray-50` #D4D4D4) on a faint grey fill (`bg-gray-20` #F7F7F7),
// `rounded` 4px, hover border → `purple-30` #D3B4FF, and a lavender focus ring
// (`0 0 0 4px rgba(211,180,255,.30)`). The glyph is Ant's PictureOutlined — the
// same image icon OptionRow / ImageActionButton use — at 16px in the settings
// secondary ink (#4B4B4B, aha-panel-ink).
//
// PORTRAIT / LANDSCAPE — the display box (`.aha-dz-frame`, "ô hiển thị") is a
// FIXED-height grey surface; the uploaded image almost never matches its aspect,
// so it is fitted, never stretched. Three cases, all handled by `fit` +
// max-size + centring (LocalFileUploader itself only shows a filename, so this
// preview behaviour is ours):
//   1. LANDSCAPE (wider than the box)  → contain: scales to the box WIDTH,
//      centred, grey letterbox top+bottom.
//   2. PORTRAIT  (taller than the box) → contain: scales to the box HEIGHT,
//      centred, grey pillarbox left+right.
//   3. SMALLER than the box            → shown at natural size, centred, never
//      upscaled (so a tiny logo doesn't blur).
// `fit="cover"` instead fills the whole box and crops the overflow — use it only
// when the slide's canvas itself crops-to-fill, so the preview matches the result.
//
// HOST OWNS THE UPLOAD. Like ImageActionButton, this emits INTENTS and never
// uploads anything itself — the reuse-host-capabilities rule: a slide type calls
// the host's `openUploadImageModal()` / `uploadImage(file)` / `openEditImageModal(url)`,
// not a self-built file input + cropper. Wire it up in the slide type:
//
//   async function pick() {
//     loading.value = true
//     const r = await openUploadImageModal()      // host modal picks + hosts the file
//     loading.value = false
//     if (r?.url) imageUrl.value = r.url
//   }
//   async function edit() {                          // filled → crop/adjust the current image
//     const r = await openEditImageModal(imageUrl.value)
//     if (r?.url) imageUrl.value = r.url
//   }
//   function remove() { imageUrl.value = '' }        // filled → back to the empty card
//   // drag-drop still goes through the host — hand it the File, don't upload it:
//   async function onDrop(file: File) {
//     loading.value = true
//     const r = await uploadImage(file)            // host hosts the dropped file
//     loading.value = false
//     if (r?.url) imageUrl.value = r.url
//   }
//
// Why not Ant's `<a-upload-dragger>`? It is built to PERFORM the upload (needs an
// `action`/`customRequest` and manages its own fileList) — using it here would
// fight the host-owns-upload contract, and its default look needs full restyling
// to the LocalFileUploader card anyway. Composing the host-modal intent pattern
// is the smaller, correct path.
//
// SETTINGS-ONLY: the card paints a faint grey surface (matching LocalFileUploader),
// fine in the host editor chrome but not under the transparent-surface rule on
// Canvas / Audience.
import { ref } from 'vue'
import { Button } from 'ant-design-vue'
import {
  DeleteOutlined,
  EditOutlined,
  LoadingOutlined,
  PictureOutlined,
  SwapOutlined,
} from '@ant-design/icons-vue'

const props = withDefaults(
  defineProps<{
    /** Current image URL — empty ⇒ the dashed upload card. */
    imageUrl?: string
    /** True while the host upload modal / upload is in flight. Shows the spinner. */
    loading?: boolean
    /** Big prompt on the empty card. */
    title?: string
    /** Muted format hint under the title. */
    hint?: string
    /**
     * How the filled preview fits the fixed display box (see the header note):
     * 'contain' (default) shows the WHOLE image, letterbox/pillarbox in grey —
     * the right default for a settings preview; 'cover' fills + crops, for when
     * the slide's own canvas crops-to-fill.
     */
    fit?: 'contain' | 'cover'
    /** Accept a dropped File (still handed to the host via `uploadImage` — see @drop). */
    allowDrop?: boolean
    changeLabel?: string
    editLabel?: string
    deleteLabel?: string
    disabled?: boolean
  }>(),
  {
    imageUrl: '',
    loading: false,
    title: 'Upload an image',
    hint: 'PNG, JPG, GIF, WebP',
    fit: 'contain',
    allowDrop: true,
    changeLabel: 'Change',
    editLabel: 'Edit',
    deleteLabel: 'Delete',
    disabled: false,
  },
)

const emit = defineEmits<{
  /** Empty card clicked — open the host upload modal (openUploadImageModal). */
  (e: 'select'): void
  /** Filled "Change" — open the host upload modal to replace the image. */
  (e: 'change'): void
  /** Filled "Edit" — open the host crop/edit modal (openEditImageModal(currentUrl)). */
  (e: 'edit'): void
  /** Filled "Delete" — clear the image (back to the empty card). */
  (e: 'remove'): void
  /** A File was dropped — hand it to the host's `uploadImage(file)`, do NOT upload it here. */
  (e: 'drop', file: File): void
}>()

const dragging = ref(false)

function onDragOver() {
  if (props.allowDrop && !props.loading && !props.disabled) dragging.value = true
}
function onDragLeave() {
  dragging.value = false
}
function onDrop(ev: DragEvent) {
  dragging.value = false
  if (!props.allowDrop || props.loading || props.disabled) return
  const file = ev.dataTransfer?.files?.[0]
  // Only images — anything else is ignored (this is a filter, not an upload).
  if (file && file.type.startsWith('image/')) emit('drop', file)
}
</script>

<template>
  <div
    class="aha-dz-wrap"
    :class="{ 'is-dragging': dragging }"
    @dragover.prevent="onDragOver"
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <!-- LOADING — dashed card, spinner, inert. -->
    <div v-if="loading" class="aha-dz aha-dz-loading" role="status" aria-label="Uploading">
      <LoadingOutlined spin class="aha-dz-spin" />
      <div class="aha-dz-title">Uploading…</div>
    </div>

    <!-- FILLED — the image in a fixed display box, with a Change / Edit / Delete overlay. -->
    <div v-else-if="imageUrl" class="aha-dz-filled">
      <div class="aha-dz-frame">
        <!-- object-fit handles the portrait/landscape/smaller cases — see header. -->
        <img :src="imageUrl" alt="" class="aha-dz-img" :class="`fit-${fit}`" />
      </div>
      <!-- Plain themed <a-button size="small">s — no shape/danger override, so they
           inherit the ahaSlidesDefaultTheme (8px corner, Plus Jakarta 600, purple
           hover) from mountSettings' ConfigProvider. Revealed on hover/focus only
           (Delete is a plain button, not the red danger variant). -->
      <div class="aha-dz-ov">
        <Button size="small" :disabled="disabled" @click="emit('change')">
          <template #icon><SwapOutlined /></template>
          {{ changeLabel }}
        </Button>
        <Button size="small" :disabled="disabled" @click="emit('edit')">
          <template #icon><EditOutlined /></template>
          {{ editLabel }}
        </Button>
        <Button size="small" :disabled="disabled" @click="emit('remove')">
          <template #icon><DeleteOutlined /></template>
          {{ deleteLabel }}
        </Button>
      </div>
    </div>

    <!-- EMPTY — the dashed upload card; click opens the host modal. -->
    <button
      v-else
      type="button"
      class="aha-dz aha-dz-empty"
      :disabled="disabled"
      :aria-label="title"
      @click="emit('select')"
    >
      <!-- PictureOutlined — the same image glyph OptionRow / ImageActionButton use —
           at 16px in the settings secondary ink (#4B4B4B, aha-panel-ink). -->
      <PictureOutlined class="aha-dz-icon" />
      <div class="aha-dz-title">{{ title }}</div>
      <div v-if="hint" class="aha-dz-hint">{{ hint }}</div>
    </button>
  </div>
</template>

<style scoped>
.aha-dz-wrap {
  position: relative;
  width: 100%;
}
/* Shared dashed card (empty + loading) — LocalFileUploader look. */
.aha-dz {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100%;
  min-height: 120px; /* pinned above the empty card's content (icon + title + hint ≈ 114px)
                        so the LOADING state renders at the same height — no jump (AHAM-471) */
  padding: 24px 12px; /* 24px top/bottom breathing room */
  border: 2px dashed #d4d4d4; /* border-gray-50 */
  border-radius: 8px; /* rounded-lg — matches the input/button family (AHAM-471) */
  background: #f7f7f7; /* bg-gray-20 — faint grey fill (settings chrome only) */
  text-align: center;
  transition: border-color 0.15s ease;
}
.aha-dz-empty {
  cursor: pointer;
  color: #1a1a1a; /* text-gray-100 */
  /* Native <button> resets so it reads as the card, not a control. */
  font: inherit;
  appearance: none;
}
/* LocalFileUploader hover changes ONLY the border → purple-30 (lavender). */
.aha-dz-empty:hover:not(:disabled),
.aha-dz-wrap.is-dragging .aha-dz-empty {
  border-color: #d3b4ff; /* hover:border-purple-30 */
}
.aha-dz-empty:focus-visible {
  outline: none;
  box-shadow: 0 0 0 4px rgba(211, 180, 255, 0.3); /* LocalFileUploader focus ring */
}
.aha-dz-empty:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.aha-dz-icon {
  font-size: 16px; /* Ant icon sizes by font-size */
  color: #4b4b4b; /* aha-panel-ink — the settings-panel secondary ink */
}
.aha-dz-title {
  font-size: 14px;
  color: #1a1a1a; /* text-gray-100 */
}
.aha-dz-hint {
  font-size: 14px; /* text-sm */
  color: #8a8a8a; /* text-gray-70 */
}
/* Loading text uses the default ink (.aha-dz-title); only the spinner is purple. */
.aha-dz-spin {
  font-size: 24px;
  color: #6a1ebb;
}
/* Filled — the fixed display box ("ô hiển thị") + a hover/focus action overlay. */
.aha-dz-filled {
  position: relative;
  width: 100%;
  border-radius: 8px; /* rounded-lg — matches the empty/loading card (AHAM-471) */
  overflow: hidden;
  border: 1px solid #e3e3e3; /* border-gray-40 */
}
/* The box the image is fitted into — a neutral grey surface behind the picture,
   so portrait/landscape letterbox/pillarbox reads as intentional, not empty. */
.aha-dz-frame {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 135px;
  background: #f7f7f7; /* bg-gray-20 — matches the empty card surface */
}
/* contain (default): whole image visible, centred, NEVER upscaled past its
   natural size (a small image stays crisp instead of blowing up). */
.aha-dz-img.fit-contain {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  display: block;
}
/* cover: fill the box and crop the overflow — only when the canvas crops too. */
.aha-dz-img.fit-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.aha-dz-ov {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(26, 26, 46, 0.5); /* aha-space scrim */
  opacity: 0;
  transition: opacity 0.15s ease;
}
.aha-dz-filled:hover .aha-dz-ov,
.aha-dz-filled:focus-within .aha-dz-ov {
  opacity: 1;
}
</style>
