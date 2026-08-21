<script setup lang="ts">
// Settings panel for the tinder-match slide type: the instruction shown to
// participants · whether to collect a short bio · whether the matched pairs are
// revealed on the big screen. Built from @/iframe/settings + ui-standard tokens.
// The question title/description are the host's own controls (manifest flags).
import { computed, onMounted, watch } from 'vue'
import { Switch } from 'ant-design-vue'
import { usePresenterPlugin, useSync } from '@aha/ui'
import {
  CountedTextarea,
  InfoBox,
  SectionHeader,
  SettingRow,
} from '@/iframe/settings'
import { SETTINGS_FIELD_GAP_CLASS, SETTINGS_ROOT_CLASS } from '@/iframe/uiStandard'
import type { TinderConfig } from './config'
import {
  MAX_INSTRUCTION,
  TINDER_CONFIG_KEY,
  createDefaultTinderConfig,
  migrateTinderConfig,
} from './config'

const plugin: any = usePresenterPlugin({ autoHeight: true })
const slideId = computed(() => Number(plugin.slideProps?.value?.id ?? 0))
const channel = computed(() => `${TINDER_CONFIG_KEY}/s${slideId.value}`)
const config = useSync<TinderConfig>(channel, createDefaultTinderConfig())

onMounted(async () => {
  const attrs = await plugin.getSlideAttributesAction?.(slideId.value)
  const persisted = attrs?.[TINDER_CONFIG_KEY]
  if (persisted) config.value = migrateTinderConfig(persisted)
})

let timer: ReturnType<typeof setTimeout> | null = null
watch(config, (next) => {
  if (!plugin.upsertSlideAttributeAction) return
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    plugin.upsertSlideAttributeAction({
      slideId: slideId.value,
      attributeKey: TINDER_CONFIG_KEY,
      attributeValue: JSON.parse(JSON.stringify(next)),
    })
  }, 200)
}, { deep: true })

function patch(partial: Partial<TinderConfig>) {
  config.value = { ...config.value, ...partial }
}

const instruction = computed<string>({
  get: () => config.value.instruction,
  set: (v) => patch({ instruction: v }),
})
</script>

<template>
  <div :class="SETTINGS_ROOT_CLASS" data-testid="tinder-match-settings">
    <InfoBox>
      Everyone who joins swipes on everyone else. When two people like each other it's a
      match — shown on their phones and, if you like, on the big screen. Set the question in
      the slide's title bar; this panel controls the game.
    </InfoBox>

    <!-- Instruction -->
    <div :class="SETTINGS_FIELD_GAP_CLASS">
      <SectionHeader label="Instruction for participants" help="Shown above the swipe deck on each phone." />
      <CountedTextarea
        v-model="instruction"
        :max-length="MAX_INSTRUCTION"
        placeholder="Swipe right on people you'd like to connect with!"
        :min-rows="2"
        :max-rows="4"
      />
    </div>

    <!-- Collect bio -->
    <div :class="SETTINGS_FIELD_GAP_CLASS">
      <SettingRow
        label="Ask for a short bio"
        description="Each participant can add a one-line bio shown on their card."
      >
        <Switch :checked="config.collectBio" @update:checked="(v: unknown) => patch({ collectBio: Boolean(v) })" />
      </SettingRow>
    </div>

    <!-- Reveal matches -->
    <div :class="SETTINGS_FIELD_GAP_CLASS">
      <SettingRow
        label="Reveal matches on screen"
        description="Show the matched pairs on the presenter canvas. Participants always see their own matches."
      >
        <Switch :checked="config.revealMatches" @update:checked="(v: unknown) => patch({ revealMatches: Boolean(v) })" />
      </SettingRow>
    </div>
  </div>
</template>
