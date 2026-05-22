<template>
  <MainLayout>
    <a-result
      status="403"
      title="无权限访问"
      sub-title="当前账号没有访问该页面或执行该操作的权限。"
    >
      <template #extra>
        <a-space>
          <a-button type="primary" @click="router.push('/dashboard')">返回首页</a-button>
          <a-button @click="handleLogout">切换账号</a-button>
        </a-space>
      </template>
    </a-result>
  </MainLayout>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import MainLayout from '../components/layout/MainLayout.vue';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

function handleLogout() {
  authStore.logout();
  router.push('/login');
}
</script>
