import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi } from '../api';
import { initializeWebSocket, disconnectWebSocket } from '../services/websocket.service';

export interface User {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  role: string;
}

export type PermissionCode =
  | 'oa:dashboard:view'
  | 'oa:process:read'
  | 'oa:process:write'
  | 'oa:process:publish'
  | 'oa:process:delete'
  | 'oa:instance:start'
  | 'oa:instance:read'
  | 'oa:instance:cancel'
  | 'oa:task:read'
  | 'oa:task:approve'
  | 'oa:task:delegate'
  | 'oa:demo:rebuild'
  | 'oa:demo:verify';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const token = ref<string | null>(localStorage.getItem('token'));
  const permissions = ref<PermissionCode[]>([]);
  const routesReady = ref(false);
  const loading = ref(false);

  const isLoggedIn = computed(() => !!token.value);

  function setSession(data: any) {
    token.value = data.token || token.value;
    user.value = data.user;
    permissions.value = data.permissions || permissions.value;

    if (data.token) {
      localStorage.setItem('token', data.token);
      initializeWebSocket(data.token);
    }
  }

  async function login(username: string, password: string) {
    loading.value = true;
    try {
      const data: any = await authApi.login({ username, password });
      setSession(data);
      await fetchMeAndPermissions();
      return data;
    } finally {
      loading.value = false;
    }
  }

  async function register(data: {
    username: string;
    email: string;
    password: string;
    fullName?: string;
  }) {
    loading.value = true;
    try {
      return await authApi.register(data);
    } finally {
      loading.value = false;
    }
  }

  async function fetchMeAndPermissions() {
    if (!token.value) {
      return null;
    }

    const data: any = await authApi.me();
    user.value = data.user;
    permissions.value = data.permissions || [];
    return data;
  }

  function can(code: PermissionCode) {
    return permissions.value.includes(code);
  }

  function canAny(codes: PermissionCode[]) {
    return codes.some((code) => can(code));
  }

  function canAll(codes: PermissionCode[]) {
    return codes.every((code) => can(code));
  }

  function setRoutesReady(value: boolean) {
    routesReady.value = value;
  }

  function logout() {
    token.value = null;
    user.value = null;
    permissions.value = [];
    routesReady.value = false;
    localStorage.removeItem('token');
    disconnectWebSocket();
  }

  function initAuth() {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      token.value = savedToken;
    }
  }

  return {
    user,
    token,
    permissions,
    routesReady,
    loading,
    isLoggedIn,
    login,
    register,
    fetchMeAndPermissions,
    can,
    canAny,
    canAll,
    setRoutesReady,
    logout,
    initAuth,
  };
});
