import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore, type PermissionCode } from '../stores/auth';

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean;
    permissions?: PermissionCode[];
    title?: string;
    menu?: boolean;
  }
}

export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    meta: { requiresAuth: false, title: '登录' },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/RegisterView.vue'),
    meta: { requiresAuth: false, title: '注册' },
  },
  {
    path: '/403',
    name: 'Forbidden',
    component: () => import('../views/ForbiddenView.vue'),
    meta: { requiresAuth: true, title: '无权限' },
  },
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { requiresAuth: true, permissions: ['oa:dashboard:view'], title: '数据看板', menu: true },
  },
  {
    path: '/designer',
    name: 'Designer',
    component: () => import('../views/DesignerView.vue'),
    meta: { requiresAuth: true, permissions: ['oa:process:write'], title: '流程设计器', menu: true },
  },
  {
    path: '/instances',
    name: 'Instances',
    component: () => import('../views/InstancesView.vue'),
    meta: { requiresAuth: true, permissions: ['oa:instance:read'], title: '流程实例', menu: true },
  },
  {
    path: '/instances/:id',
    name: 'InstanceDetail',
    component: () => import('../views/InstanceDetailView.vue'),
    meta: { requiresAuth: true, permissions: ['oa:instance:read'], title: '实例详情' },
  },
  {
    path: '/tasks',
    name: 'Tasks',
    component: () => import('../views/TasksView.vue'),
    meta: { requiresAuth: true, permissions: ['oa:task:read'], title: '任务中心', menu: true },
  },
  {
    path: '/tasks/:id',
    name: 'TaskDetail',
    component: () => import('../views/TaskDetailView.vue'),
    meta: { requiresAuth: true, permissions: ['oa:task:read'], title: '任务详情' },
  },
  {
    path: '/apply',
    name: 'Apply',
    component: () => import('../views/ApplyView.vue'),
    meta: { requiresAuth: true, permissions: ['oa:instance:start'], title: '发起申请', menu: true },
  },
  {
    path: '/my-applications',
    name: 'MyApplications',
    component: () => import('../views/MyApplicationsView.vue'),
    meta: { requiresAuth: true, permissions: ['oa:instance:read'], title: '我的申请', menu: true },
  },
  {
    path: '/virtual-list-demo',
    name: 'VirtualListDemo',
    component: () => import('../views/VirtualListDemo.vue'),
    meta: { requiresAuth: true, permissions: ['oa:dashboard:view'], title: '虚拟列表演示', menu: true },
  },
  {
    path: '/simple-test',
    name: 'SimpleTest',
    component: () => import('../views/SimpleTest.vue'),
    meta: { requiresAuth: true, permissions: ['oa:dashboard:view'], title: '通知测试', menu: true },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard',
  },
];

export const menuRoutes = routes.filter((route) => route.meta?.menu);

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore();
  authStore.initAuth();

  const requiresAuth = to.meta.requiresAuth !== false;

  if (requiresAuth && !authStore.isLoggedIn) {
    return '/login';
  }

  if ((to.path === '/login' || to.path === '/register') && authStore.isLoggedIn) {
    return '/dashboard';
  }

  if (requiresAuth && !authStore.routesReady) {
    try {
      await authStore.fetchMeAndPermissions();
      authStore.setRoutesReady(true);
    } catch (error) {
      authStore.logout();
      return '/login';
    }
  }

  const requiredPermissions = to.meta.permissions || [];
  if (requiredPermissions.length > 0 && !authStore.canAny(requiredPermissions)) {
    return '/403';
  }

  return true;
});

export default router;
