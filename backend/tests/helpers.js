import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const TEST_BOT_TOKEN = '123456:TEST-TOKEN-abcdefghijklmnopqrstuvwxyz';
export const ADMIN_1 = '111111111';
export const ADMIN_2 = '222222222';

/** Har bir test fayli uchun alohida vaqtinchalik baza va sozlamalar. */
export function setupTestEnv() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kaloriya-test-'));
  Object.assign(process.env, {
    NODE_ENV: 'test',
    DATA_DIR: dir,
    BOT_TOKEN: TEST_BOT_TOKEN,
    ADMIN_ID_1: ADMIN_1,
    ADMIN_ID_2: ADMIN_2,
    ADMIN_USERNAME: 'admin',
    ADMIN_PASSWORD: 'super-secret-pass',
    JWT_SECRET: 'x'.repeat(48),
    FRONTEND_URL: 'http://localhost:5173',
    WEBAPP_URL: 'https://kaloriya.example.com',
    NOTIFY_ON_CALCULATION: 'true',
  });
  return dir;
}

/** Telegram API ga ketadigan so‘rovlarni ushlab qoladigan soxta mijoz. */
export function fakeTelegram() {
  const calls = [];
  return {
    calls,
    async sendMessage(chatId, text, extra) {
      calls.push({ method: 'sendMessage', chat_id: String(chatId), text, ...extra });
      return { message_id: calls.length };
    },
    async editMessageText(chatId, messageId, inlineMessageId, text, extra) {
      calls.push({ method: 'editMessageText', chat_id: String(chatId), message_id: messageId, text, ...extra });
      return true;
    },
  };
}
