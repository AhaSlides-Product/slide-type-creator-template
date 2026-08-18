import { createRouter, createWebHistory } from 'vue-router'
import SurfaceHost from '@/SurfaceHost.vue'

// The three host surfaces the AhaSlides host mounts in iframes, keyed by slide
// type. The host loads `<base>/<type>/<role>` and passes the slide id + data via
// zoid xprops, so `:slideId` is optional (present only for direct/dev links).
// SurfaceHost resolves `:type` to src/slide-types/<type>/<role>.vue, so adding a
// slide-type folder needs no router change.
const routes = [
  { path: '/', redirect: `/${import.meta.env.VITE_AHA_DEFAULT_SLIDE ?? 'demo'}/canvas` },
  { path: '/:type/canvas/:slideId?', name: 'Canvas', component: SurfaceHost, props: { role: 'Canvas' } },
  { path: '/:type/settings/:slideId?', name: 'Settings', component: SurfaceHost, props: { role: 'Settings' } },
  { path: '/:type/audience/:slideId?', name: 'Audience', component: SurfaceHost, props: { role: 'Audience' } },
]

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})
