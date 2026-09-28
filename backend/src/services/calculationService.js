import { db } from './db.js';
import { JsonDatabase } from './jsonDatabase.js';
import { calculate, validateInput } from './calculator.js';
import { upsertTelegramUser } from './userService.js';
import { badRequest } from '../utils/httpError.js';

/**
 * Hisoblashni bajaradi va saqlaydi.
 * Natija serverda qayta hisoblanadi — brauzerdan kelgan raqamlarga ishonilmaydi.
 *
 * @param {object} input       — { sex, age, height, weight, activity, goal }
 * @param {object|null} tgUser — imzosi tekshirilgan Telegram foydalanuvchi (yoki null)
 */
export async function createCalculation(input, tgUser = null) {
  const { valid, errors, values } = validateInput(input);
  if (!valid) throw badRequest('Ma’lumotlarda xatolik bor', errors);

  const result = calculate(values);

  let user = null;
  let userIsNew = false;
  if (tgUser) {
    const upserted = await upsertTelegramUser(
      { id: tgUser.telegramId, username: tgUser.username, first_name: tgUser.firstName, last_name: tgUser.lastName },
      { source: 'webapp' },
    );
    user = upserted.user;
    userIsNew = upserted.isNew;
  }

  const calculation = await db.update('calculations', (items) => {
    const record = {
      id: JsonDatabase.nextId(items),
      userId: user ? user.id : null,
      telegramId: user ? user.telegramId : null,
      sex: values.sex,
      age: values.age,
      height: values.height,
      weight: values.weight,
      activity: values.activity,
      goal: values.goal,
      bmr: result.bmr,
      tdee: result.tdee,
      bmi: result.bmi,
      bmiCategory: result.bmiCategory.key,
      targetCalories: result.targetCalories,
      protein: result.protein,
      fat: result.fat,
      carbs: result.carbs,
      createdAt: new Date().toISOString(),
    };
    items.push(record);
    return record;
  });

  return { calculation, result, user, userIsNew };
}

export async function listCalculations({ page = 1, limit = 20, userId = null } = {}) {
  const [calculations, users] = await Promise.all([db.read('calculations'), db.read('users')]);
  const byId = new Map(users.map((u) => [u.id, u]));

  const filtered = userId ? calculations.filter((c) => c.userId === userId) : calculations;
  const sorted = [...filtered].sort((a, b) => b.id - a.id);
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const items = sorted.slice((safePage - 1) * limit, safePage * limit).map((c) => {
    const u = c.userId ? byId.get(c.userId) : null;
    return {
      ...c,
      user: u ? { id: u.id, firstName: u.firstName, lastName: u.lastName, username: u.username } : null,
    };
  });

  return { items, total, page: safePage, limit, totalPages };
}
