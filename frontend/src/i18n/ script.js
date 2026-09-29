/**
 * LOTIN / KIRILL YOZUVI
 *
 * Barcha matnlar kodda lotincha yoziladi. Kirill tanlanganda `t()` ularni
 * avtomatik kirillga o‘giradi. Standart holat — kirill.
 * Tanlov brauzerda eslab qolinadi (localStorage).
 *
 * Qaysidir so‘z noto‘g‘ri o‘girilsa — WORDS, PHRASES yoki STEMS ro‘yxatiga qo‘shing.
 */
import { ref } from 'vue';

const STORAGE_KEY = 'kk-script';
export const SCRIPTS = [
  { key: 'cyrl', label: 'Кирилл' },
  { key: 'latn', label: 'Lotin' },
];
const DEFAULT_SCRIPT = 'cyrl';

function readSaved() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return SCRIPTS.some((s) => s.key === saved) ? saved : DEFAULT_SCRIPT;
  } catch {
    return DEFAULT_SCRIPT;
  }
}

export const script = ref(readSaved());
applyLang(script.value);

function applyLang(value) {
  if (typeof document !== 'undefined') document.documentElement.lang = value === 'cyrl' ? 'uz-Cyrl' : 'uz-Latn';
}

export function setScript(value) {
  if (!SCRIPTS.some((s) => s.key === value)) return;
  script.value = value;
  applyLang(value);
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* maxfiy rejim — eslab qolinmaydi, lekin ishlayveradi */
  }
}

/** Matnni tanlangan yozuvda qaytaradi. */
export function t(text) {
  if (!text) return text ?? '';
  return script.value === 'cyrl' ? toCyrillic(String(text)) : String(text);
}

/* ---------------- Lotin → Kirill ---------------- */

/** Butun ibora bo‘yicha almashtirish (birinchi bo‘lib qo‘llanadi). */
const PHRASES = [['Mifflin–St Jeor', 'Миффлин–Сан Жеор']];

/** Aynan shu so‘zlar (katta-kichik harf farqi bilan). */
const WORDS = {
  kcal: 'ккал',
  BMI: 'ТВИ',
  BMR: 'BMR',
  TDEE: 'TDEE',
  I: 'I',
  II: 'II',
  III: 'III',
};

/** So‘z boshi bo‘yicha (kichik harfda): kalkulyatori → калькулятори. */
const STEMS = [['kalkulyator', 'калькулятор']];

const APOSTROPHES = new Set(["'", '‘', '’', 'ʻ', 'ʼ', '`']);
const HARD_VOWELS = new Set(['a', 'o', 'u', 'e']); // bulardan keyin "e" → "э"

const SINGLE = {
  a: 'а', b: 'б', c: 'ц', d: 'д', e: 'е', f: 'ф', g: 'г', h: 'ҳ', i: 'и', j: 'ж', k: 'к', l: 'л', m: 'м',
  n: 'н', o: 'о', p: 'п', q: 'қ', r: 'р', s: 'с', t: 'т', u: 'у', v: 'в', w: 'в', x: 'х', y: 'й', z: 'з',
};
const Y_PAIRS = { o: 'ё', u: 'ю', a: 'я', e: 'е' };

const WORD_RE = /[A-Za-z]+(?:['‘’ʻʼ`][A-Za-z]*)*/g;

function applyCase(cyr, source, allCaps) {
  if (allCaps) return cyr.toUpperCase();
  const first = source[0];
  if (first !== first.toLowerCase()) return cyr.charAt(0).toUpperCase() + cyr.slice(1);
  return cyr;
}

function transliterateWord(word) {
  if (Object.hasOwn(WORDS, word)) return WORDS[word];
  const lower = word.toLowerCase();
  const allCaps = word.length > 1 && word === word.toUpperCase();

  let prefix = '';
  let start = 0;
  for (const [lat, cyr] of STEMS) {
    if (lower.startsWith(lat)) {
      prefix = applyCase(cyr, word, allCaps);
      start = lat.length;
      break;
    }
  }

  let out = prefix;
  for (let i = start; i < word.length; ) {
    const ch = lower[i];
    const next = lower[i + 1];
    const prev = i === 0 ? null : lower[i - 1];
    let cyr;
    let len = 1;

    if ((ch === 'o' || ch === 'g') && APOSTROPHES.has(next)) {
      cyr = ch === 'o' ? 'ў' : 'ғ';
      len = 2;
    } else if ((ch === 's' || ch === 'c') && next === 'h') {
      cyr = ch === 's' ? 'ш' : 'ч';
      len = 2;
    } else if (ch === 'y' && Y_PAIRS[next] && !APOSTROPHES.has(lower[i + 2])) {
      cyr = Y_PAIRS[next];
      len = 2;
    } else if (ch === 't' && next === 's' && prev === 'i' && lower[i + 2] === 'i') {
      cyr = 'ц'; // defitsit → дефицит, koeffitsient → коэффициент
      len = 2;
    } else if (ch === 'e') {
      cyr = prev === null || HARD_VOWELS.has(prev) ? 'э' : 'е';
    } else if (APOSTROPHES.has(ch)) {
      cyr = 'ъ';
    } else {
      cyr = SINGLE[ch] ?? word[i];
    }

    out += applyCase(cyr, word.slice(i, i + len), allCaps);
    i += len;
  }
  return out;
}

export function toCyrillic(text) {
  let result = text;
  for (const [lat, cyr] of PHRASES) result = result.split(lat).join(cyr);
  return result.replace(WORD_RE, transliterateWord);
}