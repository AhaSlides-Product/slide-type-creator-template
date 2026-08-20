#!/usr/bin/env node
// Mechanical lint for slide-type Settings.vue panels.
//
// It enforces the two things the settings-lab / aha-design-settings-judge check but
// that nothing in this repo caught automatically — the exact misses that ship a
// panel which "type-checks and renders" yet does not match the component library:
//
//   1. ROOT PADDING — the root element must use SETTINGS_ROOT_CLASS (from
//      @/iframe/uiStandard), which carries the required `pt-6` top padding. A panel
//      flush against the host chrome reads as broken.
//   2. RIGHT CONTROL — no raw Ant text primitive where the @/iframe/settings library
//      has a dedicated control:
//         <Input>/<a-input>      → CountedInput
//         <Textarea>/<a-textarea>→ CountedTextarea
//      A bare <InputNumber> is only WARNED: a unitless bounded count is a legit
//      pass-through (the test-poll reference uses one), but a number WITH a unit
//      (seconds, characters, points…) must be NumberWithUnit.
//
// Rule of record: .claude/rules/slide-types/settings.md. Run: npm run lint:settings
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const typesDir = join(root, 'src', 'slide-types')

// Hard errors: a raw text primitive that always has a dedicated library control.
const BANNED = [
  { re: /<Input\b(?!Number)/, use: 'CountedInput' },
  { re: /<a-input\b(?!-number)/, use: 'CountedInput' },
  { re: /<Textarea\b/, use: 'CountedTextarea' },
  { re: /<a-textarea\b/, use: 'CountedTextarea' },
]
// Soft warnings: only wrong when the number carries a unit.
const WARN = [
  { re: /<InputNumber\b/, use: 'NumberWithUnit (if this number has a unit)' },
  { re: /<a-input-number\b/, use: 'NumberWithUnit (if this number has a unit)' },
]

let errors = 0
let warnings = 0

const files = readdirSync(typesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => join(typesDir, d.name, 'Settings.vue'))
  .filter((f) => existsSync(f))

if (!files.length) {
  console.log('lint:settings — no Settings.vue files found; nothing to check.')
  process.exit(0)
}

for (const file of files) {
  const src = readFileSync(file, 'utf8')
  const rel = file.slice(root.length + 1)

  // 1. Root padding — the panel root must carry SETTINGS_ROOT_CLASS.
  if (!src.includes('SETTINGS_ROOT_CLASS')) {
    console.error(`ERROR  ${rel}\n       root element must use :class="SETTINGS_ROOT_CLASS" (from @/iframe/uiStandard) — it carries the required pt-6 top padding.`)
    errors++
  }

  // 2. Right control — scan the <template> block only, so script imports/comments
  //    that merely name a primitive don't trip the check.
  const tplStart = src.indexOf('<template')
  const template = tplStart === -1 ? '' : src.slice(tplStart)
  const lineAt = (idx) => src.slice(0, tplStart + idx).split('\n').length

  for (const { re, use } of BANNED) {
    const m = re.exec(template)
    if (m) {
      console.error(`ERROR  ${rel}:${lineAt(m.index)}\n       raw ${m[0]}…> — use ${use} from @/iframe/settings instead (matches the settings-lab component library).`)
      errors++
    }
  }
  for (const { re, use } of WARN) {
    const m = re.exec(template)
    if (m) {
      console.warn(`WARN   ${rel}:${lineAt(m.index)}\n       ${m[0]}…> — prefer ${use}.`)
      warnings++
    }
  }
}

const summary = `lint:settings — ${files.length} panel(s), ${errors} error(s), ${warnings} warning(s).`
if (errors) {
  console.error(`\n${summary}`)
  process.exit(1)
}
console.log(`\n${summary}`)
