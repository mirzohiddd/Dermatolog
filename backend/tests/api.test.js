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
const { setUserStatus, upsertTelegramUser } = await import('../src/services/userService.js');

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

const ALI = { id: 555000111, first_name: 'Ali', last_name: 'Valiyev', username: 'ali' };

test('health', async () => {
  const r = await api('GET', '/api/health');
  assert.equal(r.status, 200);
  assert.equal(r.body.status, 'ok');
});

test('POST /api/calculations — Telegramsiz (initData yo‘q) 401, hech narsa saqlanmaydi', async () => {
  tg.calls.length = 0;
  const r = await api('POST', '/api/calculations', validInput);
  assert.equal(r.status, 401);
  assert.equal(r.body.details.status, 'unauthenticated');
  await settle();
  const saved = JSON.parse(await fs.readFile(path.join(dataDir, 'calculations.json'), 'utf8'));
  assert.equal(saved.length, 0);
  assert.equal(tg.calls.length, 0);
});

test('POST /api/access — initData yo‘q yoki soxta bo‘lsa 401', async () => {
  assert.equal((await api('POST', '/api/access', {})).status, 401);
  const forged = initDataFor({ id: 999, first_name: 'Hacker' }).replace(/hash=[a-f0-9]+/, 'hash=' + 'a'.repeat(64));
  assert.equal((await api('POST', '/api/access', { initData: forged })).status, 401);
  assert.equal((await api('POST', '/api/calculations', { ...validInput, initData: forged })).status, 401);
  const old = signInitData({ auth_date: '1000', user: JSON.stringify({ id: 5, first_name: 'X' }) }, TEST_BOT_TOKEN);
  assert.equal((await api('POST', '/api/access', { initData: old })).status, 401);
  assert.ok(!(await db.read('users')).some((u) => u.telegramId === '999'));
});

test('yangi foydalanuvchi — pending: /api/access va /api/calculations 403, adminlarga BIR MARTA tugmali xabar', async () => {
  tg.calls.length = 0;
  const initData = initDataFor(ALI);

  const a1 = await api('POST', '/api/access', { initData });
  assert.equal(a1.status, 403);
  assert.equal(a1.body.details.status, 'pending');

  const c1 = await api('POST', '/api/calculations', { ...validInput, initData });
  assert.equal(c1.status, 403);
  assert.equal(c1.body.details.status, 'pending');

  await api('POST', '/api/access', { initData });
  await settle();

  const users = await db.read('users');
  assert.equal(users.filter((u) => u.telegramId === '555000111').length, 1, 'dublikat bo‘lmasligi kerak');
  assert.equal(users[0].status, 'pending');
  assert.equal((await db.read('calculations')).length, 0, 'pending foydalanuvchi hisoblay olmaydi');

  const notes = tg.calls.filter((c) => /Yangi foydalanuvchi/.test(c.text || ''));
  assert.deepEqual(notes.map((n) => n.chat_id).sort(), [ADMIN_1, ADMIN_2].sort(), 'har bir adminga faqat bitta xabar');
  assert.match(notes[0].text, /⏳ Status: Pending/);
  const buttons = notes[0].reply_markup.inline_keyboard[0];
  assert.equal(buttons[0].text, '✅ RUXSAT BERISH');
  assert.equal(buttons[0].callback_data, 'access:approve:555000111');
  assert.equal(buttons[1].text, '❌ RAD ETISH');
  assert.equal(buttons[1].callback_data, 'access:reject:555000111');
  assert.equal(tg.calls.filter((c) => /YANGI HISOBLASH/.test(c.text || '')).length, 0);
});

test('approved — /api/access 200, hisoblash saqlanadi va foydalanuvchiga bog‘lanadi', async () => {
  await setUserStatus('555000111', 'approved', { by: ADMIN_1 });
  tg.calls.length = 0;
  const initData = initDataFor(ALI);

  const a = await api('POST', '/api/access', { initData });
  assert.equal(a.status, 200);
  assert.equal(a.body.allowed, true);
  assert.equal(a.body.status, 'approved');

  const r = await api('POST', '/api/calculations', { ...validInput, initData });
  assert.equal(r.status, 201);
  assert.equal(r.body.linkedToTelegram, true);
  assert.equal(r.body.result.bmr, 1724); // 750 + 1093.75 - 125 + 5 = 1723.75
  await settle();
  const saved = await db.read('calculations');
  assert.equal(saved.length, 1);
  assert.equal(saved[0].telegramId, '555000111');
  const notes = tg.calls.filter((c) => /YANGI HISOBLASH/.test(c.text));
  assert.deepEqual(new Set(notes.map((c) => c.chat_id)), new Set([ADMIN_1, ADMIN_2]));
  assert.match(notes[0].text, /Ali Valiyev[\s\S]*555000111[\s\S]*75 kg[\s\S]*175 cm/);
  assert.equal(tg.calls.filter((c) => /Yangi foydalanuvchi/.test(c.text || '')).length, 0, 'qayta so‘rov yuborilmaydi');
});

test('POST /api/calculations — validatsiya xatolari 400 bilan qaytadi (approved foydalanuvchi)', async () => {
  const initData = initDataFor(ALI);
  const r = await api('POST', '/api/calculations', { ...validInput, age: -3, height: '', weight: 'abc', initData });
  assert.equal(r.status, 400);
  assert.equal(r.body.details.age, 'Manfiy son bo‘lishi mumkin emas');
  assert.equal(r.body.details.height, 'Bo‘yingizni kiriting');
  assert.equal(r.body.details.weight, 'Faqat raqam kiriting');
  const r2 = await api('POST', '/api/calculations', '{ noto‘g‘ri json');
  assert.equal(r2.status, 400);
  const r3 = await api('POST', '/api/calculations', [1, 2]);
  assert.equal(r3.status, 401);
});

test('rejected — 403, hisoblash saqlanmaydi', async () => {
  const user = { id: 444000222, first_name: 'Rad' };
  await upsertTelegramUser(user);
  await setUserStatus('444000222', 'rejected', { by: ADMIN_2 });
  const initData = initDataFor(user);
  const a = await api('POST', '/api/access', { initData });
  assert.equal(a.status, 403);
  assert.equal(a.body.details.status, 'rejected');
  const c = await api('POST', '/api/calculations', { ...validInput, initData });
  assert.equal(c.status, 403);
  assert.equal((await db.read('calculations')).filter((x) => x.telegramId === '444000222').length, 0);
});

test('eski foydalanuvchi (status yo‘q) — pending deb hisoblanadi', async () => {
  await db.update('users', (users) => {
    users.push({ id: 900, telegramId: '333000999', username: null, firstName: 'Eski', lastName: null, source: 'direct', startedAt: new Date().toISOString(), lastActiveAt: new Date().toISOString() });
  });
  const r = await api('POST', '/api/access', { initData: initDataFor({ id: 333000999, first_name: 'Eski' }) });
  assert.equal(r.status, 403);
  assert.equal(r.body.details.status, 'pending');
  const saved = (await db.read('users')).find((u) => u.telegramId === '333000999');
  assert.equal(saved.status, 'pending');
});

test('.env dagi admin — avtomatik approved', async () => {
  const r = await api('POST', '/api/access', { initData: initDataFor({ id: Number(ADMIN_1), first_name: 'Admin' }) });
  assert.equal(r.status, 200);
  assert.equal((await db.read('users')).find((u) => u.telegramId === ADMIN_1).status, 'approved');
});

test('POST /api/users — Web App orqali ro‘yxat, dublikat yaratilmaydi, status qaytadi', async () => {
  const initData = initDataFor({ id: 777888999, first_name: 'Dilnoza', username: 'dilnoza' });
  const r1 = await api('POST', '/api/users', { initData });
  assert.equal(r1.status, 201);
  assert.equal(r1.body.isNew, true);
  assert.equal(r1.body.user.status, 'pending');
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
  const users = await db.read('users');
  const r = await api('GET', '/api/admin/stats', undefined, auth());
  assert.equal(r.status, 200);
  assert.equal(r.body.totalUsers, users.length);
  assert.equal(r.body.totalCalculations, 1);
  assert.equal(r.body.todayCalculations, 1);
  assert.equal(r.body.bySource.webapp, 3);
});

test('GET /api/users — qidiruv (ism, username, ID), sahifalash va status', async () => {
  const before = (await db.read('users')).length;
  for (let i = 0; i < 25; i++) {
    await upsertTelegramUser({ id: 100000 + i, first_name: `Mijoz${i}`, username: `user_${i}` }, { source: 'instagram' });
  }
  const total = before + 25;
  const p1 = await api('GET', '/api/users?page=1&limit=10', undefined, auth());
  assert.equal(p1.status, 200);
  assert.equal(p1.body.total, total);
  assert.equal(p1.body.items.length, 10);
  assert.equal(p1.body.totalPages, Math.ceil(total / 10));
  assert.equal(p1.body.items[0].status, 'pending');

  const byName = await api('GET', '/api/users?search=valiyev', undefined, auth());
  assert.equal(byName.body.total, 1);
  assert.equal(byName.body.items[0].calculationsCount, 1);
  assert.equal(byName.body.items[0].status, 'approved');
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
  await api('POST', '/api/calculations', { ...validInput, weight: 80, initData: initDataFor(ALI) });

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
  assert.equal(all.body.total, 2);
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
