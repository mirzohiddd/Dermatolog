import axios from 'axios';
import { clearSession, session } from './auth.js';

const baseURL = `${(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')}/api`;

export const api = axios.create({ baseURL, timeout: 15000 });

api.interceptors.request.use((config) => {
  if (session.token) config.headers.Authorization = `Bearer ${session.token}`;
  return config;
});

let onUnauthorized = null;
/** Router 401 bo‘lganda login sahifasiga yo‘naltirishi uchun. */
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const isLogin = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && session.token && !isLogin) {
      clearSession();
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

/** Foydalanuvchiga ko‘rsatiladigan tushunarli xato matni. */
export function errorMessage(error) {
  if (error?.response?.data?.error) return error.response.data.error;
  if (error?.code === 'ECONNABORTED') return 'Server javob bermadi. Internetni tekshirib, qayta urinib ko‘ring.';
  if (!error?.response) return 'Serverga ulanib bo‘lmadi. Internet aloqasini tekshiring.';
  return 'Kutilmagan xatolik yuz berdi. Qayta urinib ko‘ring.';
}

export const endpoints = {
  registerUser: (initData) => api.post('/users', { initData }),
  calculate: (payload) => api.post('/calculations', payload),
  login: (username, password) => api.post('/auth/login', { username, password }),
  stats: () => api.get('/admin/stats'),
  users: (params) => api.get('/users', { params }),
  user: (id) => api.get(`/users/${id}`),
  calculations: (params) => api.get('/calculations', { params }),
  userCalculations: (userId, params) => api.get(`/calculations/${userId}`, { params }),
};
