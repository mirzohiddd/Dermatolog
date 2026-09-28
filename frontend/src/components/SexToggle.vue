<script setup>
import { SEXES } from '../utils/calculator.js';

const model = defineModel({ type: String, required: true });
</script>

<template>
  <fieldset>
    <legend class="mb-2 block text-[15px] font-medium text-graphite">Jins</legend>
    <div class="relative grid grid-cols-2 rounded-xl border border-line bg-cloud p-1">
      <span
        class="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-lg bg-paper shadow-[0_1px_3px_rgb(23_23_23/0.12)] transition-transform duration-300 ease-[var(--ease-out-soft)]"
        :class="model === 'female' ? 'translate-x-full' : 'translate-x-0'"
        aria-hidden="true"
      />
      <label
        v-for="sex in SEXES"
        :key="sex.key"
        class="relative z-10 flex h-10 cursor-pointer items-center justify-center rounded-lg text-[15px] font-medium transition-colors duration-200 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-gold"
        :class="model === sex.key ? 'text-ink' : 'text-stone hover:text-graphite'"
      >
        <input v-model="model" type="radio" name="sex" :value="sex.key" class="sr-only" />
        {{ sex.label }}
      </label>
    </div>
  </fieldset>
</template>
