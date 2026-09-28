<script setup>
defineProps({
  id: { type: String, required: true },
  label: { type: String, required: true },
  error: { type: String, default: '' },
  hint: { type: String, default: '' },
});
</script>

<template>
  <div class="group min-w-0">
    <label
      :for="id"
      class="mb-2 block text-[15px] font-medium text-graphite transition-colors duration-200 group-focus-within:text-gold-ink"
    >
      {{ label }}
    </label>
    <slot />
    <Transition name="fade" mode="out-in">
      <p v-if="error" :id="`${id}-error`" :key="error" class="mt-1.5 text-[13px] leading-snug text-danger" role="alert">
        {{ error }}
      </p>
      <p v-else-if="hint" :id="`${id}-hint`" class="mt-1.5 text-[13px] leading-snug text-stone">{{ hint }}</p>
    </Transition>
  </div>
</template>
