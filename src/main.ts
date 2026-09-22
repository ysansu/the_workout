import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useUserStore } from './stores/user'
import './styles/global.css'

const pinia = createPinia()
const app = createApp(App)
app.use(pinia)
app.use(router)

// 挂载前先把主题写到 <html data-theme>，避免首帧白闪
useUserStore(pinia)

app.mount('#app')
