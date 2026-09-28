<script setup>
import { computed } from 'vue';
import AnimatedNumber from './AnimatedNumber.vue';

const props = defineProps({
  result: { type: Object, required: true },
  notice: { type: String, default: '' },
});

const metrics = computed(() => [
  { key: 'bmr', label: 'BMR', value: props.result.bmr, unit: 'kcal', note: 'Tinch holatdagi sarf' },
  { key: 'tdee', label: 'TDEE', value: props.result.tdee, unit: 'kcal', note: 'Faollik bilan sarf' },
  { key: 'bmi', label: 'BMI', value: props.result.bmi, decimals: 1, note: props.result.bmiCategory.label, highlight: true },
]);

const macros = computed(() => {
  const r = props.result;
  const items = [
    { key: 'protein', label: 'Oqsil', grams: r.protein, kcal: r.protein * 4, color: 'bg-graphite' },
    { key: 'fat', label: 'Yog‘', grams: r.fat, kcal: r.fat * 9, color: 'bg-gold' },
    { key: 'carbs', label: 'Uglevod', grams: r.carbs, kcal: r.carbs * 4, color: 'bg-gold-soft' },
  ];
  const total = items.reduce((s, m) => s + m.kcal, 0) || 1;
  return items.map((m) => ({ ...m, share: Math.round((m.kcal / total) * 100) }));
});

const bmiTone = computed(() =>
  props.result.bmiCategory.key === 'normal' ? 'text-gold-ink' : 'text-graphite',
);
</script>

<template>
  <div class="space-y-4">
    <!-- Asosiy natija -->
    <div class="anim-rise rounded-2xl border border-gold-soft/60 bg-gold-wash px-5 py-5 sm:px-6">
      <p class="text-[15px] font-medium text-gold-ink">Kunlik kaloriya</p>
      <p class="mt-1 flex items-baseline gap-2">
        <AnimatedNumber :value="result.targetCalories" class="text-[44px] leading-none font-semibold text-ink sm:text-[52px]" />
        <span class="text-lg font-medium text-gold-ink">kcal</span>
      </p>
      <p class="mt-2 text-sm text-stone">Maqsad: {{ result.goalLabel }}, faollik: {{ result.activityLabel.toLowerCase() }}</p>
    </div>

    <!-- BMR / TDEE / BMI -->
    <dl class="grid grid-cols-3 gap-2 @md:gap-3">
      <div
        v-for="(m, i) in metrics"
        :key="m.key"
        class="anim-rise min-w-0 rounded-2xl border border-line px-3 py-3.5 @md:px-4"
        :style="{ animationDelay: `${80 + i * 70}ms` }"
      >
        <dt class="text-[13px] font-medium text-stone">{{ m.label }}</dt>
        <dd class="mt-1">
          <span class="text-[19px] leading-none font-semibold whitespace-nowrap text-ink @md:text-[26px]">
            <AnimatedNumber :value="m.value" :decimals="m.decimals || 0" />
          </span>
          <span v-if="m.unit" class="block text-xs text-stone @md:ml-1 @md:inline">{{ m.unit }}</span>
          <span v-else class="block text-xs text-transparent select-none @md:hidden" aria-hidden="true">.</span>
        </dd>
        <dd class="mt-1.5 text-[12px] leading-snug @md:truncate" :class="m.highlight ? bmiTone + ' font-medium' : 'text-mist'" :title="m.note">
          {{ m.note }}
        </dd>
      </div>
    </dl>

    <!-- Oqsil / Yog‘ / Uglevod -->
    <div class="anim-rise rounded-2xl border border-line px-4 py-4 sm:px-5" style="animation-delay: 300ms">
      <p class="mb-3 text-[15px] font-medium text-graphite">Oqsil, yog‘ va uglevod (taxminiy)</p>
      <div class="mb-4 flex h-2 overflow-hidden rounded-full bg-cloud" aria-hidden="true">
        <span
          v-for="m in macros"
          :key="m.key"
          :class="m.color"
          class="h-full transition-[width] duration-700 ease-[var(--ease-out-soft)]"
          :style="{ width: `${m.share}%` }"
        />
      </div>
      <ul class="grid grid-cols-3 gap-2">
        <li v-for="m in macros" :key="m.key" class="min-w-0">
          <span class="flex items-center gap-1.5 text-[13px] text-stone">
            <span :class="m.color" class="size-2 shrink-0 rounded-full" aria-hidden="true" />
            {{ m.label }}
          </span>
          <span class="mt-0.5 block text-[22px] leading-tight font-semibold text-ink">
            <AnimatedNumber :value="m.grams" /><span class="ml-0.5 text-sm font-medium text-stone">g</span>
          </span>
          <span class="num text-[12px] text-mist">{{ m.share }}% kaloriya</span>
        </li>
      </ul>
    </div>

    <div
      v-if="result.warning"
      class="anim-rise flex gap-3 rounded-2xl border border-gold/40 bg-gold-wash px-4 py-3.5 text-sm leading-relaxed text-graphite"
      style="animation-delay: 380ms"
      role="note"
    >
      <svg class="mt-0.5 size-5 shrink-0 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <path d="M12 3 2.5 20h19L12 3Z" stroke-linejoin="round" /><path d="M12 10v4.5M12 17.2v.3" stroke-linecap="round" />
      </svg>
      <p><span class="font-semibold">Diqqat:</span> {{ result.warning }}</p>
    </div>

    <p v-if="notice" class="text-[13px] text-stone">{{ notice }}</p>
  </div>
</template>
