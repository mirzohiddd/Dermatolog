<script setup>
import { useRouter } from 'vue-router';
import { clearSession, session } from '../../services/auth.js';

const router = useRouter();

function logout() {
  clearSession();
  router.replace({ name: 'admin-login' });
}
</script>

<template>
  <div class="min-h-dvh bg-cloud">
    <header class="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur">
      <div class="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6">
        <RouterLink to="/admin" class="flex min-w-0 items-center gap-3">
          <img src="/icon-192.png" alt="" class="size-9 shrink-0 rounded-lg" />
          <span class="min-w-0">
            <span class="block truncate text-[15px] font-semibold text-ink">Admin panel</span>
            <span class="block truncate text-xs text-stone">Komoliddin Kozimxonovich</span>
          </span>
        </RouterLink>
        <div class="flex items-center gap-3">
          <span v-if="session.admin" class="hidden text-sm text-stone sm:inline">{{ session.admin.username }}</span>
          <RouterLink to="/" class="btn-quiet hidden sm:inline-flex" target="_blank">Saytni ochish</RouterLink>
          <button type="button" class="btn-quiet" @click="logout">Chiqish</button>
        </div>
      </div>
    </header>
    <main class="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 sm:py-8">
      <slot />
    </main>
  </div>
</template>
