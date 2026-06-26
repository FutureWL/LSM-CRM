import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUsersStore } from '@/stores/users'
import { useCustomersStore } from '@/stores/customers'
import { useVisitsStore } from '@/stores/visits'

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
    {
      // 强制改密页：未改密用户唯一可访问的页面（除登录页外）
      path: '/change-password',
      name: 'change-password',
      component: () => import('@/views/login/ForceChangePasswordView.vue'),
      meta: { requiresAuth: true, public: true },
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
        {
          path: 'profile/password',
          name: 'm-profile-password',
          component: () => import('@/views/profile/ChangePasswordView.vue'),
        },
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
        // 账号管理（v0.4 新增）
        {
          path: 'users',
          name: 'admin-users',
          component: () => import('@/views/admin/UsersView.vue'),
        },
        {
          path: 'profile/password',
          name: 'admin-profile-password',
          component: () => import('@/views/profile/ChangePasswordView.vue'),
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
        {
          path: 'users',
          name: 'a-users',
          component: () => import('@/views/admin/UsersView.vue'),
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  // 公开页直接过
  if (to.meta.public) return true

  // 1) 验真身：调 /auth/me，确保 cookie 有效
  if (!auth.isLoggedIn) {
    await auth.bootstrap()
    if (!auth.isLoggedIn) {
      return { path: '/login', query: { redirect: to.fullPath } }
    }
  }

  // 2) 强制改密：未改密用户只能访问 /change-password（以及 /login、/auth/logout）
  //    防止绕过：就算手动在地址栏输 /admin/dashboard 也会被拦回
  if (auth.mustChangePassword && to.name !== 'change-password') {
    return { path: '/change-password' }
  }

  // 3) 角色检查
  const requiredRole = to.meta.role as 'admin' | 'sales' | undefined
  if (requiredRole && auth.role !== requiredRole) {
    return auth.isAdmin ? '/admin/dashboard' : '/m/home'
  }

  // 4) 进入受保护路由前预加载常用数据（首屏不白屏）
  //    不阻塞导航；fire-and-forget，view 内部会 reactive 跟随
  const users = useUsersStore()
  const customers = useCustomersStore()
  const visits = useVisitsStore()
  if (!users.loaded) users.load().catch(() => {})
  if (!customers.loaded) customers.load().catch(() => {})
  if (!visits.loaded) visits.load().catch(() => {})

  return true
})

export default router