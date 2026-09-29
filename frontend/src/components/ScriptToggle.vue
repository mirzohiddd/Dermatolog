<script setup>
import { SCRIPTS, script, setScript } from '../i18n/script.js';
</script>

<template>
  <div
    class="relative inline-grid shrink-0 grid-cols-2 rounded-lg border border-line bg-cloud p-0.5"
    role="radiogroup"
    aria-label="Yozuv / Ёзув"
  >
    <span
      class="absolute top-0.5 bottom-0.5 left-0.5 w-[calc(50%-2px)] rounded-md bg-paper shadow-[0_1px_3px_rgb(23_23_23/0.12)] transition-transform duration-300 ease-[var(--ease-out-soft)]"
      :class="script === SCRIPTS[1].key ? 'translate-x-full' : 'translate-x-0'"
      aria-hidden="true"
    />
    <button
      v-for="s in SCRIPTS"
      :key="s.key"
      type="button"
      role="radio"
      :aria-checked="script === s.key"
      class="relative z-10 h-8 min-w-[64px] rounded-md px-2.5 text-[13px] font-medium transition-colors duration-200"
      :class="script === s.key ? 'text-ink' : 'text-stone hover:text-graphite'"
      @click="setScript(s.key)"
    >
      {{ s.label }}
    </button>
  </div>
</template>