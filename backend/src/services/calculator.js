/**
 * KALORIYA KALKULYATORI — ASOSIY FORMULA
 *
 * Bu fayl eski "Kaloriya Kalkulyatori PRO" (index.html) dagi hisob-kitobning
 * aynan o‘zi. Formula o‘zgartirilmagan:
 *   - BMR: Mifflin–St Jeor (erkak +5, ayol −161)
 *   - TDEE = BMR × faollik koeffitsienti
 *   - Maqsad kaloriyasi = TDEE × maqsad koeffitsienti
 *   - Oqsil = vazn × 1.8 g, Yog‘ = vazn × 0.8 g
 *   - Uglevod = (maqsad kaloriya − oqsil×4 − yog‘×9) / 4, manfiy bo‘lsa 0
 *
 * DIQQAT: bu fayl ikki joyda bir xil turadi:
 *   backend/src/services/calculator.js
 *   frontend/src/utils/calculator.js
 * Birini o‘zgartirsangiz, ikkinchisini ham xuddi shunday o‘zgartiring.
 * `cd backend && npm test` ikkalasi bir xil natija berishini tekshiradi.
 */

export const SEXES = [
  { key: 'male', label: 'Erkak', bmrOffset: 5 },
  { key: 'female', label: 'Ayol', bmrOffset: -161 },
];

export const ACTIVITY_LEVELS = [
  { key: 'sedentary', factor: 1.2, label: 'Kam harakat', hint: 'Asosan o‘tirib ishlash, mashg‘ulotsiz' },
  { key: 'light', factor: 1.375, label: 'Yengil faol', hint: 'Haftada 1–3 marta yengil mashg‘ulot' },
  { key: 'moderate', factor: 1.55, label: 'O‘rtacha faol', hint: 'Haftada 3–5 marta mashg‘ulot' },
  { key: 'active', factor: 1.725, label: 'Yuqori faol', hint: 'Haftada 6–7 marta jadal mashg‘ulot' },
  { key: 'very_active', factor: 1.9, label: 'Juda yuqori faol', hint: 'Og‘ir jismoniy ish yoki kuniga 2 mashg‘ulot' },
];

export const GOALS = [
  { key: 'lose10', multiplier: 0.9, label: 'Vazn kamaytirish (−10%)', short: '−10% defitsit' },
  { key: 'lose15', multiplier: 0.85, label: 'Vazn kamaytirish (−15%)', short: '−15% defitsit' },
  { key: 'lose20', multiplier: 0.8, label: 'Vazn kamaytirish (−20%)', short: '−20% defitsit' },
  { key: 'maintain', multiplier: 1, label: 'Vaznni saqlash', short: 'vaznni saqlash' },
  { key: 'gain5', multiplier: 1.05, label: 'Vazn oshirish (+5%)', short: '+5% profitsit' },
  { key: 'gain10', multiplier: 1.1, label: 'Vazn oshirish (+10%)', short: '+10% profitsit' },
  { key: 'gain15', multiplier: 1.15, label: 'Vazn oshirish (+15%)', short: '+15% profitsit' },
];

export const DEFAULTS = { sex: 'male', activity: 'moderate', goal: 'lose15' };

export const LIMITS = {
  age: { min: 18, max: 100, unit: '', label: 'Yosh' },
  height: { min: 100, max: 230, unit: 'sm', label: 'Bo‘y' },
  weight: { min: 25, max: 300, unit: 'kg', label: 'Vazn' },
};

export const PROTEIN_PER_KG = 1.8;
export const FAT_PER_KG = 0.8;

const EMPTY_MESSAGES = {
  age: 'Yoshingizni kiriting',
  height: 'Bo‘yingizni kiriting',
  weight: 'Vazningizni kiriting',
};

/** "75,5" ham, "75.5" ham qabul qilinadi. */
function parseNumber(raw) {
  if (raw === null || raw === undefined) return { empty: true };
  if (typeof raw === 'number') return Number.isFinite(raw) ? { value: raw } : { invalid: true };
  if (typeof raw !== 'string') return { invalid: true };
  const text = raw.trim().replace(',', '.');
  if (text === '') return { empty: true };
  if (!/^-?\d+(\.\d+)?$/.test(text)) return { invalid: true };
  return { value: Number(text) };
}

/**
 * Kiritilgan ma'lumotlarni tekshiradi.
 * @returns {{ valid: boolean, errors: Record<string,string>, values: object }}
 */
export function validateInput(raw = {}) {
  const errors = {};
  const values = {};

  for (const field of ['age', 'height', 'weight']) {
    const limit = LIMITS[field];
    const parsed = parseNumber(raw[field]);
    if (parsed.empty) {
      errors[field] = EMPTY_MESSAGES[field];
    } else if (parsed.invalid) {
      errors[field] = 'Faqat raqam kiriting';
    } else if (parsed.value < 0) {
      errors[field] = 'Manfiy son bo‘lishi mumkin emas';
    } else if (parsed.value === 0) {
      errors[field] = `${limit.label} 0 bo‘lishi mumkin emas`;
    } else if (field === 'age' && !Number.isInteger(parsed.value)) {
      errors[field] = 'Yoshni butun son bilan kiriting';
    } else if (parsed.value < limit.min || parsed.value > limit.max) {
      const unit = field === 'age' ? '' : ` ${limit.unit}`;
      errors[field] = `${limit.label} ${limit.min} dan ${limit.max}${unit} gacha bo‘lishi kerak`;
    } else {
      values[field] = parsed.value;
    }
  }

  if (!SEXES.some((s) => s.key === raw.sex)) errors.sex = 'Jinsni tanlang';
  else values.sex = raw.sex;

  if (!ACTIVITY_LEVELS.some((a) => a.key === raw.activity)) errors.activity = 'Faollik darajasini tanlang';
  else values.activity = raw.activity;

  if (!GOALS.some((g) => g.key === raw.goal)) errors.goal = 'Maqsadni tanlang';
  else values.goal = raw.goal;

  return { valid: Object.keys(errors).length === 0, errors, values };
}

/**
 * Tana vazni indeksi (BMI) shkalasi — JSST tasnifi.
 * tone: 'yellow' | 'green' | 'red' — natija rangini belgilaydi.
 * `max` — shu chegaradan kichik bo‘lsa, shu toifa (oxirgisida chegara yo‘q).
 */
export const BMI_SCALE = [
  { key: 'under', max: 18.5, range: '18,5 dan past', label: 'Vazn yetishmovchiligi', tone: 'yellow' },
  { key: 'normal', max: 25, range: '18,5–24,9', label: 'Me’yoriy vazn', tone: 'green' },
  { key: 'over', max: 30, range: '25,0–29,9', label: 'Ortiqcha vazn', tone: 'yellow' },
  { key: 'obese1', max: 35, range: '30,0–34,9', label: 'I darajali semizlik', tone: 'red' },
  { key: 'obese2', max: 40, range: '35,0–39,9', label: 'II darajali semizlik', tone: 'red' },
  { key: 'obese3', max: Infinity, range: '40 va undan yuqori', label: 'III darajali semizlik', tone: 'red' },
];

export function bmiCategory(bmi) {
  const found = BMI_SCALE.find((c) => bmi < c.max) || BMI_SCALE[BMI_SCALE.length - 1];
  return { key: found.key, label: found.label, tone: found.tone };
}

/**
 * Asosiy hisob. `values` — validateInput() dan o‘tgan qiymatlar.
 */
export function calculate(values) {
  const { sex, age, height: h, weight: w, activity, goal } = values;
  const sexInfo = SEXES.find((s) => s.key === sex);
  const activityInfo = ACTIVITY_LEVELS.find((a) => a.key === activity);
  const goalInfo = GOALS.find((g) => g.key === goal);
  if (!sexInfo || !activityInfo || !goalInfo) throw new Error('Noto‘g‘ri kalkulyator parametrlari');

  const bmr = 10 * w + 6.25 * h - 5 * age + sexInfo.bmrOffset;
  const tdee = bmr * activityInfo.factor;
  const target = tdee * goalInfo.multiplier;
  const bmi = w / (h / 100) ** 2;
  const protein = w * PROTEIN_PER_KG;
  const fat = w * FAT_PER_KG;
  let carbs = (target - protein * 4 - fat * 9) / 4;
  if (carbs < 0) carbs = 0;

  const warning =
    bmi < 18.5 && goal.startsWith('lose')
      ? 'BMI 18.5 dan past. Vazn kamaytirish uchun kaloriya defitsiti mos kelmasligi mumkin — klinik baholash maqsadga muvofiq.'
      : null;

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    targetCalories: Math.round(target),
    bmi: Number(bmi.toFixed(1)),
    bmiCategory: bmiCategory(bmi),
    protein: Math.round(protein),
    fat: Math.round(fat),
    carbs: Math.round(carbs),
    goalLabel: goalInfo.short,
    activityLabel: activityInfo.label,
    warning,
  };
}