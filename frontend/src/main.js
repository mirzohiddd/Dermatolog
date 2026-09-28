import { createApp } from 'vue';
import App from './App.vue';
import router from './router/index.js';
import { initTelegram } from './services/telegram.js';
import './style.css';

initTelegram();

createApp(App).use(router).mount('#app');

// Oflayn rejim (PWA) — faqat production build'da
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
