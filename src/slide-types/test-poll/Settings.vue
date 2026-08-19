<script setup lang="ts">
// Settings panel for the test-poll slide type — mirrors the native poll editor:
// question (host controls) · draggable options with a colour swatch + per-option
// image + optional correct toggle · "has correct answer(s)" · "allow multiple".
// Built from @/iframe/settings + ui-standard tokens.
import { computed, onMounted, ref, watch } from 'vue'
import { Button, Switch, InputNumber } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { VueDraggable } from 'vue-draggable-plus'
import { usePresenterPlugin, useSync } from '@aha/ui'
import {
  InfoBox,
  OptionRow,
  SectionHeader,
  SettingRow,
  SubSettingGroup,
} from '@/iframe/settings'
import { SETTINGS_FIELD_GAP_CLASS, SETTINGS_ROOT_CLASS } from '@/iframe/uiStandard'
import type { PollConfig, PollOption } from './config'
import {
  FALLBACK_PALETTE,
  MAX_OPTIONS,
  MIN_OPTIONS,
  POLL_CONFIG_KEY,
  createDefaultPollConfig,
  createOption,
  migratePollConfig,
} from './config'

const plugin: any = usePresenterPlugin({ autoHeight: true })
const slideId = computed(() => Number(plugin.slideProps?.value?.id ?? 0))
const channel = computed(() => `${POLL_CONFIG_KEY}/s${slideId.value}`)
const config = useSync<PollConfig>(channel, createDefaultPollConfig())

onMounted(async () => {
  const attrs = await plugin.getSlideAttributesAction?.(slideId.value)
  const persisted = attrs?.[POLL_CONFIG_KEY]
  if (persisted) config.value = migratePollConfig(persisted)
})

let timer: ReturnType<typeof setTimeout> | null = null
watch(config, (next) => {
  if (!plugin.upsertSlideAttributeAction) return
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    plugin.upsertSlideAttributeAction({
      slideId: slideId.value,
      attributeKey: POLL_CONFIG_KEY,
      attributeValue: JSON.parse(JSON.stringify(next)),
    })
  }, 200)
}, { deep: true })

function patch(partial: Partial<PollConfig>) {
  config.value = { ...config.value, ...partial }
}

// Deck palette for the per-option colour swatch (fallback when standalone).
const palette = computed<string[]>(() => {
  const p = plugin.presentationProps?.value?.presentationColorPalette
  return Array.isArray(p) && p.length ? p : FALLBACK_PALETTE
})
const swatchOf = (index: number) => palette.value[index % palette.value.length]

// vue-draggable-plus binds to the options array directly (v-model:list).
const optionList = computed<PollOption[]>({
  get: () => config.value.options,
  set: (options) => patch({ options }),
})

function setLabel(id: string, label: string) {
  patch({ options: config.value.options.map((o) => (o.id === id ? { ...o, label } : o)) })
}
function setImage(id: string, imageUrl: string) {
  patch({ options: config.value.options.map((o) => (o.id === id ? { ...o, imageUrl } : o)) })
}
function toggleCorrect(id: string, correct: boolean) {
  patch({ options: config.value.options.map((o) => (o.id === id ? { ...o, correct } : o)) })
}
function addOption() {
  if (config.value.options.length >= MAX_OPTIONS) return
  patch({ options: [...config.value.options, createOption()] })
}
function removeOption(id: string) {
  if (config.value.options.length <= MIN_OPTIONS) return
  const options = config.value.options.filter((o) => o.id !== id)
  patch({ options, maxVotes: Math.min(config.value.maxVotes, options.length) })
}

const imageLoadingId = ref('')
async function pickImage(id: string) {
  if (!plugin.openUploadImageModal) return
  imageLoadingId.value = id
  const res = await plugin.openUploadImageModal()
  imageLoadingId.value = ''
  if (res?.url) setImage(id, res.url)
}
</script>

<template>
  <div :class="SETTINGS_ROOT_CLASS" data-testid="test-poll-settings">
    <InfoBox>
      The question, description and image are the host's own controls — set them on the slide's
      title bar. This panel controls the answer options.
    </InfoBox>

    <!-- Options -->
    <div :class="SETTINGS_FIELD_GAP_CLASS">
      <SectionHeader label="Options" :help="`Drag to reorder. Between ${MIN_OPTIONS} and ${MAX_OPTIONS} answers.`" />
      <VueDraggable
        v-model="optionList"
        handle="[data-drag-handle]"
        :animation="150"
        class="flex flex-col gap-2"
      >
        <OptionRow
          v-for="(option, index) in config.options"
          :key="option.id"
          :index="index"
          :text="option.label"
          :image-url="option.imageUrl"
          :correct="option.correct"
          :swatch-color="swatchOf(index)"
          :show-image="true"
          :allow-correct="config.hasCorrectAnswer"
          :image-loading="imageLoadingId === option.id"
          :can-delete="config.options.length > MIN_OPTIONS"
          :draggable="true"
          placeholder="Type an answer"
          :max-length="80"
          @update:text="(v: string) => setLabel(option.id, v)"
          @update:correct="(v: boolean) => toggleCorrect(option.id, v)"
          @add-image="() => pickImage(option.id)"
          @change-image="() => pickImage(option.id)"
          @edit-image="() => pickImage(option.id)"
          @remove-image="() => setImage(option.id, '')"
          @delete="() => removeOption(option.id)"
        />
      </VueDraggable>
      <Button class="mt-2" :disabled="config.options.length >= MAX_OPTIONS" @click="addOption">
        <template #icon><PlusOutlined /></template>
        Add
      </Button>
    </div>

    <!-- Correct answer -->
    <div :class="SETTINGS_FIELD_GAP_CLASS">
      <SettingRow label="This question has correct answer(s)" description="Mark the right option(s) and reveal them while presenting.">
        <Switch :checked="config.hasCorrectAnswer" @update:checked="(v: unknown) => patch({ hasCorrectAnswer: Boolean(v) })" />
      </SettingRow>
    </div>

    <!-- Allow picking more than one -->
    <div :class="SETTINGS_FIELD_GAP_CLASS">
      <SettingRow label="Allow picking more than one option" description="Let each participant vote for several answers.">
        <Switch
          :checked="config.allowMultiple"
          @update:checked="(v: unknown) => patch({ allowMultiple: Boolean(v), maxVotes: v ? Math.max(2, config.maxVotes) : 1 })"
        />
      </SettingRow>
      <SubSettingGroup v-if="config.allowMultiple">
        <SettingRow label="Max picks per participant">
          <InputNumber
            :value="config.maxVotes"
            :min="1"
            :max="config.options.length"
            @update:value="(v: unknown) => patch({ maxVotes: Math.max(1, Number(v ?? 1) || 1) })"
          />
        </SettingRow>
      </SubSettingGroup>
    </div>
  </div>
</template>
