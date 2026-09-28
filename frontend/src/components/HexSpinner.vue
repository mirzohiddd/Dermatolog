<script setup>
defineProps({ size: { type: Number, default: 20 } });
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    class="shrink-0 animate-[spin-hex_1.1s_linear_infinite]"
    aria-hidden="true"
  >
    <path d="M12 2.5 20.2 7.25v9.5L12 21.5 3.8 16.75v-9.5Z" stroke="currentColor" stroke-opacity=".25" stroke-width="2" stroke-linejoin="round" />
    <path d="M12 2.5 20.2 7.25v9.5" stroke="var(--color-gold-soft)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</template>
