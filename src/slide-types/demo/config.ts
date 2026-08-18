import { nanoid } from 'nanoid'

// Shared config for the demo slide type — read by Settings (edit) and
// Canvas / Audience (render), synced via useSync and persisted under this key.
export const DEMO_CONFIG_KEY = 'demo-config'

export const MIN_OPTIONS = 2
export const MAX_OPTIONS = 6

export type DemoLayout = 'left' | 'center' | 'card'

export interface DemoOption {
  id: string
  label: string
}

export interface DemoConfig {
  greeting: string
  description: string
  layout: DemoLayout
  showImage: boolean
  imageUrl: string
  collectResponses: boolean
  responseLimit: number
  options: DemoOption[]
}

export const createOption = (label = ''): DemoOption => ({ id: nanoid(6), label })

export const createDefaultDemoConfig = (): DemoConfig => ({
  greeting: 'Welcome!',
  description: '',
  layout: 'center',
  showImage: false,
  imageUrl: '',
  collectResponses: true,
  responseLimit: 1,
  options: [createOption('Yes'), createOption('No')],
})

// Guarantee every field/array exists on a persisted blob before rendering.
export const migrateDemoConfig = (raw: Partial<DemoConfig> | null | undefined): DemoConfig => {
  const base = createDefaultDemoConfig()
  const next = { ...base, ...(raw || {}) }
  next.options = Array.isArray(next.options) && next.options.length ? next.options : base.options
  return next
}
