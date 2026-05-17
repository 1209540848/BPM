<template>
  <div class="auth-page login-container">
    <a-card class="auth-card" title="登录">
      <a-form :model="formState" :rules="rules" layout="vertical" @finish="handleLogin">
        <a-form-item label="用户名" name="username">
          <a-input v-model:value="formState.username" placeholder="请输入用户名" size="large" />
        </a-form-item>

        <a-form-item label="密码" name="password">
          <a-input-password v-model:value="formState.password" placeholder="请输入密码" size="large" />
        </a-form-item>

        <a-form-item>
          <a-button type="primary" html-type="submit" size="large" block :loading="authStore.loading">
            登录
          </a-button>
        </a-form-item>

        <a-form-item>
          <div class="auth-link">还没有账号？<router-link to="/register">立即注册</router-link></div>
        </a-form-item>
      </a-form>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import { useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();
const formState = reactive({ username: '', password: '' });

const rules = {
  username: [{ required: true, message: '请输入用户名' }],
  password: [{ required: true, message: '请输入密码' }],
};

async function handleLogin() {
  try {
    await authStore.login(formState.username, formState.password);
    message.success('登录成功');
    router.push('/');
  } catch (error: any) {
    message.error(error.message || '登录失败');
  }
}
</script>

<style scoped>
.auth-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 24px;
  background: linear-gradient(135deg, #eef4ff 0%, #f8fafc 45%, #ffffff 100%);
}

.auth-card {
  width: 420px;
  border-radius: 16px;
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.12);
}

.auth-link {
  text-align: center;
  color: #64748b;
}

.auth-link a {
  color: #1677ff;
  text-decoration: none;
  font-weight: 600;
}

.auth-link a:hover {
  text-decoration: underline;
}

.auth-card :deep(.ant-form-item-label > label) {
  color: #0f172a;
  font-weight: 600;
}

.auth-card :deep(.ant-input),
.auth-card :deep(.ant-input-affix-wrapper) {
  color: #0f172a;
  background: #ffffff;
  border-color: #d0d7e2;
  border-radius: 10px;
}

.auth-card :deep(.ant-input::placeholder) {
  color: #94a3b8;
}

.auth-card :deep(.ant-input:hover),
.auth-card :deep(.ant-input-affix-wrapper:hover) {
  border-color: #1677ff;
  background: #f8fbff;
}

.auth-card :deep(.ant-input:focus),
.auth-card :deep(.ant-input-affix-wrapper-focused) {
  border-color: #1677ff;
  box-shadow: 0 0 0 3px rgba(22, 119, 255, 0.14);
}

:global(html.dark) .auth-page {
  background: radial-gradient(circle at top, rgba(22, 119, 255, 0.18), transparent 32%), #020617;
}

:global(html.dark) .auth-card,
:global(html.dark) .auth-card :deep(.ant-card-head),
:global(html.dark) .auth-card :deep(.ant-card-body) {
  background: #0f172a;
  border-color: #243044;
  color: rgba(255, 255, 255, 0.9);
}

:global(html.dark) .auth-card :deep(.ant-card-head-title),
:global(html.dark) .auth-card :deep(.ant-form-item-label > label) {
  color: rgba(255, 255, 255, 0.9);
}

:global(html.dark) .auth-card :deep(.ant-input),
:global(html.dark) .auth-card :deep(.ant-input-affix-wrapper),
:global(html.dark) .auth-card :deep(.ant-input-password) {
  color: rgba(255, 255, 255, 0.92) !important;
  background: #111827 !important;
  border-color: #334155 !important;
}

:global(html.dark) .auth-card :deep(.ant-input::placeholder) {
  color: rgba(255, 255, 255, 0.38);
}

:global(html.dark) .auth-card :deep(.ant-input:hover),
:global(html.dark) .auth-card :deep(.ant-input-affix-wrapper:hover) {
  background: #172033 !important;
  border-color: #60a5fa !important;
}

:global(html.dark) .auth-card :deep(.ant-input:focus),
:global(html.dark) .auth-card :deep(.ant-input-affix-wrapper-focused) {
  border-color: #60a5fa !important;
  box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.2) !important;
}

:global(html.dark) .auth-card :deep(.ant-input-password-icon),
:global(html.dark) .auth-link {
  color: rgba(255, 255, 255, 0.62);
}
</style>
