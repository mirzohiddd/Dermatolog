<script setup>
import { computed } from 'vue';

const props = defineProps({
  page: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  total: { type: Number, required: true },
  limit: { type: Number, required: true },
});
const emit = defineEmits(['change']);

/** 1 … 4 5 6 … 20 ko‘rinishidagi sahifa raqamlari */
const pages = computed(() => {
  const { page, totalPages } = props;
  const set = new Set([1, totalPages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= totalPages));
  const sorted = [...set].sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i && p - sorted[i - 1] > 1) out.push(null);
    out.push(p);
  });
  return out;
});

const range = computed(() => {
  if (!props.total) return '0';
  const from = (props.page - 1) * props.limit + 1;
  return `${from}–${Math.min(props.page * props.limit, props.total)}`;
});

function go(p) {
  if (p >= 1 && p <= props.totalPages && p !== props.page) emit('change', p);
}
</script>

<template>
  <nav class="flex flex-col items-center justify-between gap-3 sm:flex-row" aria-label="Sahifalar">
    <p class="num text-sm text-stone">{{ range }} / {{ total }}</p>
    <div v-if="totalPages > 1" class="flex items-center gap-1.5">
      <button type="button" class="btn-quiet px-3" :disabled="page <= 1" aria-label="Oldingi sahifa" @click="go(page - 1)">‹</button>
      <template v-for="(p, i) in pages" :key="i">
        <span v-if="p === null" class="px-1 text-mist">…</span>
        <button
          v-else
          type="button"
          class="num h-10 min-w-10 rounded-lg px-3 text-sm font-medium transition-colors"
          :class="p === page ? 'bg-graphite text-paper' : 'text-graphite hover:bg-gold-wash'"
          :aria-current="p === page ? 'page' : undefined"
          @click="go(p)"
        >
          {{ p }}
        </button>
      </template>
      <button type="button" class="btn-quiet px-3" :disabled="page >= totalPages" aria-label="Keyingi sahifa" @click="go(page + 1)">›</button>
    </div>
  </nav>
</template>
