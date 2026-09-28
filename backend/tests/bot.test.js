import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import { ADMIN_1, ADMIN_2, setupTestEnv } from './helpers.js';

setupTestEnv();
const { createBot } = await import('../src/bot/index.js');
const { Telegram } = await import('telegraf');
const { db } = await import('../src/services/db.js');
const { setTelegramClient, notifyNewCalculation } = await import('../src/services/notificationService.js');
const { createCalculation } = await import('../src/services/calculationService.js');

const calls = [];
let bot;
let updateId = 1;

before(async () => {
  await db.init();
  bot = createBot({ token: process.env.BOT_TOKEN, webAppUrl: 'https://kaloriya.example.com' });
  bot.botInfo = { id: 1, is_bot: true, first_name: 'Test', username: 'kaloriya_test_bot' };
  // Telegram API ga ketadigan barcha so‘rovlarni ushlaymiz (har bir update yangi Telegram obyekti yaratadi)
  Telegram.prototype.callApi = async function (method, payload) {
    if (this.options?.__fail) return this.options.__fail(method, payload);
    calls.push({ method, ...payload });
    return { message_id: calls.length, date: 0, chat: { id: payload.chat_id } };
  };
  setTelegramClient(bot.telegram);
});

const settle = () => new Promise((r) => setTimeout(r, 30));
function start(from, text = '/start') {
  return bot.handleUpdate({
    update_id: updateId++,
    message: {
      message_id: updateId,
      date: Math.floor(Date.now() / 1000),
      chat: { id: from.id, type: 'private' },
      from: { is_bot: false, ...from },
      text,
      entities: [{ type: 'bot_command', offset: 0, length: 6 }],
    },
  });
}
const ali = { id: 123456789, first_name: 'Ali', last_name: 'Valiyev', username: 'ali' };

test('/start instagram — foydalanuvchi source=instagram bilan saqlanadi', async () => {
  await start(ali, '/start instagram');
  await settle();
  const users = await db.read('users');
  assert.equal(users.length, 1);
  assert.deepEqual(
    { telegramId: users[0].telegramId, username: users[0].username, firstName: users[0].firstName, lastName: users[0].lastName, source: users[0].source },
    { telegramId: '123456789', username: 'ali', firstName: 'Ali', lastName: 'Valiyev', source: 'instagram' },
  );
});

test('xush kelibsiz xabari + Web App tugmasi', () => {
  const welcome = calls.find((c) => c.method === 'sendMessage' && c.chat_id === ali.id);
  assert.ok(welcome, 'foydalanuvchiga javob yuborilishi kerak');
  assert.match(welcome.text, /^Assalomu alaykum! 👋/);
  assert.match(welcome.text, /Sog‘lom hayot sari birinchi qadamni bugun boshlang\./);
  assert.match(welcome.text, /Siz uchun maxsus kaloriya kalkulyatorini tayyorladik\./);
  const button = welcome.reply_markup.inline_keyboard[0][0];
  assert.equal(button.text, '🧮 KALKULYATORNI OCHISH');
  assert.equal(button.web_app.url, 'https://kaloriya.example.com');
});

test('ikkala adminga YANGI MIJOZ xabari', () => {
  const notes = calls.filter((c) => /YANGI MIJOZ/.test(c.text || ''));
  assert.deepEqual(notes.map((n) => String(n.chat_id)).sort(), [ADMIN_1, ADMIN_2].sort());
  const t = notes[0].text;
  assert.match(t, /👤 Ism: Ali Valiyev/);
  assert.match(t, /🔹 Username: @ali/);
  assert.match(t, /🆔 Telegram ID: <code>123456789<\/code>/);
  assert.match(t, /📍 Source: Instagram/);
  assert.match(t, /📅 Sana: \d{2}\.\d{2}\.\d{4} \d{2}:\d{2}/);
  assert.match(t, /#1$/);
  assert.equal(notes[0].parse_mode, 'HTML');
});

test('qayta /start — dublikat yo‘q, lastActiveAt yangilanadi, adminlarga qayta xabar yo‘q', async () => {
  const before = (await db.read('users'))[0];
  calls.length = 0;
  await new Promise((r) => setTimeout(r, 15));
  await start({ ...ali, username: 'ali_new' }, '/start');
  await settle();
  const users = await db.read('users');
  assert.equal(users.length, 1);
  assert.ok(users[0].lastActiveAt > before.lastActiveAt);
  assert.equal(users[0].startedAt, before.startedAt);
  assert.equal(users[0].source, 'instagram', 'birinchi manba saqlanib qolishi kerak');
  assert.equal(users[0].username, 'ali_new');
  assert.equal(calls.filter((c) => /YANGI MIJOZ/.test(c.text || '')).length, 0);
});

test('/start (payloadsiz) — source=direct; xavfli payload tozalanadi', async () => {
  await start({ id: 222333444, first_name: 'Vali' }, '/start');
  await start({ id: 222333445, first_name: '<b>X</b>' }, '/start ../../etc');
  await settle();
  const users = await db.read('users');
  assert.equal(users.find((u) => u.telegramId === '222333444').source, 'direct');
  assert.equal(users.find((u) => u.telegramId === '222333445').source, 'direct');
  const note = calls.find((c) => /YANGI MIJOZ/.test(c.text || '') && /222333445/.test(c.text));
  assert.match(note.text, /&lt;b&gt;X&lt;\/b&gt;/, 'HTML ekranlashtirilishi kerak');
  assert.match(note.text, /Username: —/);
});

test('oddiy matn yozilsa — kalkulyator tugmasi qayta yuboriladi', async () => {
  calls.length = 0;
  await bot.handleUpdate({
    update_id: updateId++,
    message: { message_id: 99, date: 0, chat: { id: ali.id, type: 'private' }, from: { is_bot: false, ...ali }, text: 'salom' },
  });
  assert.equal(calls[0].reply_markup.inline_keyboard[0][0].text, '🧮 KALKULYATORNI OCHISH');
});

test('hisoblash bo‘yicha ikkala adminga YANGI HISOBLASH xabari', async () => {
  calls.length = 0;
  const { calculation, user } = await createCalculation(
    { sex: 'male', age: 25, height: 175, weight: 75, activity: 'moderate', goal: 'lose15' },
    { telegramId: '123456789', firstName: 'Ali', lastName: 'Valiyev', username: 'ali' },
  );
  await notifyNewCalculation(calculation, user);
  const notes = calls.filter((c) => /YANGI HISOBLASH/.test(c.text || ''));
  assert.equal(notes.length, 2);
  assert.match(notes[0].text, /👤 Ali Valiyev\n🆔 Telegram ID: <code>123456789<\/code>\n\n⚖️ Vazn: 75 kg\n📏 Bo‘y: 175 cm\n🎂 Yosh: 25\n\n🔥 Calories: 2 271 kcal\n📊 BMI: 24\.5/);
  assert.equal((await db.read('users')).filter((u) => u.telegramId === '123456789').length, 1);
});

test('http (lokal) manzil — oddiy havola tugmasi; Telegram rad etsa matn yuboriladi', async () => {
  const local = createBot({ token: process.env.BOT_TOKEN, webAppUrl: 'http://localhost:5173' });
  local.botInfo = bot.botInfo;
  const sent = [];
  local.telegram.options.__fail = async (method, payload) => {
    sent.push(payload);
    if (payload.reply_markup) throw Object.assign(new Error('Bad Request'), { description: 'Bad Request: wrong HTTP URL' });
    return { message_id: 1 };
  };
  await local.handleUpdate({
    update_id: updateId++,
    message: { message_id: 1, date: 0, chat: { id: 5, type: 'private' }, from: { id: 5, is_bot: false, first_name: 'L' }, text: '/start', entities: [{ type: 'bot_command', offset: 0, length: 6 }] },
  });
  assert.equal(sent[0].reply_markup.inline_keyboard[0][0].url, 'http://localhost:5173');
  assert.match(sent[1].text, /Kalkulyator: http:\/\/localhost:5173/);
});
