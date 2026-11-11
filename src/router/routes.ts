import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('@/pages/IndexPage.vue') },
      { path: 'setup', component: () => import('@/pages/SetupPage.vue') },
      { path: 'board', component: () => import('@/pages/BoardPage.vue') },
      { path: 'turn', component: () => import('@/pages/TurnPage.vue') },
      { path: 'gold', component: () => import('@/pages/GoldPage.vue') },
      { path: 'results', component: () => import('@/pages/ResultsPage.vue') },
      { path: 'packs', component: () => import('@/pages/PacksPage.vue') },
      { path: 'packs/:id', component: () => import('@/pages/PackEditPage.vue') },
      { path: 'help', component: () => import('@/pages/HelpPage.vue') },
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('@/pages/ErrorNotFound.vue'),
  },
];

export default routes;
