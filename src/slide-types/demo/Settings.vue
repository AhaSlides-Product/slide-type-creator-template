<script setup lang="ts">
// Sample Settings panel for the demo slide type — built from the shared settings
// component library (@/iframe/settings) + ui-standard tokens, following the
// aha-design-settings skill. Root is SETTINGS_ROOT_CLASS; fields are separated by
// SETTINGS_FIELD_GAP_CLASS spacing only (no dividers/cards). Each setting is a
// useSync ref, hydrated on mount and persisted (debounced) via
// upsertSlideAttributeAction.
import { computed, onMounted, ref, watch } from 'vue'
import { Button, Switch } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { usePresenterPlugin, useSync } from '@aha/ui'
import {
  CardSelect,
  CountedInput,
  CountedTextarea,
  NumberWithUnit,
  OptionRow,
  SectionHeader,
  SettingRow,
  SubSettingGroup,
} from '@/iframe/settings'
import { SETTINGS_FIELD_GAP_CLASS, SETTINGS_HELP_CLASS, SETTINGS_ROOT_CLASS } from '@/iframe/uiStandard'
import type { DemoConfig, DemoLayout } from './config'
import {
  DEMO_CONFIG_KEY,
  MAX_OPTIONS,
  MIN_OPTIONS,
  createDefaultDemoConfig,
  createOption,
  migrateDemoConfig,
} from './config'

const plugin: any = usePresenterPlugin({ autoHeight: true })
const slideId = computed(() => Number(plugin.slideProps?.value?.id ?? 0))
const channel = computed(() => `${DEMO_CONFIG_KEY}/s${slideId.value}`)
const config = useSync<DemoConfig>(channel, createDefaultDemoConfig())

onMounted(async () => {
  const attrs = await plugin.getSlideAttributesAction?.(slideId.value)
  const persisted = attrs?.[DEMO_CONFIG_KEY]
  if (persisted) config.value = migrateDemoConfig(persisted)
})

let timer: ReturnType<typeof setTimeout> | null = null
watch(config, (next) => {
  if (!plugin.upsertSlideAttributeAction) return
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    plugin.upsertSlideAttributeAction({
      slideId: slideId.value,
      attributeKey: DEMO_CONFIG_KEY,
      attributeValue: JSON.parse(JSON.stringify(next)),
    })
  }, 200)
}, { deep: true })

function patch(partial: Partial<DemoConfig>) {
  config.value = { ...config.value, ...partial }
}
function setOptionLabel(id: string, label: string) {
  patch({ options: config.value.options.map((o) => (o.id === id ? { ...o, label } : o)) })
}
function addOption() {
  if (config.value.options.length >= MAX_OPTIONS) return
  patch({ options: [...config.value.options, createOption()] })
}
function removeOption(id: string) {
  if (config.value.options.length <= MIN_OPTIONS) return
  patch({ options: config.value.options.filter((o) => o.id !== id) })
}

const LAYOUT_OPTIONS: ReadonlyArray<{ value: DemoLayout; label: string }> = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'card', label: 'Card' },
]

const uploadingImage = ref(false)
async function pickImage() {
  if (!plugin.openUploadImageModal) return
  uploadingImage.value = true
  const result = await plugin.openUploadImageModal()
  uploadingImage.value = false
  if (result?.url) patch({ imageUrl: result.url })
}
</script>

<template>
  <div :class="SETTINGS_ROOT_CLASS" data-testid="demo-settings">
    <!-- Greeting -->
    <div :class="SETTINGS_FIELD_GAP_CLASS">
      <SectionHeader label="Greeting" help="Shown large on the slide." />
      <CountedInput
        :model-value="config.greeting"
        placeholder="e.g. Welcome!"
        :max-length="60"
        @update:model-value="(v: string) => patch({ greeting: v })"
      />
    </div>

    <!-- Description -->
    <div :class="SETTINGS_FIELD_GAP_CLASS">
      <SectionHeader label="Description" />
      <div :class="SETTINGS_HELP_CLASS">Optional subtitle shown under the greeting.</div>
      <CountedTextarea
        :model-value="config.description"
        placeholder="A short subtitle"
        :max-length="150"
        @update:model-value="(v: string) => patch({ description: v })"
      />
    </div>

    <!-- Layout -->
    <div :class="SETTINGS_FIELD_GAP_CLASS">
      <SectionHeader label="Layout" />
      <CardSelect
        :model-value="config.layout"
        :options="LAYOUT_OPTIONS"
        :columns="3"
        @update:model-value="(v: string) => patch({ layout: v as DemoLayout })"
      />
    </div>

    <!-- Image (dependent sub-setting) -->
    <div :class="SETTINGS_FIELD_GAP_CLASS">
      <SettingRow label="Show image" description="Display a picture next to the greeting.">
        <Switch :checked="config.showImage" @update:checked="(v: unknown) => patch({ showImage: Boolean(v) })" />
      </SettingRow>
      <SubSettingGroup v-if="config.showImage">
        <Button :loading="uploadingImage" @click="pickImage">
          <template #icon><PlusOutlined /></template>
          {{ config.imageUrl ? 'Change image' : 'Add image' }}
        </Button>
        <img v-if="config.imageUrl" :src="config.imageUrl" alt="" class="mt-2 max-w-full rounded-lg" />
      </SubSettingGroup>
    </div>

    <!-- Responses (dependent sub-settings) -->
    <div :class="SETTINGS_FIELD_GAP_CLASS">
      <SettingRow label="Collect responses" description="Let the audience send a short answer.">
        <Switch :checked="config.collectResponses" @update:checked="(v: unknown) => patch({ collectResponses: Boolean(v) })" />
      </SettingRow>
      <SubSettingGroup v-if="config.collectResponses">
        <SettingRow label="Max responses per person">
          <NumberWithUnit
            :model-value="config.responseLimit"
            unit="responses"
            :min="1"
            :max="10"
            @update:model-value="(v: number | undefined) => patch({ responseLimit: Number(v ?? 1) })"
          />
        </SettingRow>

        <SectionHeader label="Preset answers" :help="`Between ${MIN_OPTIONS} and ${MAX_OPTIONS} quick replies.`" />
        <div class="flex flex-col gap-2">
          <OptionRow
            v-for="(option, index) in config.options"
            :key="option.id"
            :index="index"
            :text="option.label"
            :can-delete="config.options.length > MIN_OPTIONS"
            @update:text="(v: string) => setOptionLabel(option.id, v)"
            @delete="removeOption(option.id)"
          />
        </div>
        <Button class="mt-2" :disabled="config.options.length >= MAX_OPTIONS" @click="addOption">
          <template #icon><PlusOutlined /></template>
          Add answer
        </Button>
      </SubSettingGroup>
    </div>
  </div>
</template>
