import { createRouter, createWebHistory } from 'vue-router'
import Canvas from '@/pages/Canvas.vue'
import Settings from '@/pages/Settings.vue'
import Audience from '@/pages/Audience.vue'

// The three host surfaces the AhaSlides host mounts in iframes, keyed by
// slide type + id. Same route shape as the sample-slide / every plugin.
const routes = [
  { path: '/', redirect: `/canvas/${import.meta.env.VITE_AHA_DEFAULT_SLIDE ?? 'demo'}` },
  { path: '/:type/canvas/:slideId', name: 'Canvas', component: Canvas },
  { path: '/:type/settings/:slideId', name: 'Settings', component: Settings },
  { path: '/:type/audience/:slideId', name: 'Audience', component: Audience },
]

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})
