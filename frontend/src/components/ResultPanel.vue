<script setup>
import { computed } from 'vue';
import AnimatedNumber from './AnimatedNumber.vue';
import { t } from '../i18n/script.js';
import { BMI_SCALE, bmiCategory } from '../utils/calculator.js';

const props = defineProps({
  result: { type: Object, required: true },
  notice: { type: String, default: '' },
});

/**
 * Rang sxemalari. Tailwind klasslari to‘liq yozilgan bo‘lishi shart
 * (aks holda build paytida CSS ga tushmay qoladi).
 */
const TONES = {
  green: {
    card: 'border-green-200 bg-green-50',
    text: 'text-green-700',
    dot: 'bg-green-500',
  },
  yellow: {
    card: 'border-amber-200 bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-400',
  },
  red: {
    card: 'border-red-200 bg-red-50',
    text: 'text-red-700',
    dot: 'bg-red-500',
  },
};

// Toifani ekranda ko‘rsatilgan (yaxlitlangan) BMI bo‘yicha aniqlaymiz —
// raqam va rang doim bir-biriga mos keladi.
const bmi = computed(() => bmiCategory(props.result.bmi));
const bmiTone = computed(() => TONES[bmi.value.tone]);

const metrics = computed(() => [
  { key: 'bmr', label: t('Ba‘zaviy ehtiyoj'), value: props.result.bmr, unit: t('kcal'), note: t('Tinch holatdagi sarf') },
  { key: 'tdee', label: t('Jismoniy harakat sarfi'), value: props.result.tdee, unit: t('kcal'), note: t('Faollik bilan sarf') },
  { key: 'bmi', label: t('Tana vazni indeksi'), value: props.result.bmi, decimals: 1, note: t(bmi.value.label), highlight: true },
]);

// Shkaladan faqat foydalanuvchining natijasi tushgan bitta qator
const activeRow = computed(() => BMI_SCALE.find((c) => c.key === bmi.value.key));

const macros = computed(() => {
  const r = props.result;
  const items = [
    { key: 'protein', label: t('Oqsil'), grams: r.protein, kcal: r.protein * 4, color: 'bg-graphite' },
    { key: 'fat', label: t('Yog‘'), grams: r.fat, kcal: r.fat * 9, color: 'bg-gold' },
    { key: 'carbs', label: t('Uglevod'), grams: r.carbs, kcal: r.carbs * 4, color: 'bg-gold-soft' },
  ];
  const total = items.reduce((s, m) => s + m.kcal, 0) || 1;
  return items.map((m) => ({ ...m, share: Math.round((m.kcal / total) * 100) }));
});
</script>

<template>
  <div class="space-y-4">
    <!-- Asosiy natija -->
    <div class="anim-rise rounded-2xl border border-gold-soft/60 bg-gold-wash px-5 py-5 sm:px-6">
      <p class="text-[15px] font-medium text-gold-ink">{{ t('Kunlik kaloriya') }}</p>
      <p class="mt-1 flex items-baseline gap-2">
        <AnimatedNumber :value="result.targetCalories" class="text-[44px] leading-none font-semibold text-ink sm:text-[52px]" />
        <span class="text-lg font-medium text-gold-ink">{{ t('kcal') }}</span>
      </p>
      <p class="mt-2 text-sm text-stone">{{ t(`Maqsad: ${result.goalLabel}, faollik: ${result.activityLabel.toLowerCase()}`) }}</p>
    </div>

    <!-- Ba‘zaviy ehtiyoj / Jismoniy harakat sarfi / Tana vazni indeksi -->
    <dl class="grid grid-cols-3 gap-2 @md:gap-3">
      <div
        v-for="(m, i) in metrics"
        :key="m.key"
        class="anim-rise min-w-0 rounded-2xl border px-3 py-3.5 transition-colors duration-500 @md:px-4"
        :class="m.highlight ? bmiTone.card : 'border-line'"
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
        <dd
          v-if="m.highlight"
          class="mt-1.5 flex items-start gap-1.5 text-[12px] leading-snug font-semibold"
          :class="bmiTone.text"
        >
          <span class="mt-[3px] size-2 shrink-0 rounded-full" :class="bmiTone.dot" aria-hidden="true" />
          <span class="min-w-0 [overflow-wrap:anywhere]">{{ m.note }}</span>
        </dd>
        <dd v-else class="mt-1.5 text-[12px] leading-snug text-mist @md:truncate" :title="m.note">
          {{ m.note }}
        </dd>
      </div>
    </dl>

    <!-- Tana vazni indeksi: faqat natija tushgan bitta qator, o‘z rangida -->
    <div
      v-if="activeRow"
      class="anim-rise flex items-start gap-2.5 rounded-2xl border px-4 py-3.5 text-[14px] leading-snug transition-colors duration-500 sm:px-5"
      :class="[bmiTone.card, bmiTone.text]"
      style="animation-delay: 260ms"
    >
      <span class="mt-[5px] size-2.5 shrink-0 rounded-full" :class="bmiTone.dot" aria-hidden="true" />
      <span class="min-w-0 flex-1">
        <span class="num font-semibold">{{ t(activeRow.range) }}</span>
        — {{ t(activeRow.label) }}
      </span>
      <span class="num shrink-0 rounded-md bg-paper px-1.5 py-0.5 text-[12px] font-semibold">
        {{ result.bmi.toFixed(1) }}
      </span>
    </div>

    <!-- Oqsil / Yog‘ / Uglevod -->
    <div class="anim-rise rounded-2xl border border-line px-4 py-4 sm:px-5" style="animation-delay: 340ms">
      <p class="mb-3 text-[15px] font-medium text-graphite">{{ t('Oqsil, yog‘ va uglevod (taxminiy)') }}</p>
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
            <AnimatedNumber :value="m.grams" /><span class="ml-0.5 text-sm font-medium text-stone">{{ t('g') }}</span>
          </span>
          <span class="num text-[12px] text-mist">{{ m.share }}% {{ t('kaloriya') }}</span>
        </li>
      </ul>
    </div>

    <div
      v-if="result.warning"
      class="anim-rise flex gap-3 rounded-2xl border border-gold/40 bg-gold-wash px-4 py-3.5 text-sm leading-relaxed text-graphite"
      style="animation-delay: 420ms"
      role="note"
    >
      <svg class="mt-0.5 size-5 shrink-0 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <path d="M12 3 2.5 20h19L12 3Z" stroke-linejoin="round" /><path d="M12 10v4.5M12 17.2v.3" stroke-linecap="round" />
      </svg>
      <p><span class="font-semibold">{{ t('Diqqat:') }}</span> {{ t(result.warning) }}</p>
    </div>

    <p v-if="notice" class="text-[13px] text-stone">{{ t(notice) }}</p>
  </div>
</template>