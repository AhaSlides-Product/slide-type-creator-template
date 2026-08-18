// Settings component library — composed, reusable controls for a slide type's
// Settings.vue panel. Import from '@/iframe/settings'.
//
// These are COMPOSITIONS over the themed Ant primitives (and a couple of shapes Ant
// has no built-in for), NOT replacements for them: a plain <Input> / <Switch> /
// <Select> already carries the AhaSlides storybook look from antTheme.ts, so use
// those directly. Reach for a component here when you need the composed LAYOUT
// (SettingRow, SectionHeader), a specific repeatable pattern (OptionRow), or a shape
// Ant lacks (CardSelect). Everything stays production-portable — pure Vue + Ant, no
// cross-slide-type imports — the same rule as the rest of @/iframe/*.
//
// Governance: a component earns a place here only if it composes primitives or
// enforces a guardrail. Plain pass-throughs (Segmented, RadioGroup) stay documented
// conventions, not wrappers — use <a-segmented> and <RadioGroup button-style> (the
// dot <a-radio> is themed via storybook-overrides.css GAP 7).

export { default as HelpTooltip } from './HelpTooltip.vue'
export { default as SectionHeader } from './SectionHeader.vue'
export { default as SettingRow } from './SettingRow.vue'
export { default as SubSettingGroup } from './SubSettingGroup.vue'
export { default as ModeField } from './ModeField.vue'
export { default as ImageDropzone } from './ImageDropzone.vue'
export { default as OptionRow } from './OptionRow.vue'
export { default as ImageActionButton } from './ImageActionButton.vue'
export { default as CountedInput } from './CountedInput.vue'
export { default as CountedTextarea } from './CountedTextarea.vue'
export { default as CardSelect } from './CardSelect.vue'
export { default as NumberWithUnit } from './NumberWithUnit.vue'
export { default as DropdownMenu } from './DropdownMenu.vue'
export { default as InfoBox } from './InfoBox.vue'
export { default as QuestionList } from './QuestionList.vue'
export { default as NumberedItem } from './NumberedItem.vue'
export { numberedItemLabel } from './numberedItemLabel'
export type { QuestionItem, QuestionChoice, QuestionImageIntent } from './QuestionList.vue'
export type { DropdownMenuItem } from './DropdownMenu.vue'
