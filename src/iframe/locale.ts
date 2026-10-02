import { computed, watchEffect, type Ref } from 'vue'

export type Locale = 'en' | 'ar'

export const DEFAULT_LOCALE: Locale = 'en'

const RTL_LOCALES: readonly Locale[] = ['ar']

export function normaliseLocale(language: unknown): Locale {
  const base = String(language ?? '').toLowerCase().split(/[-_]/)[0]
  return base === 'ar' ? 'ar' : DEFAULT_LOCALE
}

export function directionOf(locale: Locale): 'ltr' | 'rtl' {
  return RTL_LOCALES.includes(locale) ? 'rtl' : 'ltr'
}

/** Sets `lang` and `dir` on <html> so logical CSS properties and native form controls mirror. */
export function useDocumentDirection(language: Ref<unknown>) {
  const locale = computed(() => normaliseLocale(language.value))
  const direction = computed(() => directionOf(locale.value))
  watchEffect(() => {
    document.documentElement.lang = locale.value
    document.documentElement.dir = direction.value
  })
  return { locale, direction }
}

export interface Labels {
  submit: string
  submitting: string
  answerSubmitted: string
  submitFailed: string
  noOptionLabel: string
}

// Machine-translated (MSA); have a native speaker review before shipping a real slide type.
export const LABELS: Record<Locale, Labels> = {
  en: {
    submit: 'Submit',
    submitting: 'Submitting…',
    answerSubmitted: 'Answer submitted',
    submitFailed: 'Could not submit — tap to try again.',
    noOptionLabel: '—',
  },
  ar: {
    submit: 'إرسال',
    submitting: 'جارٍ الإرسال…',
    answerSubmitted: 'تم إرسال الإجابة',
    submitFailed: 'تعذّر الإرسال — اضغط للمحاولة مرة أخرى.',
    noOptionLabel: '—',
  },
}

export function useLabels(locale: Ref<Locale>) {
  return computed(() => LABELS[locale.value])
}
