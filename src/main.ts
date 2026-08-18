import { createApp } from 'vue'
import Antd from 'ant-design-vue'
import '@aha/ui/ahaslides-vars.css' // AhaSlides CSS variables — must import first
import './style.css'
import '@aha/ui/ahaslides-antd-extensions.css'
import App from './App.vue'
import router from './router'
import { PresenterSlidePluginIframe, AudienceSlidePluginIframe, emitActionPlugin } from '@aha/ui'

const app = createApp(App)
app.use(router)
app.use(Antd)
app.use(emitActionPlugin)

// Importing these initialises the zoid host-bridge child components; the host
// (AhaSlides) renders them and injects window.xprops. The checks just log.
if (PresenterSlidePluginIframe) console.log('PresenterSlidePluginIframe initialized')
if (AudienceSlidePluginIframe) console.log('AudienceSlidePluginIframe initialized')

app.mount('#app')
