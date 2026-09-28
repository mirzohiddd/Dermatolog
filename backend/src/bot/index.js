import { Telegraf } from 'telegraf';
import { notifyNewUser } from '../services/notificationService.js';
import { normalizeSource, upsertTelegramUser } from '../services/userService.js';
import { calculatorKeyboard } from './keyboards.js';
import { REMINDER_TEXT, WELCOME_TEXT } from './messages.js';

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

export function createBot({ token, webAppUrl }) {
  const bot = new Telegraf(token);

  bot.start(async (ctx) => {
    if (!ctx.from || ctx.from.is_bot) return;
    // https://t.me/BOT?start=instagram  →  ctx.payload === "instagram"
    const source = normalizeSource(ctx.payload, 'direct');

    try {
      const { user, isNew } = await upsertTelegramUser(ctx.from, { source });
      if (isNew) {
        console.log(`[bot] Yangi mijoz #${user.id} (${user.telegramId}), manba: ${user.source}`);
        notifyNewUser(user);
      }
    } catch (error) {
      console.error('[bot] Foydalanuvchini saqlashda xato:', error.message);
    }

    await replyWithCalculator(ctx, WELCOME_TEXT, webAppUrl);
  });

  bot.help((ctx) => replyWithCalculator(ctx, REMINDER_TEXT, webAppUrl));

  // Boshqa har qanday matnli xabarga — kalkulyator tugmasi
  bot.on('message', async (ctx) => {
    if (ctx.chat?.type !== 'private') return;
    if (ctx.from && !ctx.from.is_bot) {
      try {
        // Yangi bo‘lsa ro‘yxatga olinadi, eski bo‘lsa lastActiveAt yangilanadi
        const { user, isNew } = await upsertTelegramUser(ctx.from);
        if (isNew) notifyNewUser(user);
      } catch (error) {
        console.error('[bot] Foydalanuvchini saqlashda xato:', error.message);
      }
    }
    await replyWithCalculator(ctx, REMINDER_TEXT, webAppUrl);
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
