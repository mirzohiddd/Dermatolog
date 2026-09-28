import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { ADMIN_1, ADMIN_2, TEST_BOT_TOKEN, fakeTelegram, setupTestEnv } from './helpers.js';

const dataDir = setupTestEnv();
const { createApp } = await import('../src/app.js');
const { db } = await import('../src/services/db.js');
const { setTelegramClient } = await import('../src/services/notificationService.js');
const { signInitData } = await import('../src/services/telegramAuth.js');
const { upsertTelegramUser } = await import('../src/services/userService.js');

const tg = fakeTelegram();
let server;
let base;
let token;

before(async () => {
  await db.init();
  setTelegramClient(tg);
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const settle = () => new Promise((r) => setTimeout(r, 30)); // bildirishnomalar asinxron
async function api(method, url, body, headers = {}) {
  const res = await fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}
const auth = () => ({ Authorization: `Bearer ${token}` });
const validInput = { sex: 'male', age: 25, height: 175, weight: 75, activity: 'moderate', goal: 'lose15' };
const initDataFor = (user, extra = {}) =>
  signInitData({ auth_date: String(Math.floor(Date.now() / 1000)), user: JSON.stringify(user), ...extra }, TEST_BOT_TOKEN);

test('health', async () => {
  const r = await api('GET', '/api/health');
  assert.equal(r.status, 200);
  assert.equal(r.body.status, 'ok');
});

test('POST /api/calculations — mehmon (Telegramsiz) hisoblash saqlanadi', async () => {
  tg.calls.length = 0;
  const r = await api('POST', '/api/calculations', validInput);
  assert.equal(r.status, 201);
  assert.equal(r.body.linkedToTelegram, false);
  assert.equal(r.body.result.bmr, 1724); // 750 + 1093.75 - 125 + 5 = 1723.75
  await settle();
  const saved = JSON.parse(await fs.readFile(path.join(dataDir, 'calculations.json'), 'utf8'));
  assert.equal(saved.length, 1);
  assert.equal(saved[0].userId, null);
  assert.equal(saved[0].targetCalories, r.body.result.targetCalories);
  assert.deepEqual(new Set(tg.calls.map((c) => c.chat_id)), new Set([ADMIN_1, ADMIN_2]));
  assert.match(tg.calls[0].text, /YANGI HISOBLASH/);
  assert.match(tg.calls[0].text, /Sayt mehmoni/);
});

test('POST /api/calculations — validatsiya xatolari 400 bilan qaytadi', async () => {
  const r = await api('POST', '/api/calculations', { ...validInput, age: -3, height: '', weight: 'abc' });
  assert.equal(r.status, 400);
  assert.equal(r.body.details.age, 'Manfiy son bo‘lishi mumkin emas');
  assert.equal(r.body.details.height, 'Bo‘yingizni kiriting');
  assert.equal(r.body.details.weight, 'Faqat raqam kiriting');
  const r2 = await api('POST', '/api/calculations', '{ noto‘g‘ri json');
  assert.equal(r2.status, 400);
  const r3 = await api('POST', '/api/calculations', [1, 2]);
  assert.equal(r3.status, 400);
});

test('POST /api/calculations — Telegram imzosi to‘g‘ri bo‘lsa foydalanuvchiga bog‘lanadi', async () => {
  tg.calls.length = 0;
  const initData = initDataFor({ id: 555000111, first_name: 'Ali', last_name: 'Valiyev', username: 'ali' });
  const r = await api('POST', '/api/calculations', { ...validInput, initData });
  assert.equal(r.status, 201);
  assert.equal(r.body.linkedToTelegram, true);
  await settle();
  const users = await db.read('users');
  assert.equal(users.length, 1);
  assert.equal(users[0].telegramId, '555000111');
  assert.equal(users[0].source, 'webapp');
  // yangi mijoz + yangi hisoblash — har biri 2 adminga
  assert.equal(tg.calls.filter((c) => /YANGI MIJOZ/.test(c.text)).length, 2);
  assert.equal(tg.calls.filter((c) => /YANGI HISOBLASH/.test(c.text)).length, 2);
  assert.match(tg.calls.find((c) => /YANGI HISOBLASH/.test(c.text)).text, /Ali Valiyev[\s\S]*555000111[\s\S]*75 kg[\s\S]*175 cm/);
});

test('soxta imzo — Telegram ID ga ishonilmaydi', async () => {
  const forged = initDataFor({ id: 999, first_name: 'Hacker' }).replace(/hash=[a-f0-9]+/, 'hash=' + 'a'.repeat(64));
  const r = await api('POST', '/api/calculations', { ...validInput, initData: forged });
  assert.equal(r.status, 201);
  assert.equal(r.body.linkedToTelegram, false);
  const r2 = await api('POST', '/api/users', { initData: forged });
  assert.equal(r2.status, 401);
  const old = signInitData({ auth_date: '1000', user: JSON.stringify({ id: 5, first_name: 'X' }) }, TEST_BOT_TOKEN);
  assert.equal((await api('POST', '/api/users', { initData: old })).status, 401);
  assert.ok(!(await db.read('users')).some((u) => u.telegramId === '999'));
});

test('POST /api/users — Web App orqali ro‘yxat, dublikat yaratilmaydi', async () => {
  const initData = initDataFor({ id: 777888999, first_name: 'Dilnoza', username: 'dilnoza' });
  const r1 = await api('POST', '/api/users', { initData });
  assert.equal(r1.status, 201);
  assert.equal(r1.body.isNew, true);
  const r2 = await api('POST', '/api/users', { initData });
  assert.equal(r2.status, 200);
  assert.equal(r2.body.isNew, false);
  assert.equal((await db.read('users')).filter((u) => u.telegramId === '777888999').length, 1);
  assert.equal((await api('POST', '/api/users', {})).status, 400);
});

test('admin yo‘llari tokensiz 401', async () => {
  for (const url of ['/api/users', '/api/users/1', '/api/calculations', '/api/calculations/1', '/api/admin/stats']) {
    const r = await api('GET', url);
    assert.equal(r.status, 401, url);
  }
  assert.equal((await api('GET', '/api/admin/stats', undefined, { Authorization: 'Bearer abc.def.ghi' })).status, 401);
});

test('POST /api/auth/login — noto‘g‘ri va to‘g‘ri parol', async () => {
  assert.equal((await api('POST', '/api/auth/login', { username: 'admin', password: 'wrong-pass' })).status, 401);
  assert.equal((await api('POST', '/api/auth/login', { username: 'admin' })).status, 400);
  const r = await api('POST', '/api/auth/login', { username: 'admin', password: 'super-secret-pass' });
  assert.equal(r.status, 200);
  assert.ok(r.body.token);
  assert.equal(JSON.stringify(r.body).includes('super-secret-pass'), false, 'parol javobda bo‘lmasligi kerak');
  token = r.body.token;
  const admins = await db.read('admins');
  assert.equal(admins[0].username, 'admin');
  assert.equal(admins[0].loginCount, 1);
  assert.equal('password' in admins[0], false);
});

test('GET /api/admin/stats', async () => {
  const r = await api('GET', '/api/admin/stats', undefined, auth());
  assert.equal(r.status, 200);
  assert.equal(r.body.totalUsers, 2);
  assert.equal(r.body.todayUsers, 2);
  assert.equal(r.body.totalCalculations, 3);
  assert.equal(r.body.todayCalculations, 3);
  assert.equal(r.body.bySource.webapp, 2);
});

test('GET /api/users — qidiruv (ism, username, ID) va sahifalash', async () => {
  for (let i = 0; i < 25; i++) {
    await upsertTelegramUser({ id: 100000 + i, first_name: `Mijoz${i}`, username: `user_${i}` }, { source: 'instagram' });
  }
  const p1 = await api('GET', '/api/users?page=1&limit=10', undefined, auth());
  assert.equal(p1.status, 200);
  assert.equal(p1.body.total, 27);
  assert.equal(p1.body.items.length, 10);
  assert.equal(p1.body.totalPages, 3);
  assert.equal(p1.body.items[0].id, 27); // eng yangisi birinchi
  const p3 = await api('GET', '/api/users?page=3&limit=10', undefined, auth());
  assert.equal(p3.body.items.length, 7);

  const byName = await api('GET', '/api/users?search=valiyev', undefined, auth());
  assert.equal(byName.body.total, 1);
  assert.equal(byName.body.items[0].calculationsCount, 1);
  const byUsername = await api('GET', `/api/users?search=${encodeURIComponent('@dilnoza')}`, undefined, auth());
  assert.equal(byUsername.body.items[0].firstName, 'Dilnoza');
  const byId = await api('GET', '/api/users?search=100007', undefined, auth());
  assert.equal(byId.body.items[0].username, 'user_7');
  const none = await api('GET', '/api/users?search=yoqodam', undefined, auth());
  assert.equal(none.body.total, 0);
  assert.equal((await api('GET', '/api/users?limit=abc&page=-1', undefined, auth())).status, 200);
});

test('GET /api/users/:id va GET /api/calculations/:userId — tarix', async () => {
  const ali = (await db.read('users')).find((u) => u.telegramId === '555000111');
  await api('POST', '/api/calculations', { ...validInput, weight: 80, initData: initDataFor({ id: 555000111, first_name: 'Ali', last_name: 'Valiyev', username: 'ali' }) });

  const u = await api('GET', `/api/users/${ali.id}`, undefined, auth());
  assert.equal(u.status, 200);
  assert.equal(u.body.user.telegramId, '555000111');
  assert.equal(u.body.stats.calculationsCount, 2);

  const h = await api('GET', `/api/calculations/${ali.id}`, undefined, auth());
  assert.equal(h.status, 200);
  assert.equal(h.body.total, 2);
  assert.equal(h.body.items[0].weight, 80); // eng yangisi birinchi
  assert.ok(h.body.items.every((c) => c.userId === ali.id));

  assert.equal((await api('GET', '/api/users/9999', undefined, auth())).status, 404);
  assert.equal((await api('GET', '/api/users/abc', undefined, auth())).status, 400);
  assert.equal((await api('GET', '/api/calculations/9999', undefined, auth())).status, 404);

  const all = await api('GET', '/api/calculations', undefined, auth());
  assert.equal(all.body.total, 4);
  assert.equal(all.body.items[0].user.firstName, 'Ali');
});

test('noma’lum API yo‘li 404', async () => {
  const r = await api('GET', '/api/nothing-here');
  assert.equal(r.status, 404);
  assert.ok(r.body.error);
});

test('login cheklovi: 10 ta noto‘g‘ri urinishdan keyin 429', async () => {
  let last;
  for (let i = 0; i < 11; i++) last = await api('POST', '/api/auth/login', { username: 'admin', password: 'wrong' + i });
  assert.equal(last.status, 429);
});
