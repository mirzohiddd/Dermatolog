<script setup>
import { logoUrl } from '../utils/assets.js';
import { brand } from '../config/brand.js';

defineProps({
  /** Tailwind balandlik klasslari, masalan "h-24 sm:h-32" */
  sizeClass: { type: String, default: 'h-24' },
});
</script>

<template>
  <img v-if="logoUrl" :src="logoUrl" :alt="brand.name" :class="[sizeClass, 'w-auto select-none']" draggable="false" />
  <!-- logo.png yo‘q bo‘lsa: matnli zaxira -->
  <div v-else :class="[sizeClass, 'flex flex-col items-center justify-center text-center']" role="img" :aria-label="brand.name">
    <span class="text-2xl font-semibold tracking-[0.18em] text-graphite">KOMOLIDDIN</span>
    <span class="text-sm tracking-[0.3em] text-gold">KOZIMXONOVICH</span>
  </div>
</template>
