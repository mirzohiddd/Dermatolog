<script setup>
import { computed } from 'vue';
import { t } from '../i18n/script.js';
import { closeWebApp, isInsideTelegram } from '../services/telegram.js';
import HexSpinner from './HexSpinner.vue';

const props = defineProps({
  /** 'pending' | 'rejected' | 'unauthenticated' | 'error' */
  status: { type: String, required: true },
  message: { type: String, default: '' },
  loading: { type: Boolean, default: false },
});

defineEmits(['retry']);

const botUsername = (import.meta.env.VITE_BOT_USERNAME || '').replace(/^@/, '').trim();
const botUrl = botUsername && /^[A-Za-z0-9_]{3,64}$/.test(botUsername) ? `https://t.me/${botUsername}` : '';
const insideTelegram = isInsideTelegram();

const content = computed(() => {
  switch (props.status) {
    case 'pending':
      return {
        icon: '⏳',
        title: 'Admin ruxsatini kuting',
        text: 'So‘rovingiz adminga yuborilgan. Ruxsat berilishi bilan Telegram bot orqali xabar olasiz va kalkulyator ochiladi.',
        retry: true,
      };
    case 'rejected':
      return {
        icon: '⛔',
        title: 'Sizga ruxsat berilmagan',
        text: 'Afsuski, kalkulyatordan foydalanishga ruxsat berilmadi.',
        retry: false,
      };
    case 'unauthenticated':
      return {
        icon: '🔒',
        title: 'Kalkulyator faqat Telegram bot orqali ochiladi',
        text: 'Telegram botga kiring. Admin ruxsat bergandan keyin “KALKULYATORNI OCHISH” tugmasi orqali kalkulyatorni oching.',
        retry: false,
      };
    default:
      return {
        icon: '⚠️',
        title: 'Serverga ulanib bo‘lmadi',
        text: props.message || 'Internet aloqasini tekshirib, qayta urinib ko‘ring.',
        retry: true,
      };
  }
});
</script>

<template>
  <section class="card anim-rise mx-auto w-full max-w-[520px] p-6 text-center sm:p-9" role="status" aria-live="polite">
    <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold-wash text-[30px]" aria-hidden="true">
      {{ content.icon }}
    </div>
    <h1 class="mt-5 text-[24px] leading-tight font-semibold text-ink sm:text-[28px]">{{ t(content.title) }}</h1>
    <p class="mx-auto mt-3 max-w-[40ch] text-[16px] leading-relaxed text-stone">{{ t(content.text) }}</p>

    <div class="mt-7 flex flex-col items-center gap-3">
      <button v-if="content.retry" type="button" class="btn-primary" :disabled="loading" :aria-busy="loading" @click="$emit('retry')">
        <HexSpinner v-if="loading" :size="20" />
        <span>{{ t(loading ? 'TEKSHIRILMOQDA' : 'QAYTA TEKSHIRISH') }}</span>
      </button>
      <button v-if="insideTelegram" type="button" class="btn-quiet" @click="closeWebApp">{{ t('Botga qaytish') }}</button>
      <a v-else-if="botUrl" :href="botUrl" class="btn-quiet" target="_blank" rel="noopener">{{ t('Telegram botni ochish') }}</a>
    </div>
  </section>
</template>
