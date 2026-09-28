import { badRequest } from './httpError.js';

/** URL dagi :id ni musbat butun songa aylantiradi. */
export function parseId(value, name = 'ID') {
  const text = String(value ?? '');
  if (!/^\d{1,9}$/.test(text) || Number(text) < 1) throw badRequest(`${name} noto‘g‘ri`);
  return Number(text);
}

export function parsePagination(query) {
  const page = /^\d{1,6}$/.test(String(query.page ?? '')) ? Math.max(1, Number(query.page)) : 1;
  const rawLimit = /^\d{1,3}$/.test(String(query.limit ?? '')) ? Number(query.limit) : 20;
  const limit = Math.min(Math.max(rawLimit, 1), 100);
  return { page, limit };
}

export function parseSearch(value) {
  if (value === undefined) return '';
  if (typeof value !== 'string') throw badRequest('Qidiruv matni noto‘g‘ri');
  return value.slice(0, 100);
}
