<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AdminLayout from '../components/admin/AdminLayout.vue';
import CalculationsTable from '../components/admin/CalculationsTable.vue';
import Pagination from '../components/admin/Pagination.vue';
import StatCard from '../components/admin/StatCard.vue';
import HexSpinner from '../components/HexSpinner.vue';
import { endpoints, errorMessage } from '../services/api.js';
import { formatDateTime, formatSource, fullName } from '../utils/format.js';

const route = useRoute();
const router = useRouter();
const LIMIT = 20;

// Holat URL da saqlanadi — mijoz sahifasidan "orqaga" qaytganda qidiruv va sahifa yo‘qolmaydi
const tab = computed(() => (route.query.tab === 'calculations' ? 'calculations' : 'users'));
const page = computed(() => Math.max(1, Number(route.query.page) || 1));
const search = ref(typeof route.query.q === 'string' ? route.query.q : '');

const stats = ref(null);
const statsError = ref('');
const list = ref(null);
const listError = ref('');
const loading = ref(false);
let requestId = 0;

function setQuery(patch) {
  const query = { ...route.query, ...patch };
  Object.keys(query).forEach((k) => (query[k] === '' || query[k] === undefined || query[k] === 1) && delete query[k]);
  router.replace({ query });
}

async function loadStats() {
  statsError.value = '';
  try {
    stats.value = (await endpoints.stats()).data;
  } catch (e) {
    statsError.value = errorMessage(e);
  }
}

async function loadList() {
  const id = ++requestId;
  loading.value = true;
  listError.value = '';
  try {
    const params = { page: page.value, limit: LIMIT };
    const res =
      tab.value === 'users'
        ? await endpoints.users({ ...params, search: route.query.q || undefined })
        : await endpoints.calculations(params);
    if (id === requestId) list.value = res.data;
  } catch (e) {
    if (id === requestId) listError.value = errorMessage(e);
  } finally {
    if (id === requestId) loading.value = false;
  }
}

function refresh() {
  loadStats();
  loadList();
}

let debounce = 0;
watch(search, (value) => {
  clearTimeout(debounce);
  debounce = setTimeout(() => setQuery({ q: value.trim(), page: undefined }), 300);
});
watch(() => [route.query.tab, route.query.page, route.query.q], loadList);
onMounted(refresh);
onBeforeUnmount(() => clearTimeout(debounce));

function switchTab(next) {
  if (next === tab.value) return;
  list.value = null;
  setQuery({ tab: next === 'users' ? undefined : next, page: undefined });
}

function openUser(id) {
  router.push({ name: 'admin-user', params: { id } });
}

const sources = computed(() =>
  Object.entries(stats.value?.bySource || {})
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({ key, label: formatSource(key), count })),
);
</script>

<template>
  <AdminLayout>
    <div class="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold text-ink sm:text-[28px]">Boshqaruv paneli</h1>
        <p class="mt-1 text-sm text-stone">Bugungi ko‘rsatkichlar Toshkent vaqti bo‘yicha hisoblanadi</p>
      </div>
      <button type="button" class="btn-quiet" :disabled="loading" @click="refresh">
        <HexSpinner v-if="loading" :size="16" class="text-graphite" />
        Yangilash
      </button>
    </div>

    <p v-if="statsError" class="mb-4 rounded-xl bg-danger-wash px-4 py-3 text-sm text-danger" role="alert">{{ statsError }}</p>

    <section class="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Statistika">
      <StatCard label="Jami mijozlar" :value="stats?.totalUsers ?? null" :loading="!stats && !statsError" />
      <StatCard label="Bugungi mijozlar" :value="stats?.todayUsers ?? null" :loading="!stats && !statsError" accent />
      <StatCard label="Jami hisoblashlar" :value="stats?.totalCalculations ?? null" :loading="!stats && !statsError" />
      <StatCard label="Bugungi hisoblashlar" :value="stats?.todayCalculations ?? null" :loading="!stats && !statsError" accent />
    </section>

    <div v-if="sources.length" class="mt-4 flex flex-wrap items-center gap-2 text-sm">
      <span class="text-stone">Mijozlar manbasi:</span>
      <span v-for="s in sources" :key="s.key" class="num rounded-full border border-line bg-paper px-3 py-1 text-graphite">
        {{ s.label }} <span class="font-semibold">{{ s.count }}</span>
      </span>
    </div>

    <section class="card mt-6 overflow-hidden">
      <div class="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="inline-flex rounded-xl bg-cloud p-1" role="tablist">
          <button
            v-for="t in [
              { key: 'users', label: 'Mijozlar' },
              { key: 'calculations', label: 'Hisoblashlar' },
            ]"
            :key="t.key"
            type="button"
            role="tab"
            :aria-selected="tab === t.key"
            class="h-9 rounded-lg px-4 text-sm font-medium transition-colors"
            :class="tab === t.key ? 'bg-paper text-ink shadow-[0_1px_3px_rgb(23_23_23/0.12)]' : 'text-stone hover:text-graphite'"
            @click="switchTab(t.key)"
          >
            {{ t.label }}
          </button>
        </div>
        <label v-if="tab === 'users'" class="relative block w-full sm:w-80">
          <span class="sr-only">Qidirish</span>
          <svg class="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-mist" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" stroke-linecap="round" />
          </svg>
          <input v-model="search" type="search" class="field-input h-10 pl-10 text-[15px]" placeholder="Ism, username yoki Telegram ID" />
        </label>
      </div>

      <p v-if="listError" class="m-4 rounded-xl bg-danger-wash px-4 py-3 text-sm text-danger" role="alert">{{ listError }}</p>

      <!-- Yuklanmoqda -->
      <div v-else-if="!list" class="space-y-3 p-4" aria-busy="true">
        <div v-for="i in 6" :key="i" class="skeleton h-11 rounded-lg" />
      </div>

      <template v-else>
        <div class="transition-opacity duration-200" :class="loading ? 'opacity-50' : ''">
          <!-- Mijozlar -->
          <div v-if="tab === 'users'" class="overflow-x-auto">
            <table v-if="list.items.length" class="w-full min-w-[860px] text-left text-sm">
              <thead class="border-b border-line text-[13px] text-stone">
                <tr>
                  <th class="px-4 py-3 font-medium">ID</th>
                  <th class="px-4 py-3 font-medium">Ism</th>
                  <th class="px-4 py-3 font-medium">Username</th>
                  <th class="px-4 py-3 font-medium">Telegram ID</th>
                  <th class="px-4 py-3 font-medium">Source</th>
                  <th class="px-4 py-3 font-medium">Started At</th>
                  <th class="px-4 py-3 font-medium">Last Active</th>
                  <th class="px-4 py-3 text-right font-medium">Hisoblash</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-line">
                <tr
                  v-for="u in list.items"
                  :key="u.id"
                  class="num cursor-pointer transition-colors hover:bg-gold-wash focus-visible:bg-gold-wash"
                  tabindex="0"
                  @click="openUser(u.id)"
                  @keydown.enter="openUser(u.id)"
                >
                  <td class="px-4 py-3 text-stone">#{{ u.id }}</td>
                  <td class="px-4 py-3 font-medium text-ink">{{ fullName(u) }}</td>
                  <td class="px-4 py-3">{{ u.username ? `@${u.username}` : '—' }}</td>
                  <td class="px-4 py-3">{{ u.telegramId }}</td>
                  <td class="px-4 py-3">
                    <span class="rounded-full px-2.5 py-0.5 text-xs" :class="u.source === 'instagram' ? 'bg-gold-wash text-gold-ink' : 'bg-cloud text-graphite'">
                      {{ formatSource(u.source) }}
                    </span>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">{{ formatDateTime(u.startedAt) }}</td>
                  <td class="px-4 py-3 whitespace-nowrap">{{ formatDateTime(u.lastActiveAt) }}</td>
                  <td class="px-4 py-3 text-right">{{ u.calculationsCount }}</td>
                </tr>
              </tbody>
            </table>
            <div v-else class="px-6 py-14 text-center">
              <p class="font-medium text-graphite">{{ route.query.q ? 'Hech narsa topilmadi' : 'Hozircha mijozlar yo‘q' }}</p>
              <p class="mt-1 text-sm text-stone">
                {{ route.query.q ? 'Boshqa ism, username yoki Telegram ID bilan qidirib ko‘ring.' : 'Mijozlar botga /start bosganda shu yerda paydo bo‘ladi.' }}
              </p>
            </div>
          </div>

          <!-- Hisoblashlar -->
          <template v-else>
            <CalculationsTable v-if="list.items.length" :items="list.items" show-user @open-user="openUser" />
            <div v-else class="px-6 py-14 text-center">
              <p class="font-medium text-graphite">Hozircha hisoblashlar yo‘q</p>
              <p class="mt-1 text-sm text-stone">Kalkulyatorda “HISOBLASH” bosilganda shu yerda ko‘rinadi.</p>
            </div>
          </template>
        </div>

        <div v-if="list.total" class="border-t border-line p-4">
          <Pagination :page="list.page" :total-pages="list.totalPages" :total="list.total" :limit="list.limit" @change="(p) => setQuery({ page: p })" />
        </div>
      </template>
    </section>
  </AdminLayout>
</template>
