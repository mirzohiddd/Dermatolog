import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backend = env.VITE_DEV_BACKEND || 'http://localhost:5000';

  return {
    plugins: [vue(), tailwindcss()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: {
      port: 5173,
      host: true, // telefoningizdan Wi-Fi orqali ochish uchun
      // Telegramda sinash uchun tunnel (ngrok / cloudflared) manzillariga ruxsat
      allowedHosts: ['.ngrok-free.app', '.ngrok.app', '.trycloudflare.com'],
      proxy: {
        // Lokal ishda /api so‘rovlari backendga yo‘naltiriladi
        '/api': { target: backend, changeOrigin: true },
      },
    },
    build: {
      target: 'es2020',
      chunkSizeWarningLimit: 600,
    },
  };
});
