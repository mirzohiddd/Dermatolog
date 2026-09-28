import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as backendCalc from '../src/services/calculator.js';
import * as frontendCalc from '../../frontend/src/utils/calculator.js';

/** ESKI index.html dagi formula — so‘zma-so‘z ko‘chirilgan (solishtirish uchun). */
function originalCalc(sex, age, h, w, af, goal) {
  const mult = { lose10: 0.9, lose15: 0.85, lose20: 0.8, maintain: 1, gain5: 1.05, gain10: 1.1, gain15: 1.15 }[goal];
  const bmr = 10 * w + 6.25 * h - 5 * age + (sex === 'm' ? 5 : -161);
  const tdee = bmr * af;
  const target = tdee * mult;
  const bmi = w / (h / 100) ** 2;
  const bmiText = bmi < 18.5 ? 'under' : bmi < 25 ? 'normal' : bmi < 30 ? 'over' : 'obese';
  const protein = w * 1.8;
  const fat = w * 0.8;
  let carbs = (target - protein * 4 - fat * 9) / 4;
  if (carbs < 0) carbs = 0;
  const warning = bmi < 18.5 && goal.startsWith('lose');
  const r = Math.round;
  return { bmr: r(bmr), tdee: r(tdee), target: r(target), bmi: bmi.toFixed(1), bmiText, protein: r(protein), fat: r(fat), carbs: r(carbs), warning };
}

const ACT = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
const GOALS = ['lose10', 'lose15', 'lose20', 'maintain', 'gain5', 'gain10', 'gain15'];

test('yangi kalkulyator eski formula bilan 100% bir xil natija beradi', () => {
  let seed = 42;
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  for (let i = 0; i < 5000; i++) {
    const sex = rand() < 0.5 ? 'male' : 'female';
    const age = 18 + Math.floor(rand() * 83);
    const height = Math.round((100 + rand() * 130) * 10) / 10;
    const weight = Math.round((25 + rand() * 275) * 10) / 10;
    const activity = Object.keys(ACT)[Math.floor(rand() * 5)];
    const goal = GOALS[Math.floor(rand() * 7)];

    const input = { sex, age, height, weight, activity, goal };
    const v = backendCalc.validateInput(input);
    assert.ok(v.valid, JSON.stringify(v.errors));
    const got = backendCalc.calculate(v.values);
    const exp = originalCalc(sex === 'male' ? 'm' : 'f', age, height, weight, ACT[activity], goal);

    assert.equal(got.bmr, exp.bmr);
    assert.equal(got.tdee, exp.tdee);
    assert.equal(got.targetCalories, exp.target);
    assert.equal(got.bmi.toFixed(1), exp.bmi);
    assert.equal(got.bmiCategory.key, exp.bmiText);
    assert.equal(got.protein, exp.protein);
    assert.equal(got.fat, exp.fat);
    assert.equal(got.carbs, exp.carbs);
    assert.equal(Boolean(got.warning), exp.warning);

    assert.deepEqual(frontendCalc.calculate(frontendCalc.validateInput(input).values), got, 'frontend va backend farq qildi');
  }
});

test('eski sahifadagi standart qiymatlar (36 yosh, 168 sm, 83 kg)', () => {
  const r = backendCalc.calculate({ sex: 'male', age: 36, height: 168, weight: 83, activity: 'moderate', goal: 'lose15' });
  assert.equal(r.bmr, 1705); // 830 + 1050 - 180 + 5
  assert.equal(r.tdee, 2643);
  assert.equal(r.targetCalories, 2246);
  assert.equal(r.bmi, 29.4);
  assert.equal(r.protein, 149);
  assert.equal(r.fat, 66);
});

test('validatsiya: bo‘sh, noto‘g‘ri, manfiy, real bo‘lmagan qiymatlar', () => {
  const base = { sex: 'male', activity: 'moderate', goal: 'maintain' };
  const e1 = backendCalc.validateInput({ ...base, age: '', height: '  ', weight: undefined });
  assert.equal(e1.errors.age, 'Yoshingizni kiriting');
  assert.equal(e1.errors.height, 'Bo‘yingizni kiriting');
  assert.equal(e1.errors.weight, 'Vazningizni kiriting');

  const e2 = backendCalc.validateInput({ ...base, age: 'abc', height: '1e3', weight: '7O' });
  assert.equal(e2.errors.age, 'Faqat raqam kiriting');
  assert.equal(e2.errors.height, 'Faqat raqam kiriting');
  assert.equal(e2.errors.weight, 'Faqat raqam kiriting');

  const e3 = backendCalc.validateInput({ ...base, age: '-5', height: -170, weight: '0' });
  assert.equal(e3.errors.age, 'Manfiy son bo‘lishi mumkin emas');
  assert.equal(e3.errors.height, 'Manfiy son bo‘lishi mumkin emas');
  assert.equal(e3.errors.weight, 'Vazn 0 bo‘lishi mumkin emas');

  const e4 = backendCalc.validateInput({ ...base, age: 150, height: 40, weight: 999 });
  assert.equal(e4.errors.age, 'Yosh 18 dan 100 gacha bo‘lishi kerak');
  assert.equal(e4.errors.height, 'Bo‘y 100 dan 230 sm gacha bo‘lishi kerak');
  assert.equal(e4.errors.weight, 'Vazn 25 dan 300 kg gacha bo‘lishi kerak');

  const e5 = backendCalc.validateInput({ age: 30, height: 170, weight: 70, sex: 'x', activity: '9', goal: 'fly' });
  assert.ok(e5.errors.sex && e5.errors.activity && e5.errors.goal);

  const ok = backendCalc.validateInput({ ...base, age: '30', height: '175,5', weight: '72.3' });
  assert.ok(ok.valid);
  assert.equal(ok.values.height, 175.5);
});

test('past BMI + vazn kamaytirish = ogohlantirish', () => {
  const r = backendCalc.calculate({ sex: 'female', age: 25, height: 175, weight: 50, activity: 'light', goal: 'lose20' });
  assert.equal(r.bmiCategory.key, 'under');
  assert.ok(r.warning);
});
