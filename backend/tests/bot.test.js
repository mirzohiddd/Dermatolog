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
function sendText(from, text) {
  return bot.handleUpdate({
    update_id: updateId++,
    message: { message_id: updateId, date: 0, chat: { id: from.id, type: 'private' }, from: { is_bot: false, ...from }, text },
  });
}
function press(fromId, data, messageId = 1) {
  return bot.handleUpdate({
    update_id: updateId++,
    callback_query: {
      id: String(updateId),
      from: { id: Number(fromId), is_bot: false, first_name: 'Admin', username: 'boss' },
      chat_instance: '1',
      data,
      message: { message_id: messageId, date: 0, chat: { id: Number(fromId), type: 'private' }, text: 'x' },
    },
  });
}
const userOf = async (id) => (await db.read('users')).find((u) => u.telegramId === String(id));
const adminNotes = () => calls.filter((c) => c.method === 'sendMessage' && /Yangi foydalanuvchi/.test(c.text || ''));
const toUser = (id) => calls.filter((c) => c.method === 'sendMessage' && String(c.chat_id) === String(id));

const ali = { id: 123456789, first_name: 'Ali', last_name: 'Valiyev', username: 'ali' };

test('/start instagram — foydalanuvchi pending va source=instagram bilan saqlanadi', async () => {
  await start(ali, '/start instagram');
  await settle();
  const users = await db.read('users');
  assert.equal(users.length, 1);
  assert.deepEqual(
    {
      telegramId: users[0].telegramId,
      username: users[0].username,
      firstName: users[0].firstName,
      lastName: users[0].lastName,
      source: users[0].source,
      status: users[0].status,
    },
    { telegramId: '123456789', username: 'ali', firstName: 'Ali', lastName: 'Valiyev', source: 'instagram', status: 'pending' },
  );
});

test('pending foydalanuvchiga kalkulyator tugmasi YUBORILMAYDI, "Admin ruxsatini kuting"', () => {
  const replies = toUser(ali.id);
  assert.equal(replies.length, 1);
  assert.match(replies[0].text, /Admin ruxsatini kuting/);
  assert.equal(replies[0].reply_markup, undefined);
});

test('ikkala adminga "Yangi foydalanuvchi" xabari tugmalar bilan', () => {
  const notes = adminNotes();
  assert.deepEqual(notes.map((n) => String(n.chat_id)).sort(), [ADMIN_1, ADMIN_2].sort());
  const t = notes[0].text;
  assert.match(t, /🆕 <b>Yangi foydalanuvchi<\/b>/);
  assert.match(t, /👤 Ism: Ali Valiyev/);
  assert.match(t, /🔗 Username: @ali/);
  assert.match(t, /🆔 Telegram ID: <code>123456789<\/code>/);
  assert.match(t, /📍 Source: Instagram/);
  assert.match(t, /⏳ Status: Pending/);
  assert.equal(notes[0].parse_mode, 'HTML');
  const [approve, reject] = notes[0].reply_markup.inline_keyboard[0];
  assert.equal(approve.text, '✅ RUXSAT BERISH');
  assert.equal(approve.callback_data, 'access:approve:123456789');
  assert.equal(reject.text, '❌ RAD ETISH');
  assert.equal(reject.callback_data, 'access:reject:123456789');
});

test('qayta /start (pending) — dublikat yo‘q, adminlarga qayta xabar yo‘q, "Admin ruxsatini kuting"', async () => {
  const before = await userOf(ali.id);
  calls.length = 0;
  await new Promise((r) => setTimeout(r, 15));
  await start({ ...ali, username: 'ali_new' }, '/start');
  await sendText({ ...ali, username: 'ali_new' }, 'salom');
  await settle();
  const users = await db.read('users');
  assert.equal(users.length, 1);
  assert.ok(users[0].lastActiveAt > before.lastActiveAt);
  assert.equal(users[0].startedAt, before.startedAt);
  assert.equal(users[0].source, 'instagram', 'birinchi manba saqlanib qolishi kerak');
  assert.equal(users[0].username, 'ali_new');
  assert.equal(adminNotes().length, 0);
  const replies = toUser(ali.id);
  assert.equal(replies.length, 2);
  assert.ok(replies.every((r) => /Admin ruxsatini kuting/.test(r.text) && !r.reply_markup));
});

test('admin bo‘lmagan odam tugmani bossa — rad etiladi, status o‘zgarmaydi', async () => {
  calls.length = 0;
  await press('987654321', 'access:approve:123456789');
  await settle();
  assert.equal((await userOf(ali.id)).status, 'pending');
  const answer = calls.find((c) => c.method === 'answerCallbackQuery');
  assert.match(answer.text, /faqat adminlar/);
  assert.equal(answer.show_alert, true);
  assert.equal(toUser(ali.id).length, 0);
});

test('admin RUXSAT BERISH — approved, userga kalkulyator tugmasi, ikkala admin xabari yangilanadi', async () => {
  const msgIds = (await userOf(ali.id)).adminMessages;
  assert.equal(msgIds.length, 2);
  calls.length = 0;
  await press(ADMIN_1, 'access:approve:123456789', msgIds[0].messageId);
  await settle();

  const saved = await userOf(ali.id);
  assert.equal(saved.status, 'approved');
  assert.equal(saved.statusUpdatedBy, ADMIN_1);

  const msg = toUser(ali.id);
  assert.equal(msg.length, 1);
  assert.match(msg[0].text, /ruxsat berildi/);
  const button = msg[0].reply_markup.inline_keyboard[0][0];
  assert.equal(button.text, '🧮 KALKULYATORNI OCHISH');
  assert.equal(button.web_app.url, 'https://kaloriya.example.com');

  const edits = calls.filter((c) => c.method === 'editMessageText');
  assert.equal(edits.length, 2, 'ikkala admindagi xabar yangilanishi kerak');
  assert.match(edits[0].text, /✅ Status: Approved/);
  assert.deepEqual(edits[0].reply_markup.inline_keyboard[0].map((b) => b.callback_data), ['access:reject:123456789']);
  assert.match(calls.find((c) => c.method === 'answerCallbackQuery').text, /Ruxsat berildi/);
});

test('ikkinchi admin ham RUXSAT BERISH bossa — userga qayta xabar yuborilmaydi', async () => {
  calls.length = 0;
  await press(ADMIN_2, 'access:approve:123456789');
  await settle();
  assert.equal(toUser(ali.id).length, 0);
  assert.match(calls.find((c) => c.method === 'answerCallbackQuery').text, /Allaqachon/);
});

test('approved: /start — xush kelibsiz + Web App tugmasi; matn — tugma', async () => {
  calls.length = 0;
  await start(ali);
  await sendText(ali, 'salom');
  const [welcome, reminder] = toUser(ali.id);
  assert.match(welcome.text, /^Assalomu alaykum! 👋/);
  assert.match(welcome.text, /Siz uchun maxsus kaloriya kalkulyatorini tayyorladik\./);
  assert.equal(welcome.reply_markup.inline_keyboard[0][0].text, '🧮 KALKULYATORNI OCHISH');
  assert.equal(welcome.reply_markup.inline_keyboard[0][0].web_app.url, 'https://kaloriya.example.com');
  assert.equal(reminder.reply_markup.inline_keyboard[0][0].text, '🧮 KALKULYATORNI OCHISH');
});

test('admin RAD ETISH — rejected, userga xabar, /start → "Sizga ruxsat berilmagan"', async () => {
  const vali = { id: 222333444, first_name: 'Vali' };
  await start(vali);
  await settle();
  calls.length = 0;
  await press(ADMIN_2, 'access:reject:222333444');
  await settle();
  assert.equal((await userOf(vali.id)).status, 'rejected');
  const msg = toUser(vali.id);
  assert.equal(msg.length, 1);
  assert.match(msg[0].text, /ruxsat berilmadi/);
  assert.equal(msg[0].reply_markup, undefined);

  calls.length = 0;
  await start(vali);
  await sendText(vali, 'iltimos');
  await settle();
  const replies = toUser(vali.id);
  assert.equal(replies.length, 2);
  assert.ok(replies.every((r) => /Sizga ruxsat berilmagan/.test(r.text) && !r.reply_markup));
  assert.equal(adminNotes().length, 0, 'rejected foydalanuvchi uchun adminlarga qayta so‘rov yo‘q');
});

test('eski foydalanuvchi (status yo‘q) — pending, adminlarga bir marta so‘rov', async () => {
  await db.update('users', (users) => {
    users.push({ id: 50, telegramId: '600700800', username: null, firstName: 'Eski', lastName: null, source: 'direct', startedAt: new Date().toISOString(), lastActiveAt: new Date().toISOString() });
  });
  calls.length = 0;
  await start({ id: 600700800, first_name: 'Eski' });
  await start({ id: 600700800, first_name: 'Eski' });
  await settle();
  assert.equal((await userOf(600700800)).status, 'pending');
  assert.equal(adminNotes().length, 2, 'ikki admin × bir marta');
  assert.ok(toUser(600700800).every((r) => /Admin ruxsatini kuting/.test(r.text)));
});

test('xavfli payload tozalanadi, ism HTML ekranlanadi, username yo‘q bo‘lsa —', async () => {
  calls.length = 0;
  await start({ id: 222333445, first_name: '<b>X</b>' }, '/start ../../etc');
  await settle();
  assert.equal((await userOf(222333445)).source, 'direct');
  const note = adminNotes().find((c) => /222333445/.test(c.text));
  assert.match(note.text, /&lt;b&gt;X&lt;\/b&gt;/, 'HTML ekranlashtirilishi kerak');
  assert.match(note.text, /Username: —/);
});

test('.env dagi admin /start bossa — avtomatik approved, kalkulyator tugmasi, so‘rov yo‘q', async () => {
  calls.length = 0;
  await start({ id: Number(ADMIN_1), first_name: 'Boss' });
  await settle();
  assert.equal((await userOf(ADMIN_1)).status, 'approved');
  assert.equal(adminNotes().length, 0);
  assert.equal(toUser(ADMIN_1)[0].reply_markup.inline_keyboard[0][0].text, '🧮 KALKULYATORNI OCHISH');
});

test('hisoblash bo‘yicha ikkala adminga YANGI HISOBLASH xabari', async () => {
  calls.length = 0;
  const user = await userOf(ali.id);
  const { calculation } = await createCalculation({ sex: 'male', age: 25, height: 175, weight: 75, activity: 'moderate', goal: 'lose15' }, user);
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
  const adminId = Number(ADMIN_2); // admin — approved
  await local.handleUpdate({
    update_id: updateId++,
    message: { message_id: 1, date: 0, chat: { id: adminId, type: 'private' }, from: { id: adminId, is_bot: false, first_name: 'L' }, text: '/start', entities: [{ type: 'bot_command', offset: 0, length: 6 }] },
  });
  assert.equal(sent[0].reply_markup.inline_keyboard[0][0].url, 'http://localhost:5173');
  assert.match(sent[1].text, /Kalkulyator: http:\/\/localhost:5173/);
});
