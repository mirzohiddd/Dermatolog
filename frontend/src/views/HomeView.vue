<script setup>
import { onMounted, ref } from 'vue';
import AccessNotice from '../components/AccessNotice.vue';
import BrandLogo from '../components/BrandLogo.vue';
import CalculatorCard from '../components/CalculatorCard.vue';
import DoctorCard from '../components/DoctorCard.vue';
import HexSpinner from '../components/HexSpinner.vue';
import { accessDeniedStatus, endpoints, errorMessage } from '../services/api.js';
import { getInitData, isInsideTelegram } from '../services/telegram.js';
import { t } from '../i18n/script.js';

/**
 * Kirish holati:
 *  checking        — backend tekshirmoqda
 *  approved        — kalkulyator ko‘rsatiladi
 *  pending         — admin ruxsatini kutish
 *  rejected        — ruxsat berilmagan
 *  unauthenticated — Telegramdan tashqarida / imzo noto‘g‘ri
 *  error           — server bilan aloqa yo‘q
 *
 * MUHIM: bu faqat interfeys. Asosiy himoya backendda — har bir hisoblash
 * so‘rovida Telegram imzosi va foydalanuvchi statusi qayta tekshiriladi.
 */
const access = ref('checking');
const accessError = ref('');
const rechecking = ref(false);

async function checkAccess() {
  if (!isInsideTelegram()) {
    access.value = 'unauthenticated';
    return;
  }
  try {
    const { data } = await endpoints.checkAccess(getInitData());
    access.value = data?.allowed && data.status === 'approved' ? 'approved' : 'pending';
  } catch (error) {
    const denied = accessDeniedStatus(error);
    if (denied) {
      access.value = denied;
    } else {
      access.value = 'error';
      accessError.value = errorMessage(error);
    }
  }
}

async function recheck() {
  rechecking.value = true;
  await checkAccess();
  rechecking.value = false;
}

/** Kalkulyator ishlayotganda admin ruxsatni bekor qilsa — darhol yopamiz. */
function onAccessDenied(status) {
  access.value = status || 'pending';
}

onMounted(checkAccess);
</script>

<template>
  <div class="min-h-dvh overflow-x-clip bg-paper">
    <header class="flex justify-center px-5 pt-8 pb-6 sm:pt-12 sm:pb-10">
      <BrandLogo class="anim-logo" size-class="h-28 sm:h-36" />
    </header>

    <main class="mx-auto w-full max-w-[1120px] px-4 pb-16 sm:px-6 lg:px-8">
      <div v-if="access === 'checking'" class="flex flex-col items-center justify-center gap-3 py-16 text-stone" role="status" aria-live="polite">
        <HexSpinner :size="28" class="text-graphite" />
        <p class="text-[15px]">{{ t('Ruxsat tekshirilmoqda...') }}</p>
      </div>

      <div
        v-else-if="access === 'approved'"
        class="grid grid-cols-1 items-start gap-12 md:grid-cols-2 md:gap-8 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:gap-14"
      >
        <div class="anim-left min-w-0">
          <CalculatorCard @access-denied="onAccessDenied" />
        </div>
        <aside class="anim-right min-w-0 md:sticky md:top-8" :aria-label="t('Nutritsiolog')">
          <DoctorCard />
        </aside>
      </div>

      <AccessNotice v-else :status="access" :message="accessError" :loading="rechecking" @retry="recheck" />
    </main>

    <footer class="border-t border-line py-6 text-center text-[13px] text-mist">
      © {{ new Date().getFullYear() }} {{ t('Komoliddin Kozimxonovich') }}
    </footer>
  </div>
</template>
