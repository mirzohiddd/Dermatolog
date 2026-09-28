<script setup>
import AnimatedNumber from '../AnimatedNumber.vue';

defineProps({
  label: { type: String, required: true },
  value: { type: Number, default: null },
  loading: { type: Boolean, default: false },
  accent: { type: Boolean, default: false },
});
</script>

<template>
  <div class="rounded-2xl border bg-paper px-5 py-4" :class="accent ? 'border-gold-soft/70' : 'border-line'">
    <p class="text-sm text-stone">{{ label }}</p>
    <div v-if="loading || value === null" class="skeleton mt-2 h-9 w-20 rounded-lg" aria-hidden="true" />
    <p v-else class="mt-1 text-[32px] leading-tight font-semibold" :class="accent ? 'text-gold-ink' : 'text-ink'">
      <AnimatedNumber :value="value" :duration="600" />
    </p>
  </div>
</template>
