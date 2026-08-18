import { createApp } from 'vue'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import './style.css'
import App from './App.vue'
import router from './router'

// Token-free skeleton: the private @aha/* SDK (zoid host bridge, sync, submissions)
// is intentionally not imported here. When you have registry access, add the SDK
// deps back and initialise PresenterSlidePluginIframe / AudienceSlidePluginIframe
// + emitActionPlugin (see the sample-slide template).
const app = createApp(App)
app.use(router)
app.use(Antd)
app.mount('#app')
