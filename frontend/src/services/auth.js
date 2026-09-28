import { reactive } from 'vue';

const KEY = 'kk_admin_session';

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null');
  } catch {
    return null;
  }
}

/** Tokenning amal qilish muddatini (exp) o‘qiydi. */
function tokenExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

export const session = reactive({
  token: load()?.token || null,
  admin: load()?.admin || null,
});

export function isLoggedIn() {
  return Boolean(session.token) && tokenExpiry(session.token) > Date.now();
}

export function saveSession(token, admin) {
  session.token = token;
  session.admin = admin;
  try {
    localStorage.setItem(KEY, JSON.stringify({ token, admin }));
  } catch {
    /* maxfiy rejimda localStorage ishlamasligi mumkin — sessiya xotirada qoladi */
  }
}

export function clearSession() {
  session.token = null;
  session.admin = null;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* e'tiborsiz */
  }
}
