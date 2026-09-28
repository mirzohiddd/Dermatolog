import crypto from 'node:crypto';
import { createApp } from './app.js';
import { createBot, setupMenuButton } from './bot/index.js';
import { config, validateConfig } from './config/env.js';
import { db } from './services/db.js';
import { setTelegramClient } from './services/notificationService.js';

async function main() {
  const { errors, warnings } = validateConfig();
  warnings.forEach((w) => console.warn(`⚠️  ${w}`));
  if (errors.length) {
    console.error('\n❌ .env faylida xatolar bor:');
    errors.forEach((e) => console.error(`   - ${e}`));
    console.error('\n   backend/.env.example ni backend/.env ga nusxalab, to‘ldiring.\n');
    process.exit(1);
  }

  await db.init();
  console.log(`📁 JSON baza: ${config.dataDir}`);

  let bot = null;
  let webhookMiddleware = null;

  if (config.botToken) {
    bot = createBot({ token: config.botToken, webAppUrl: config.webAppUrl });
    setTelegramClient(bot.telegram);

    if (config.webhookDomain) {
      // Production (Render): Telegram yangiliklarni HTTPS orqali o‘zi yuboradi
      const secret = crypto.createHash('sha256').update(config.botToken).digest('hex');
      try {
        webhookMiddleware = await bot.createWebhook({
          domain: config.webhookDomain,
          path: `/telegram/webhook/${secret.slice(0, 32)}`,
          secret_token: secret.slice(32, 64),
          drop_pending_updates: false,
        });
        console.log(`🤖 Bot webhook rejimida: ${config.webhookDomain}`);
      } catch (error) {
        console.error('❌ Webhook o‘rnatilmadi:', error.description || error.message);
      }
    }
  }

  const app = createApp({
    beforeApi: webhookMiddleware ? (a) => a.use(webhookMiddleware) : undefined,
  });

  const server = app.listen(config.port, () => {
    console.log(`🚀 API ishga tushdi: http://localhost:${config.port}`);
  });

  if (bot) {
    await setupMenuButton(bot, config.webAppUrl);
    if (!webhookMiddleware) {
      // Lokal rejim (yoki webhook o‘rnatilmasa): long polling
      bot
        .launch({ dropPendingUpdates: false }, () => {
          console.log(`🤖 Bot ishga tushdi (polling): @${bot.botInfo?.username}`);
          console.log(`   Instagram havolasi: https://t.me/${bot.botInfo?.username}?start=instagram`);
        })
        .catch((error) => {
          console.error('❌ Bot ishga tushmadi:', error.description || error.message);
          console.error('   BOT_TOKEN to‘g‘riligini tekshiring (@BotFather dan olinadi).');
        });
    }
  }

  const shutdown = (signal) => {
    console.log(`\n${signal} — to‘xtatilmoqda...`);
    if (bot && !webhookMiddleware) {
      try {
        bot.stop(signal);
      } catch {
        /* bot ishga tushmagan bo‘lishi mumkin */
      }
    }
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error) => {
  console.error('❌ Server ishga tushmadi:', error);
  process.exit(1);
});
