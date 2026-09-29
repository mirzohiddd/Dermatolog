<script setup>
import { onMounted } from 'vue';
import BrandLogo from '../components/BrandLogo.vue';
import CalculatorCard from '../components/CalculatorCard.vue';
import DoctorCard from '../components/DoctorCard.vue';
import { endpoints } from '../services/api.js';
import { getInitData, isInsideTelegram } from '../services/telegram.js';
import { t } from '../i18n/script.js';

onMounted(() => {
  // Telegram ichida ochilgan bo‘lsa — foydalanuvchini ro‘yxatga olamiz / faolligini yangilaymiz
  if (isInsideTelegram()) endpoints.registerUser(getInitData()).catch(() => {});
});
</script>

<template>
  <div class="min-h-dvh overflow-x-clip bg-paper">
    <header class="flex justify-center px-5 pt-8 pb-6 sm:pt-12 sm:pb-10">
      <BrandLogo class="anim-logo" size-class="h-28 sm:h-36" />
    </header>

    <main class="mx-auto w-full max-w-[1120px] px-4 pb-16 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 items-start gap-12 md:grid-cols-2 md:gap-8 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:gap-14">
        <div class="anim-left min-w-0">
          <CalculatorCard />
        </div>
        <aside class="anim-right min-w-0 md:sticky md:top-8" :aria-label="t('Nutritsiolog')">
          <DoctorCard />
        </aside>
      </div>
    </main>

    <footer class="border-t border-line py-6 text-center text-[13px] text-mist">
      © {{ new Date().getFullYear() }} {{ t('Komoliddin Kozimxonovich') }}
    </footer>
  </div>
</template>