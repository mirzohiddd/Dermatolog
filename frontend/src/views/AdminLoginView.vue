<script setup>
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import BrandLogo from '../components/BrandLogo.vue';
import FormField from '../components/FormField.vue';
import HexSpinner from '../components/HexSpinner.vue';
import { endpoints, errorMessage } from '../services/api.js';
import { saveSession } from '../services/auth.js';

const route = useRoute();
const router = useRouter();

const form = reactive({ username: '', password: '' });
const errors = reactive({ username: '', password: '' });
const error = ref(route.query.expired ? 'Sessiya muddati tugadi. Qaytadan kiring.' : '');
const loading = ref(false);
const showPassword = ref(false);

async function submit() {
  errors.username = form.username.trim() ? '' : 'Loginni kiriting';
  errors.password = form.password ? '' : 'Parolni kiriting';
  error.value = '';
  if (errors.username || errors.password) return;

  loading.value = true;
  try {
    const { data } = await endpoints.login(form.username.trim(), form.password);
    saveSession(data.token, data.admin);
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/admin') ? route.query.redirect : '/admin';
    router.replace(redirect);
  } catch (e) {
    error.value = errorMessage(e);
    form.password = '';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main class="flex min-h-dvh items-center justify-center bg-cloud px-4 py-10">
    <div class="anim-rise w-full max-w-[400px]">
      <div class="mb-6 flex justify-center"><BrandLogo size-class="h-24" /></div>
      <form class="card space-y-5 p-6 sm:p-8" novalidate @submit.prevent="submit">
        <div>
          <h1 class="text-2xl font-semibold text-ink">Admin panelga kirish</h1>
          <p class="mt-1 text-sm text-stone">Mijozlar va hisoblashlarni ko‘rish uchun</p>
        </div>

        <FormField id="login-username" label="Login" :error="errors.username">
          <input
            id="login-username"
            v-model="form.username"
            class="field-input"
            autocomplete="username"
            autocapitalize="off"
            spellcheck="false"
            :aria-invalid="errors.username ? 'true' : 'false'"
          />
        </FormField>

        <FormField id="login-password" label="Parol" :error="errors.password">
          <div class="relative">
            <input
              id="login-password"
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              class="field-input pr-24"
              autocomplete="current-password"
              :aria-invalid="errors.password ? 'true' : 'false'"
            />
            <button
              type="button"
              class="absolute top-1/2 right-2 -translate-y-1/2 rounded-md px-2.5 py-1.5 text-[13px] font-medium text-gold-ink hover:bg-gold-wash"
              :aria-pressed="showPassword"
              @click="showPassword = !showPassword"
            >
              {{ showPassword ? 'Yashirish' : 'Ko‘rsatish' }}
            </button>
          </div>
        </FormField>

        <Transition name="fade">
          <p v-if="error" class="rounded-xl bg-danger-wash px-4 py-3 text-sm text-danger" role="alert">{{ error }}</p>
        </Transition>

        <button type="submit" class="btn-primary tracking-normal" :disabled="loading">
          <HexSpinner v-if="loading" />
          <span>{{ loading ? 'Tekshirilmoqda' : 'Kirish' }}</span>
        </button>
      </form>
      <p class="mt-5 text-center"><RouterLink to="/" class="text-sm text-stone hover:text-gold-ink">Kalkulyatorga qaytish</RouterLink></p>
    </div>
  </main>
</template>
