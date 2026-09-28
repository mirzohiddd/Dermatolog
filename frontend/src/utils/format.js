const TIMEZONE = 'Asia/Tashkent';

/** 2350 → "2 350" */
export function formatNumber(value, decimals = 0) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const fixed = Number(value).toFixed(decimals);
  const [int, frac] = fixed.split('.');
  // Uzilmaydigan probel — "2 350" hech qachon ikki qatorga bo‘linmaydi
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
  return frac ? `${grouped}.${frac}` : grouped;
}

/** ISO sana → "28.09.2026 21:45" (Toshkent vaqti) */
export function formatDateTime(iso) {
  if (!iso) return '—';
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  );
  return `${parts.day}.${parts.month}.${parts.year} ${parts.hour}:${parts.minute}`;
}

export function fullName(user) {
  if (!user) return '';
  return [user.firstName, user.lastName].filter(Boolean).join(' ');
}

const SOURCES = { instagram: 'Instagram', direct: 'To‘g‘ridan-to‘g‘ri', webapp: 'Web App', telegram: 'Telegram' };
export function formatSource(source) {
  if (!source) return 'Noma’lum';
  return SOURCES[source] || source.charAt(0).toUpperCase() + source.slice(1);
}
