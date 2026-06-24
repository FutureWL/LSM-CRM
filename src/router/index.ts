import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: () => {
        const auth = useAuthStore()
        if (!auth.isLoggedIn) return '/login'
        return auth.isAdmin ? '/admin/dashboard' : '/m/home'
      },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/login/LoginView.vue'),
      meta: { public: true },
    },
    // 移动端销售
    {
      path: '/m',
      component: () => import('@/views/m/MLayout.vue'),
      meta: { requiresAuth: true, role: 'sales' },
      children: [
        { path: '', redirect: '/m/home' },
        { path: 'home', name: 'm-home', component: () => import('@/views/m/HomeView.vue') },
        {
          path: 'visit/new',
          name: 'm-visit-new',
          component: () => import('@/views/m/VisitNewView.vue'),
        },
        { path: 'visits', name: 'm-visits', component: () => import('@/views/m/VisitsView.vue') },
        {
          path: 'customers',
          name: 'm-customers',
          component: () => import('@/views/m/CustomersView.vue'),
        },
        {
          path: 'customers/:id',
          name: 'm-customer-detail',
          component: () => import('@/views/m/CustomerDetailView.vue'),
        },
        { path: 'profile', name: 'm-profile', component: () => import('@/views/m/ProfileView.vue') },
      ],
    },
    // 桌面端管理后台
    {
      path: '/admin',
      component: () => import('@/views/admin/AdminLayout.vue'),
      meta: { requiresAuth: true, role: 'admin' },
      children: [
        { path: '', redirect: '/admin/dashboard' },
        {
          path: 'dashboard',
          name: 'admin-dashboard',
          component: () => import('@/views/admin/DashboardView.vue'),
        },
        {
          path: 'customers',
          name: 'admin-customers',
          component: () => import('@/views/admin/CustomersView.vue'),
        },
        {
          path: 'customers/:id',
          name: 'admin-customer-detail',
          component: () => import('@/views/admin/CustomerDetailView.vue'),
        },
        {
          path: 'visits',
          name: 'admin-visits',
          component: () => import('@/views/admin/VisitsView.vue'),
        },
        { path: 'sales', name: 'admin-sales', component: () => import('@/views/admin/SalesView.vue') },
        {
          path: 'sales/:id',
          name: 'admin-sales-detail',
          component: () => import('@/views/admin/SalesDetailView.vue'),
        },
      ],
    },
    // 移动端管理后台(独立)
    {
      path: '/a',
      component: () => import('@/views/admin/m/AdminMLayout.vue'),
      meta: { requiresAuth: true, role: 'admin' },
      children: [
        { path: '', redirect: '/a/dashboard' },
        {
          path: 'dashboard',
          name: 'a-dashboard',
          component: () => import('@/views/admin/m/DashboardView.vue'),
        },
        {
          path: 'customers',
          name: 'a-customers',
          component: () => import('@/views/admin/m/CustomersView.vue'),
        },
        {
          path: 'customers/:id',
          name: 'a-customer-detail',
          component: () => import('@/views/admin/CustomerDetailView.vue'),
        },
        {
          path: 'visits',
          name: 'a-visits',
          component: () => import('@/views/admin/m/VisitsView.vue'),
        },
        { path: 'sales', name: 'a-sales', component: () => import('@/views/admin/m/SalesView.vue') },
        {
          path: 'sales/:id',
          name: 'a-sales-detail',
          component: () => import('@/views/admin/m/SalesDetailView.vue'),
        },
      ],
    },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isLoggedIn) return '/login'
  if (to.meta.role && auth.role !== to.meta.role) {
    return auth.isAdmin ? '/admin/dashboard' : '/m/home'
  }
})

export default router
