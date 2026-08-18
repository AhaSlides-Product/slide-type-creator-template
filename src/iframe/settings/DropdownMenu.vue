<script setup lang="ts">
// DropdownMenu — a themed action menu (`<a-dropdown>` + `<a-menu>`).
//
// It reproduces the presenter's dropdown look (the per-option image menu, the
// "Improve"-style action menu), delivered by the `.ant-dropdown-menu` styling in
// storybook-overrides.css (GAP 8) — neutral-grey item hover (#E6E6E6, not purple),
// 4px item corners, 8px popup, soft shadow. Nothing here re-styles the menu; it
// only wires the items and forwards the trigger slot.
//
// `v-for` sits on `<MenuItem>` directly, with the key on that element — NOT on a
// wrapping `<template v-for>`. A template-plus-inner-key form makes the production
// build fail ("key should be placed on the <template> tag"), because Vue forbids a
// key on both the template and the MenuItem it needs one on. (If a future menu
// needs group dividers, add them via Ant Menu's data-driven `items` prop rather
// than a `<template v-for>`.)
//
// The trigger is whatever you put in the default slot (a button, an icon, a
// thumbnail). Menu width defaults to hugging the widest item; pass `menuWidth`
// only when you want a fixed width.
import type { Component } from 'vue'
import { Dropdown, Menu, MenuItem } from 'ant-design-vue'

export interface DropdownMenuItem {
  /** Unique key emitted on select. */
  key: string
  /** Item label. */
  label: string
  /** Optional leading icon component (e.g. an @ant-design/icons-vue icon). */
  icon?: Component
  /** Render as a destructive item (red). */
  danger?: boolean
}

withDefaults(
  defineProps<{
    items: DropdownMenuItem[]
    /** Fixed popup width in px; omit to hug the widest item. */
    menuWidth?: number
    /** Ant dropdown placement. */
    placement?: 'bottomLeft' | 'bottomRight' | 'bottom' | 'topLeft' | 'topRight' | 'top'
    /** What opens the menu. */
    trigger?: 'click' | 'hover'
    disabled?: boolean
  }>(),
  { placement: 'bottomLeft', trigger: 'click', disabled: false },
)

const emit = defineEmits<{ (e: 'select', key: string): void }>()

function onClick(info: { key: string | number }) {
  emit('select', String(info.key))
}
</script>

<template>
  <Dropdown :placement="placement" :trigger="[trigger]" :disabled="disabled">
    <!-- the clickable trigger -->
    <slot />
    <template #overlay>
      <!-- selectable=false: this is an ACTION menu, so no item keeps a highlight. -->
      <Menu
        :selectable="false"
        :style="menuWidth ? { width: `${menuWidth}px` } : undefined"
        @click="onClick"
      >
        <MenuItem v-for="item in items" :key="item.key" :danger="item.danger">
          <span class="aha-dd-item">
            <component :is="item.icon" v-if="item.icon" class="aha-dd-icon" />
            <span>{{ item.label }}</span>
          </span>
        </MenuItem>
      </Menu>
    </template>
  </Dropdown>
</template>

<style scoped>
.aha-dd-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.aha-dd-icon {
  font-size: 16px;
}
</style>
