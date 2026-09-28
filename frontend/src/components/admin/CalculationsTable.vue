<script setup>
import { ACTIVITY_LEVELS, GOALS } from '../../utils/calculator.js';
import { formatDateTime, formatNumber, fullName } from '../../utils/format.js';

defineProps({
  items: { type: Array, required: true },
  showUser: { type: Boolean, default: false },
});
defineEmits(['open-user']);

const activityLabel = (key) => ACTIVITY_LEVELS.find((a) => a.key === key)?.label || key;
const goalLabel = (key) => GOALS.find((g) => g.key === key)?.short || key;
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full min-w-[900px] text-left text-sm">
      <thead class="border-b border-line text-[13px] text-stone">
        <tr>
          <th class="px-4 py-3 font-medium">ID</th>
          <th class="px-4 py-3 font-medium">Sana</th>
          <th v-if="showUser" class="px-4 py-3 font-medium">Mijoz</th>
          <th class="px-4 py-3 font-medium">Jins / yosh</th>
          <th class="px-4 py-3 font-medium">Bo‘y / vazn</th>
          <th class="px-4 py-3 font-medium">Faollik</th>
          <th class="px-4 py-3 font-medium">Maqsad</th>
          <th class="px-4 py-3 text-right font-medium">Kaloriya</th>
          <th class="px-4 py-3 text-right font-medium">BMI</th>
          <th class="px-4 py-3 text-right font-medium">O / Y / U, g</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-line">
        <tr v-for="c in items" :key="c.id" class="num">
          <td class="px-4 py-3 text-stone">#{{ c.id }}</td>
          <td class="px-4 py-3 whitespace-nowrap">{{ formatDateTime(c.createdAt) }}</td>
          <td v-if="showUser" class="px-4 py-3">
            <button
              v-if="c.user"
              type="button"
              class="font-medium text-gold-ink underline-offset-2 hover:underline"
              @click="$emit('open-user', c.user.id)"
            >
              {{ fullName(c.user) }}
            </button>
            <span v-else class="text-mist">Sayt mehmoni</span>
          </td>
          <td class="px-4 py-3 whitespace-nowrap">{{ c.sex === 'male' ? 'Erkak' : 'Ayol' }}, {{ c.age }}</td>
          <td class="px-4 py-3 whitespace-nowrap">{{ c.height }} sm / {{ c.weight }} kg</td>
          <td class="px-4 py-3 whitespace-nowrap">{{ activityLabel(c.activity) }}</td>
          <td class="px-4 py-3 whitespace-nowrap">{{ goalLabel(c.goal) }}</td>
          <td class="px-4 py-3 text-right font-semibold whitespace-nowrap">{{ formatNumber(c.targetCalories) }} kcal</td>
          <td class="px-4 py-3 text-right">{{ c.bmi }}</td>
          <td class="px-4 py-3 text-right whitespace-nowrap">{{ c.protein }} / {{ c.fat }} / {{ c.carbs }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
