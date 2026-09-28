<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AdminLayout from '../components/admin/AdminLayout.vue';
import CalculationsTable from '../components/admin/CalculationsTable.vue';
import Pagination from '../components/admin/Pagination.vue';
import { endpoints, errorMessage } from '../services/api.js';
import { formatDateTime, formatSource, fullName } from '../utils/format.js';

const route = useRoute();
const router = useRouter();

const detail = ref(null);
const history = ref(null);
const error = ref('');
const historyError = ref('');
const page = ref(1);

const userId = computed(() => Number(route.params.id));

async function loadUser() {
  error.value = '';
  detail.value = null;
  try {
    detail.value = (await endpoints.user(userId.value)).data;
  } catch (e) {
    error.value = e.response?.status === 404 ? 'Bunday mijoz topilmadi.' : errorMessage(e);
  }
}

async function loadHistory() {
  historyError.value = '';
  try {
    history.value = (await endpoints.userCalculations(userId.value, { page: page.value, limit: 20 })).data;
  } catch (e) {
    historyError.value = errorMessage(e);
  }
}

watch(
  userId,
  () => {
    page.value = 1;
    history.value = null;
    loadUser();
    loadHistory();
  },
  { immediate: true },
);
watch(page, loadHistory);

function back() {
  if (window.history.state?.back?.startsWith('/admin')) router.back();
  else router.push({ name: 'admin' });
}

const rows = computed(() => {
  const u = detail.value?.user;
  if (!u) return [];
  return [
    { label: 'Mijoz ID', value: `#${u.id}` },
    { label: 'Telegram ID', value: u.telegramId },
    { label: 'Username', value: u.username ? `@${u.username}` : '—', href: u.username ? `https://t.me/${u.username}` : null },
    { label: 'Manba', value: formatSource(u.source) },
    { label: 'Birinchi kirgan', value: formatDateTime(u.startedAt) },
    { label: 'Oxirgi faollik', value: formatDateTime(u.lastActiveAt) },
    { label: 'Hisoblashlar soni', value: String(detail.value.stats.calculationsCount) },
    { label: 'Oxirgi hisoblash', value: formatDateTime(detail.value.stats.lastCalculationAt) },
  ];
});
</script>

<template>
  <AdminLayout>
    <button type="button" class="mb-5 inline-flex items-center gap-1.5 text-sm text-stone hover:text-gold-ink" @click="back">
      <span aria-hidden="true">‹</span> Mijozlar ro‘yxati
    </button>

    <div v-if="error" class="card px-6 py-12 text-center">
      <p class="font-medium text-graphite">{{ error }}</p>
      <RouterLink to="/admin" class="btn-quiet mt-4">Ro‘yxatga qaytish</RouterLink>
    </div>

    <template v-else>
      <section class="card p-5 sm:p-6">
        <div v-if="!detail" class="space-y-3" aria-busy="true">
          <div class="skeleton h-8 w-56 rounded-lg" />
          <div class="skeleton h-24 rounded-lg" />
        </div>
        <template v-else>
          <div class="flex flex-wrap items-center gap-3">
            <h1 class="text-2xl font-semibold text-ink">{{ fullName(detail.user) }}</h1>
            <span
              class="rounded-full px-2.5 py-0.5 text-xs"
              :class="detail.user.source === 'instagram' ? 'bg-gold-wash text-gold-ink' : 'bg-cloud text-graphite'"
            >
              {{ formatSource(detail.user.source) }}
            </span>
          </div>
          <dl class="mt-5 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            <div v-for="r in rows" :key="r.label" class="min-w-0">
              <dt class="text-[13px] text-stone">{{ r.label }}</dt>
              <dd class="num mt-0.5 truncate font-medium text-ink">
                <a v-if="r.href" :href="r.href" target="_blank" rel="noopener" class="text-gold-ink hover:underline">{{ r.value }}</a>
                <template v-else>{{ r.value }}</template>
              </dd>
            </div>
          </dl>
        </template>
      </section>

      <section class="card mt-6 overflow-hidden">
        <h2 class="border-b border-line px-5 py-4 text-lg font-semibold text-ink">Hisoblashlar tarixi</h2>
        <p v-if="historyError" class="m-4 rounded-xl bg-danger-wash px-4 py-3 text-sm text-danger" role="alert">{{ historyError }}</p>
        <div v-else-if="!history" class="space-y-3 p-4" aria-busy="true">
          <div v-for="i in 3" :key="i" class="skeleton h-11 rounded-lg" />
        </div>
        <template v-else>
          <CalculationsTable v-if="history.items.length" :items="history.items" />
          <div v-else class="px-6 py-12 text-center">
            <p class="font-medium text-graphite">Bu mijoz hali hisoblash qilmagan</p>
            <p class="mt-1 text-sm text-stone">Mijoz kalkulyatorni Telegram orqali ochib hisoblasa, natija shu yerda chiqadi.</p>
          </div>
          <div v-if="history.total" class="border-t border-line p-4">
            <Pagination :page="history.page" :total-pages="history.totalPages" :total="history.total" :limit="history.limit" @change="(p) => (page = p)" />
          </div>
        </template>
      </section>
    </template>
  </AdminLayout>
</template>
