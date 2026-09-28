<script setup>
import BrandLogo from '../components/BrandLogo.vue';
</script>

<template>
  <main class="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
    <BrandLogo size-class="h-24" class="anim-logo" />
    <h1 class="mt-8 text-2xl font-semibold text-ink">Sahifa topilmadi</h1>
    <p class="mt-2 text-stone">Havola noto‘g‘ri yoki sahifa o‘chirilgan.</p>
    <RouterLink to="/" class="btn-quiet mt-6">Kalkulyatorga qaytish</RouterLink>
  </main>
</template>
