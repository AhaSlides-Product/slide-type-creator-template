<script setup lang="ts">
// QuestionList — an editable list of collapsible questions, each with a prompt and
// a set of answer choices. Generalises the Pirate Battle question editor so any
// quiz-style slide type reuses one implementation.
//
// It COMPOSES the library: the prompt field is a SectionHeader (bold label + (?)
// tooltip) over an Input; the answer choices are OptionRow (with the agreed
// correct-answer toggle), NOT a hand-rolled row. Four deliberate corrections over
// the Pirate Battle original:
//   1. the per-question delete is a TERTIARY icon button (type="text"), not a red one
//   2. its tooltip is width-capped and Ant-positioned, so it points at the button and
//      never clips out of the iframe (the HelpTooltip / SettingRow tooltip behaviour)
//   3. answer choices are OptionRow (correct toggle, counter, optional image, delete)
//   4. the prompt field matches the standard question field (bold label + help line)
//
// SETTINGS-ONLY. `questions` is a v-model the parent owns and persists; image picking
// is emitted as an intent (`@image`) so the slide type runs the host modal.
import { nanoid } from 'nanoid'
import { Button, Collapse, CollapsePanel, Input, Tooltip } from 'ant-design-vue'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { VueDraggable } from 'vue-draggable-plus'
import { TOOLTIP_ARROW, TOOLTIP_OVERLAY_STYLE } from '@/iframe/uiStandard'
import SectionHeader from './SectionHeader.vue'
import OptionRow from './OptionRow.vue'

export interface QuestionChoice {
  id: string
  text: string
  correct?: boolean
  imageUrl?: string
}
export interface QuestionItem {
  id: string
  prompt: string
  choices: QuestionChoice[]
}
export interface QuestionImageIntent {
  action: 'add' | 'change' | 'edit' | 'remove'
  questionId: string
  choiceId: string
}

const questions = defineModel<QuestionItem[]>({ default: () => [] })

const props = withDefaults(
  defineProps<{
    title?: string
    /** (?) tooltip on the group header. */
    titleHelp?: string
    promptLabel?: string
    /** (?) tooltip on the prompt field — the place for the "audience will answer" note. */
    promptHelp?: string
    promptPlaceholder?: string
    optionsLabel?: string
    optionPlaceholder?: string
    addQuestionLabel?: string
    addOptionLabel?: string
    minQuestions?: number
    maxQuestions?: number
    minChoices?: number
    maxChoices?: number
    /** 'single' = one correct per question (radio); 'multiple' = any; 'none' = no toggle. */
    correctMode?: 'single' | 'multiple' | 'none'
    /** Show the per-choice image control (the full OptionRow). */
    allowImage?: boolean
    /** Drag-to-reorder answer choices via the OptionRow grip. */
    reorderable?: boolean
    /** One panel open at a time. */
    accordion?: boolean
  }>(),
  {
    title: 'Questions',
    promptLabel: 'Question',
    promptPlaceholder: 'Question prompt',
    optionsLabel: 'Options',
    optionPlaceholder: 'Option',
    addQuestionLabel: 'Add question',
    addOptionLabel: 'Add option',
    minQuestions: 1,
    minChoices: 2,
    maxChoices: 6,
    correctMode: 'single',
    allowImage: true,
    reorderable: true,
    accordion: true,
  },
)

const emit = defineEmits<{ (e: 'image', intent: QuestionImageIntent): void }>()

const id = () => nanoid(6)

function updateQuestions(next: QuestionItem[]) {
  questions.value = next
}
function mapQ(qid: string, fn: (q: QuestionItem) => QuestionItem) {
  updateQuestions(questions.value.map((q) => (q.id === qid ? fn(q) : q)))
}

function setPrompt(qid: string, prompt: string) {
  mapQ(qid, (q) => ({ ...q, prompt }))
}
function setChoiceText(qid: string, cid: string, text: string) {
  mapQ(qid, (q) => ({ ...q, choices: q.choices.map((c) => (c.id === cid ? { ...c, text } : c)) }))
}
function setChoiceCorrect(qid: string, cid: string, value: boolean) {
  mapQ(qid, (q) => ({
    ...q,
    choices: q.choices.map((c) => {
      if (props.correctMode === 'single') {
        // radio: the clicked choice becomes the sole correct one; it can't be un-set
        return { ...c, correct: c.id === cid }
      }
      return c.id === cid ? { ...c, correct: value } : c
    }),
  }))
}
function addChoice(qid: string) {
  mapQ(qid, (q) =>
    q.choices.length >= (props.maxChoices ?? Infinity)
      ? q
      : { ...q, choices: [...q.choices, { id: id(), text: '' }] },
  )
}
function removeChoice(qid: string, cid: string) {
  mapQ(qid, (q) => {
    if (q.choices.length <= props.minChoices) return q
    const wasCorrect = q.choices.find((c) => c.id === cid)?.correct
    const choices = q.choices.filter((c) => c.id !== cid)
    // In single-correct mode, deleting the correct choice re-homes correctness to the first.
    if (props.correctMode === 'single' && wasCorrect && choices.length && !choices.some((c) => c.correct)) {
      choices[0] = { ...choices[0]!, correct: true }
    }
    return { ...q, choices }
  })
}
function removeChoiceImage(qid: string, cid: string) {
  mapQ(qid, (q) => ({ ...q, choices: q.choices.map((c) => (c.id === cid ? { ...c, imageUrl: '' } : c)) }))
}
function addQuestion() {
  if (props.maxQuestions != null && questions.value.length >= props.maxQuestions) return
  const choices: QuestionChoice[] = Array.from({ length: props.minChoices }, (_, i) => ({
    id: id(),
    text: '',
    correct: props.correctMode === 'single' && i === 0,
  }))
  updateQuestions([...questions.value, { id: id(), prompt: '', choices }])
}
function removeQuestion(qid: string) {
  if (questions.value.length <= props.minQuestions) return
  updateQuestions(questions.value.filter((q) => q.id !== qid))
}

// Drag-to-reorder — same controlled pattern the slide types use with
// vue-draggable-plus: bind :model-value one-way, recompute the order on @update.
// Correctness is a per-choice boolean, so it travels with the choice — no reindex.
function onChoiceReorder(qid: string, e: { oldIndex?: number; newIndex?: number }) {
  const { oldIndex, newIndex } = e
  if (oldIndex == null || newIndex == null || oldIndex === newIndex) return
  mapQ(qid, (q) => {
    const choices = q.choices.slice()
    const [moved] = choices.splice(oldIndex, 1)
    if (moved) choices.splice(newIndex, 0, moved)
    return { ...q, choices }
  })
}
</script>

<template>
  <div>
    <div class="aha-ql-head">
      <SectionHeader :label="title" :help="titleHelp" />
      <span class="aha-ql-count">
        {{ questions.length }} {{ questions.length === 1 ? 'question' : 'questions' }}
      </span>
    </div>

    <Collapse :accordion="accordion" class="aha-ql-collapse">
      <CollapsePanel
        v-for="(q, qi) in questions"
        :key="q.id"
        :header="`${qi + 1}. ${q.prompt || 'Untitled question'}`"
      >
        <template #extra>
          <!-- FIX 1+2: tertiary (not red) delete; capped, Ant-positioned tooltip that
               points at the button and never clips out of the iframe. -->
          <Tooltip :overlay-style="TOOLTIP_OVERLAY_STYLE" placement="bottomRight" title="Delete" :arrow="TOOLTIP_ARROW">
            <Button
              type="text"
              size="small"
              :disabled="questions.length <= minQuestions"
              :aria-label="`Delete question ${qi + 1}`"
              @click.stop="removeQuestion(q.id)"
            >
              <template #icon><DeleteOutlined /></template>
            </Button>
          </Tooltip>
        </template>

        <!-- FIX 4: prompt field = bold label + (?) tooltip + Input. The "audience
             will answer" note lives in the (?) tooltip, NOT as an inline help line. -->
        <SectionHeader :label="promptLabel" :help="promptHelp" />
        <Input
          :value="q.prompt"
          :placeholder="promptPlaceholder"
          @update:value="(v: string) => setPrompt(q.id, v)"
        />

        <!-- FIX 3: answer choices are the FULL OptionRow (drag grip, correct toggle,
             hover counter, image control, delete), drag-reorderable via the grip. -->
        <SectionHeader :label="optionsLabel" class="aha-ql-answers-hd" />
        <VueDraggable
          :model-value="q.choices"
          :animation="150"
          :disabled="!reorderable"
          handle=".aha-opt-drag"
          ghost-class="aha-ql-ghost"
          class="aha-ql-answers"
          @update="(e) => onChoiceReorder(q.id, e)"
        >
          <OptionRow
            v-for="(choice, ci) in q.choices"
            :key="choice.id"
            :index="ci"
            :text="choice.text"
            :placeholder="optionPlaceholder"
            :draggable="reorderable"
            :allow-correct="correctMode !== 'none'"
            :correct="!!choice.correct"
            :show-image="allowImage"
            :image-url="choice.imageUrl"
            :can-delete="q.choices.length > minChoices"
            @update:text="(v: string) => setChoiceText(q.id, choice.id, v)"
            @update:correct="(v: boolean) => setChoiceCorrect(q.id, choice.id, v)"
            @delete="removeChoice(q.id, choice.id)"
            @add-image="emit('image', { action: 'add', questionId: q.id, choiceId: choice.id })"
            @change-image="emit('image', { action: 'change', questionId: q.id, choiceId: choice.id })"
            @edit-image="emit('image', { action: 'edit', questionId: q.id, choiceId: choice.id })"
            @remove-image="removeChoiceImage(q.id, choice.id)"
          />
        </VueDraggable>
        <!-- Add option = secondary (default) full-width button, matching Add question. -->
        <Button
          v-if="q.choices.length < (maxChoices ?? Infinity)"
          block
          class="aha-ql-add-answer"
          @click="addChoice(q.id)"
        >
          <template #icon><PlusOutlined /></template>
          {{ addOptionLabel }}
        </Button>
      </CollapsePanel>
    </Collapse>

    <Button
      class="aha-ql-add-question"
      block
      :disabled="maxQuestions != null && questions.length >= maxQuestions"
      @click="addQuestion"
    >
      <template #icon><PlusOutlined /></template>
      {{ addQuestionLabel }}
    </Button>
  </div>
</template>

<style scoped>
.aha-ql-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.aha-ql-count {
  font-size: 12px;
  color: #6b6b6b; /* muted count, like the host's "N questions" */
}
.aha-ql-collapse {
  margin-bottom: 12px;
}
.aha-ql-answers-hd {
  margin-top: 16px;
}
/* The floating OptionRow delete sits at the row's top-right corner; give the list a
   little inset so it isn't clipped by the collapse panel body. */
.aha-ql-answers {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
  padding-right: 6px;
}
.aha-ql-add-answer {
  margin-top: 8px; /* full-width via the Button `block` prop */
}
/* sortablejs drag ghost. */
.aha-ql-ghost {
  opacity: 0.5;
}
</style>
