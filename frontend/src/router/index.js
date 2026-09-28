import { createRouter, createWebHistory } from 'vue-router';
import { setUnauthorizedHandler } from '../services/api.js';
import { isLoggedIn } from '../services/auth.js';
import HomeView from '../views/HomeView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView, meta: { title: 'Kaloriya kalkulyatori — Komoliddin Kozimxonovich' } },
    {
      path: '/admin/login',
      name: 'admin-login',
      component: () => import('../views/AdminLoginView.vue'),
      meta: { title: 'Admin — kirish', guestOnly: true },
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('../views/AdminDashboardView.vue'),
      meta: { title: 'Admin panel', requiresAuth: true },
    },
    {
      path: '/admin/users/:id(\\d+)',
      name: 'admin-user',
      component: () => import('../views/AdminUserView.vue'),
      meta: { title: 'Mijoz ma’lumotlari', requiresAuth: true },
    },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('../views/NotFoundView.vue'), meta: { title: 'Sahifa topilmadi' } },
  ],
  scrollBehavior(to, from, saved) {
    return saved || { top: 0 };
  },
});

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !isLoggedIn()) {
    return { name: 'admin-login', query: to.fullPath !== '/admin' ? { redirect: to.fullPath } : {} };
  }
  if (to.meta.guestOnly && isLoggedIn()) return { name: 'admin' };
  return true;
});

router.afterEach((to) => {
  document.title = to.meta.title || 'Kaloriya kalkulyatori';
});

setUnauthorizedHandler(() => {
  const current = router.currentRoute.value;
  if (current.meta.requiresAuth) router.replace({ name: 'admin-login', query: { redirect: current.fullPath, expired: '1' } });
});

export default router;
