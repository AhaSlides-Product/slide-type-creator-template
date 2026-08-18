<script setup lang="ts">
// ImageActionButton — the per-option image control, with every state:
//   • empty            → image-square button; tooltip "Add image"; click → `add`
//   • empty + loading  → spinner, inert (while the host upload modal is opening)
//   • has image        → 36px thumbnail; HOVER shows a dark overlay + pencil;
//                        CLICK opens a menu (Change / Edit / Delete). No tooltip.
//
// It emits INTENTS only — it never calls the host. The slide type wires them to the
// host modals it owns (openUploadImageModal / openEditImageModal) and flips
// `loading` while the add/change modal is opening, e.g.:
//
//   async function onAdd(id) {
//     uploading.value = id
//     const r = await openUploadImageModal()
//     uploading.value = null
//     if (r?.url) setImage(id, r.url)
//   }
//
// The menu is DropdownMenu, so it inherits the themed Ant menu (neutral hover).
import { computed } from 'vue'
import { Tooltip } from 'ant-design-vue'
import {
  DeleteOutlined,
  EditOutlined,
  LoadingOutlined,
  PictureOutlined,
} from '@ant-design/icons-vue'
import { TOOLTIP_ARROW } from '@/iframe/uiStandard'
import DropdownMenu, { type DropdownMenuItem } from './DropdownMenu.vue'

const props = withDefaults(
  defineProps<{
    imageUrl?: string
    /** True while the host upload modal is opening — shows a spinner and disables the button. */
    loading?: boolean
    /** Tooltip on the empty (add) state. */
    addLabel?: string
    changeLabel?: string
    editLabel?: string
    deleteLabel?: string
  }>(),
  {
    imageUrl: '',
    loading: false,
    addLabel: 'Add image',
    changeLabel: 'Change',
    editLabel: 'Edit',
    deleteLabel: 'Delete',
  },
)

const emit = defineEmits<{
  (e: 'add'): void
  (e: 'change'): void
  (e: 'edit'): void
  (e: 'remove'): void
}>()

const menuItems = computed<DropdownMenuItem[]>(() => [
  { key: 'change', label: props.changeLabel, icon: PictureOutlined },
  { key: 'edit', label: props.editLabel, icon: EditOutlined },
  { key: 'delete', label: props.deleteLabel, icon: DeleteOutlined, danger: true },
])

function onMenuSelect(key: string) {
  if (key === 'change') emit('change')
  else if (key === 'edit') emit('edit')
  else if (key === 'delete') emit('remove')
}
</script>

<template>
  <!-- HAS IMAGE — thumbnail + hover overlay, click opens the action menu -->
  <DropdownMenu
    v-if="imageUrl"
    :items="menuItems"
    placement="bottomLeft"
    @select="onMenuSelect"
  >
    <span class="aha-thumb" role="button" tabindex="0" :aria-label="editLabel">
      <img :src="imageUrl" alt="" class="aha-thumb-img" />
      <span class="aha-thumb-ov" aria-hidden="true">
        <EditOutlined />
      </span>
    </span>
  </DropdownMenu>

  <!-- EMPTY + LOADING — spinner, inert -->
  <span v-else-if="loading" class="aha-imgbtn is-loading" role="status" aria-label="Loading">
    <LoadingOutlined spin />
  </span>

  <!-- EMPTY — add-image button (tertiary look) -->
  <Tooltip v-else :title="addLabel" placement="topRight" :arrow="TOOLTIP_ARROW">
    <button
      type="button"
      class="aha-imgbtn"
      :aria-label="addLabel"
      @click="emit('add')"
    >
      <PictureOutlined />
    </button>
  </Tooltip>
</template>

<style scoped>
/* Add / loading button — 36px, tertiary (transparent → purple-tint hover). */
.aha-imgbtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  min-width: 36px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #1a1a1a;
  font-size: 18px;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}
.aha-imgbtn:hover {
  background: #f9f5ff; /* purple-10 */
  color: #8644d4; /* purple-50 */
}
.aha-imgbtn:focus-visible {
  outline: 2px solid #6a1ebb;
  outline-offset: 2px;
}
.aha-imgbtn.is-loading {
  color: #6a1ebb;
  border: 1px solid #e3e3e3;
  cursor: default;
}
/* Thumbnail — 36px, object-cover; hover overlay + pencil; click opens the menu. */
.aha-thumb {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 36px;
  min-width: 36px;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid transparent;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.aha-thumb:hover,
.aha-thumb:focus-visible {
  border-color: #6a1ebb; /* colorPrimary */
  outline: none;
}
.aha-thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.aha-thumb-ov {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(26, 26, 46, 0.5); /* aha-space scrim */
  color: #fff;
  font-size: 18px;
  opacity: 0;
  transition: opacity 0.15s ease;
}
.aha-thumb:hover .aha-thumb-ov,
.aha-thumb:focus-visible .aha-thumb-ov {
  opacity: 1;
}
</style>
