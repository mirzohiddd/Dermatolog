import { Telegraf } from 'telegraf';
import { config } from '../config/env.js';
import { decideAccess, requestAdminApproval } from '../services/accessService.js';
import { fullName } from '../utils/format.js';
import { USER_STATUS, getUserStatus, normalizeSource, upsertTelegramUser } from '../services/userService.js';
import { ACCESS_CALLBACK_RE, calculatorKeyboard } from './keyboards.js';
import { NOT_ADMIN_TEXT, PENDING_NEW_TEXT, PENDING_TEXT, REJECTED_TEXT, REMINDER_TEXT, WELCOME_TEXT } from './messages.js';

/**
 * Kalkulyator tugmasi bilan xabar yuboradi.
 * Telegram tugmani rad etsa (masalan, http://localhost manzil) — havolani matn sifatida yuboradi.
 */
async function replyWithCalculator(ctx, text, webAppUrl) {
  try {
    await ctx.reply(text, calculatorKeyboard(webAppUrl));
  } catch (error) {
    console.warn(`[bot] Tugma yuborilmadi (${error.description || error.message}). Havola matn sifatida yuborildi.`);
    await ctx.reply(`${text}\n\n🧮 Kalkulyator: ${webAppUrl}`);
  }
}

/**
 * Foydalanuvchini saqlaydi va statusiga qarab javob beradi:
 *  - approved → kalkulyator tugmasi
 *  - pending  → "Admin ruxsatini kuting" (adminlarga so‘rov bir marta yuboriladi)
 *  - rejected → "Sizga ruxsat berilmagan"
 */
async function handleUserEntry(ctx, { webAppUrl, source, approvedText }) {
  let user = null;
  let isNew = false;
  try {
    const saved = await upsertTelegramUser(ctx.from, source ? { source } : {});
    user = saved.user;
    isNew = saved.isNew;
    if (isNew) console.log(`[bot] Yangi mijoz #${user.id} (${user.telegramId}), manba: ${user.source}, status: ${user.status}`);
  } catch (error) {
    console.error('[bot] Foydalanuvchini saqlashda xato:', error.message);
    await ctx.reply('Kechirasiz, xatolik yuz berdi. Birozdan keyin /start ni qayta bosing.');
    return;
  }

  const status = getUserStatus(user);

  if (status === USER_STATUS.APPROVED) {
    await replyWithCalculator(ctx, approvedText, webAppUrl);
    return;
  }

  if (status === USER_STATUS.REJECTED) {
    await ctx.reply(REJECTED_TEXT);
    return;
  }

  // pending: adminlarga so‘rov (agar hali yuborilmagan bo‘lsa — dublikat bo‘lmaydi)
  await requestAdminApproval(user);
  await ctx.reply(isNew ? PENDING_NEW_TEXT : PENDING_TEXT);
}

export function createBot({ token, webAppUrl, adminIds = config.adminIds }) {
  const bot = new Telegraf(token);

  bot.start(async (ctx) => {
    if (!ctx.from || ctx.from.is_bot) return;
    if (ctx.chat?.type && ctx.chat.type !== 'private') return;
    // https://t.me/BOT?start=instagram  →  ctx.payload === "instagram"
    const source = normalizeSource(ctx.payload, 'direct');
    await handleUserEntry(ctx, { webAppUrl, source, approvedText: WELCOME_TEXT });
  });

  bot.help(async (ctx) => {
    if (!ctx.from || ctx.from.is_bot) return;
    if (ctx.chat?.type && ctx.chat.type !== 'private') return;
    await handleUserEntry(ctx, { webAppUrl, approvedText: REMINDER_TEXT });
  });

  // Admin tugmalari: ✅ RUXSAT BERISH / ❌ RAD ETISH
  bot.action(ACCESS_CALLBACK_RE, async (ctx) => {
    const adminId = String(ctx.from?.id ?? '');
    if (!adminIds.includes(adminId)) {
      console.warn(`[bot] Admin bo‘lmagan foydalanuvchi (${adminId}) ruxsat tugmasini bosdi`);
      await ctx.answerCbQuery(NOT_ADMIN_TEXT, { show_alert: true }).catch(() => {});
      return;
    }

    const [, action, telegramId] = ctx.match;
    const status = action === 'approve' ? USER_STATUS.APPROVED : USER_STATUS.REJECTED;
    const message = ctx.callbackQuery?.message;
    const sourceMessage = message ? { chatId: String(message.chat.id), messageId: message.message_id } : null;
    const adminName = [fullName({ firstName: ctx.from.first_name, lastName: ctx.from.last_name }), ctx.from.username ? `@${ctx.from.username}` : '']
      .filter(Boolean)
      .join(' ') || `ID ${adminId}`;

    let result;
    try {
      result = await decideAccess({ telegramId, status, adminId, adminName, sourceMessage, webAppUrl });
    } catch (error) {
      console.error('[bot] Statusni o‘zgartirishda xato:', error.message);
      await ctx.answerCbQuery('Xatolik yuz berdi. Qayta urinib ko‘ring.', { show_alert: true }).catch(() => {});
      return;
    }

    if (!result.ok) {
      const text = result.reason === 'not_found' ? 'Foydalanuvchi topilmadi' : NOT_ADMIN_TEXT;
      await ctx.answerCbQuery(text, { show_alert: true }).catch(() => {});
      return;
    }

    let answer;
    if (!result.changed) answer = status === USER_STATUS.APPROVED ? 'Allaqachon ruxsat berilgan' : 'Allaqachon rad etilgan';
    else answer = status === USER_STATUS.APPROVED ? '✅ Ruxsat berildi' : '❌ Rad etildi';
    await ctx.answerCbQuery(answer).catch(() => {});
    console.log(`[bot] Admin ${adminId}: ${telegramId} → ${status}${result.changed ? '' : ' (o‘zgarmadi)'}`);
  });

  // Boshqa har qanday xabarga — statusga qarab javob
  bot.on('message', async (ctx) => {
    if (ctx.chat?.type !== 'private') return;
    if (!ctx.from || ctx.from.is_bot) return;
    await handleUserEntry(ctx, { webAppUrl, approvedText: REMINDER_TEXT });
  });

  bot.catch((error, ctx) => {
    console.error(`[bot] ${ctx.updateType} ishlovida xato:`, error.message);
  });

  return bot;
}

/** Chat pastidagi "Menu" tugmasini Web App ga aylantiradi (faqat HTTPS). */
export async function setupMenuButton(bot, webAppUrl) {
  if (!webAppUrl.startsWith('https://')) return;
  try {
    await bot.telegram.setChatMenuButton({
      menuButton: { type: 'web_app', text: 'Kalkulyator', web_app: { url: webAppUrl } },
    });
    await bot.telegram.setMyCommands([{ command: 'start', description: 'Kalkulyatorni ochish' }]);
  } catch (error) {
    console.warn('[bot] Menu tugmasi sozlanmadi:', error.description || error.message);
  }
}
