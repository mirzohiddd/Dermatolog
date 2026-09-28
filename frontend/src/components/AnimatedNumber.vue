<script setup>
import { onBeforeUnmount, ref, watch } from 'vue';
import { formatNumber } from '../utils/format.js';

const props = defineProps({
  value: { type: Number, required: true },
  decimals: { type: Number, default: 0 },
  duration: { type: Number, default: 800 },
});

const display = ref(props.value);
let frame = 0;

function animate(from, to) {
  cancelAnimationFrame(frame);
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduce || from === to) {
    display.value = to;
    return;
  }
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / props.duration);
    const eased = 1 - (1 - t) ** 3;
    display.value = from + (to - from) * eased;
    if (t < 1) frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
}

watch(
  () => props.value,
  (to, from) => animate(from ?? 0, to),
);
animate(0, props.value);
onBeforeUnmount(() => cancelAnimationFrame(frame));
</script>

<template>
  <span class="num">{{ formatNumber(display, decimals) }}</span>
</template>
