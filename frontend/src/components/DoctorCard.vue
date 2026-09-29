<script setup>
import { ref } from 'vue';
import { brand } from '../config/brand.js';
import { doctorUrl } from '../utils/assets.js';
import { t } from '../i18n/script.js';

const loaded = ref(false);
const failed = ref(false);
</script>

<template>
  <figure class="relative mx-auto w-full max-w-[460px] lg:max-w-none">
    <div class="relative z-10 overflow-hidden rounded-[28px] bg-graphite shadow-card">
      <div class="aspect-[4/5]">
        <template v-if="doctorUrl && !failed">
          <div v-if="!loaded" class="skeleton absolute inset-0" aria-hidden="true" />
          <img
            :src="doctorUrl"
            :alt="t(`${brand.name} — ${brand.role.toLowerCase()}`)"
            class="h-full w-full object-cover object-[50%_30%] transition-opacity duration-700"
            :class="loaded ? 'opacity-100' : 'opacity-0'"
            width="820"
            height="820"
            decoding="async"
            @load="loaded = true"
            @error="failed = true"
          />
        </template>
        <!-- doctor.png yo‘q bo‘lsa: neytral zaxira -->
        <div v-else class="flex h-full w-full items-center justify-center bg-cloud" role="img" :aria-label="t(brand.name)">
          <svg class="w-1/3 text-line" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="12" cy="8" r="4.2" />
            <path d="M3.5 21c.6-4.4 4.1-7.2 8.5-7.2s7.9 2.8 8.5 7.2Z" />
          </svg>
        </div>
      </div>
    </div>

    <figcaption class="relative z-10 mt-5 border-l-2 border-gold pl-4">
      <p class="text-[22px] leading-tight font-semibold text-ink">{{ t(brand.name) }}</p>
      <p class="mt-0.5 text-[15px] text-gold-ink">{{ t(brand.role) }}</p>
      <p class="mt-3 max-w-[42ch] text-sm leading-relaxed text-stone">{{ t(brand.doctorNote) }}</p>
    </figcaption>
  </figure>
</template>