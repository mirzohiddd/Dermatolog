<script setup>
import { computed, nextTick, reactive, ref } from 'vue';
import { endpoints, errorMessage } from '../services/api.js';
import { getInitData, haptic } from '../services/telegram.js';
import { ACTIVITY_LEVELS, DEFAULTS, GOALS, calculate, validateInput } from '../utils/calculator.js';
import FormField from './FormField.vue';
import HexSpinner from './HexSpinner.vue';
import ResultPanel from './ResultPanel.vue';
import SexToggle from './SexToggle.vue';

const form = reactive({
  sex: DEFAULTS.sex,
  age: '',
  height: '',
  weight: '',
  activity: DEFAULTS.activity,
  goal: DEFAULTS.goal,
});

const errors = reactive({});
const touched = reactive({});
const loading = ref(false);
const result = ref(null);
const resultKey = ref(0);
const notice = ref('');
const formError = ref('');
const resultEl = ref(null);

const activityHint = computed(() => ACTIVITY_LEVELS.find((a) => a.key === form.activity)?.hint || '');

const numberFields = [
  { key: 'age', label: 'Yosh', placeholder: 'Masalan, 36', inputmode: 'numeric' },
  { key: 'height', label: 'Bo‘y (sm)', placeholder: 'Masalan, 168', inputmode: 'decimal' },
  { key: 'weight', label: 'Vazn (kg)', placeholder: 'Masalan, 83', inputmode: 'decimal' },
];

function applyErrors(next) {
  for (const key of Object.keys(errors)) delete errors[key];
  Object.assign(errors, next);
}

/** Maydondan chiqqanda (blur) faqat shu maydonni tekshiramiz. */
function validateField(key) {
  touched[key] = true;
  const { errors: all } = validateInput(form);
  if (all[key]) errors[key] = all[key];
  else delete errors[key];
}

function onInput(key) {
  // Xato ko‘rsatilgan bo‘lsa — foydalanuvchi tuzatayotganda darhol yangilaymiz
  if (touched[key] && errors[key]) validateField(key);
  formError.value = '';
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function submit() {
  formError.value = '';
  const { valid, errors: found, values } = validateInput(form);
  Object.keys(form).forEach((k) => (touched[k] = true));
  applyErrors(found);

  if (!valid) {
    haptic('error');
    await nextTick();
    const first = ['age', 'height', 'weight'].find((k) => found[k]);
    if (first) document.getElementById(`calc-${first}`)?.focus();
    return;
  }

  loading.value = true;
  notice.value = '';
  try {
    const [response] = await Promise.all([
      endpoints.calculate({ ...values, initData: getInitData() || undefined }),
      wait(450), // spinner ko‘z ilg‘amay qolmasligi uchun
    ]);
    result.value = response.data.result;
  } catch (error) {
    const status = error.response?.status;
    if (status === 400 && error.response.data?.details) {
      applyErrors(error.response.data.details);
      formError.value = errorMessage(error);
      loading.value = false;
      return;
    }
    if (status === 429) {
      formError.value = errorMessage(error);
      loading.value = false;
      return;
    }
    // Server bilan aloqa yo‘q — natijani qurilmaning o‘zida hisoblaymiz (formula bir xil)
    result.value = calculate(values);
    notice.value = 'Natija qurilmangizda hisoblandi, lekin serverga saqlanmadi.';
  }
  loading.value = false;
  resultKey.value += 1;
  haptic('success');

  await nextTick();
  if (window.matchMedia('(max-width: 1023px)').matches) {
    resultEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
</script>

<template>
  <section class="card @container p-5 sm:p-8" aria-labelledby="calc-title">
    <header class="mb-7">
      <h1 id="calc-title" class="text-[28px] leading-tight font-semibold text-ink sm:text-[32px]">Kaloriya kalkulyatori</h1>
      <p class="mt-1.5 text-[17px] text-stone">Sog‘lom hayot sari birinchi qadam</p>
    </header>

    <form novalidate class="space-y-5" @submit.prevent="submit">
      <SexToggle v-model="form.sex" />

      <div class="grid grid-cols-1 gap-5 @md:grid-cols-3 @md:gap-4">
        <FormField
          v-for="f in numberFields"
          :id="`calc-${f.key}`"
          :key="f.key"
          :label="f.label"
          :error="errors[f.key]"
        >
          <input
            :id="`calc-${f.key}`"
            v-model="form[f.key]"
            type="text"
            :inputmode="f.inputmode"
            autocomplete="off"
            :placeholder="f.placeholder"
            class="field-input num"
            :aria-invalid="errors[f.key] ? 'true' : 'false'"
            :aria-describedby="errors[f.key] ? `calc-${f.key}-error` : undefined"
            maxlength="6"
            @blur="validateField(f.key)"
            @input="onInput(f.key)"
          />
        </FormField>
      </div>

      <FormField id="calc-activity" label="Faollik darajasi" :hint="activityHint" :error="errors.activity">
        <select id="calc-activity" v-model="form.activity" class="field-input" :aria-invalid="errors.activity ? 'true' : 'false'">
          <option v-for="a in ACTIVITY_LEVELS" :key="a.key" :value="a.key">{{ a.label }}</option>
        </select>
      </FormField>

      <FormField id="calc-goal" label="Maqsad" :error="errors.goal">
        <select id="calc-goal" v-model="form.goal" class="field-input" :aria-invalid="errors.goal ? 'true' : 'false'">
          <option v-for="g in GOALS" :key="g.key" :value="g.key">{{ g.label }}</option>
        </select>
      </FormField>

      <Transition name="fade">
        <p v-if="formError" class="rounded-xl bg-danger-wash px-4 py-3 text-sm text-danger" role="alert">{{ formError }}</p>
      </Transition>

      <button type="submit" class="btn-primary" :disabled="loading" :aria-busy="loading">
        <HexSpinner v-if="loading" :size="20" />
        <span>{{ loading ? 'HISOBLANMOQDA' : 'HISOBLASH' }}</span>
      </button>
    </form>

    <div ref="resultEl" class="scroll-mt-4" aria-live="polite">
      <Transition name="result" mode="out-in">
        <ResultPanel v-if="result" :key="resultKey" :result="result" :notice="notice" class="mt-8" />
      </Transition>
    </div>

    <p class="mt-7 border-t border-line pt-5 text-[13px] leading-relaxed text-stone">
      Mifflin–St Jeor formulasi va standart faollik koeffitsientlari asosida taxminiy hisob. Bu tibbiy tashxis yoki
      individual dietologik tavsiya o‘rnini bosmaydi.
    </p>
  </section>
</template>
