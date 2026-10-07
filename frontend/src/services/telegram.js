/**
 * Telegram Web App bilan ishlash.
 * Sayt oddiy brauzerda ochilsa — barcha funksiyalar jimgina hech narsa qilmaydi.
 */
function webApp() {
  return typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;
}

export function isInsideTelegram() {
  return Boolean(webApp()?.initData);
}

/** Backend Telegram foydalanuvchisini tasdiqlashi uchun imzolangan satr. */
export function getInitData() {
  return webApp()?.initData || '';
}

export function initTelegram() {
  const tg = webApp();
  if (!tg?.initData) return;
  try {
    tg.ready();
    tg.expand();
    tg.setHeaderColor?.('#ffffff');
    tg.setBackgroundColor?.('#ffffff');
    tg.disableVerticalSwipes?.();
  } catch {
    /* eski Telegram versiyalari */
  }
}

/** Web App oynasini yopadi (botga qaytadi). Telegramdan tashqarida hech narsa qilmaydi. */
export function closeWebApp() {
  try {
    webApp()?.close?.();
  } catch {
    /* qo‘llab-quvvatlanmaydi */
  }
}

export function haptic(type = 'success') {
  try {
    webApp()?.HapticFeedback?.notificationOccurred(type);
  } catch {
    /* qo‘llab-quvvatlanmaydi */
  }
}
