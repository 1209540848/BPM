<template>
  <div class="auth-page register-container">
    <a-card class="auth-card" title="注册">
      <a-form :model="formState" :rules="rules" layout="vertical" @finish="handleRegister">
        <a-form-item label="用户名" name="username">
          <a-input v-model:value="formState.username" placeholder="请输入用户名" size="large" />
        </a-form-item>

        <a-form-item label="邮箱" name="email">
          <a-input v-model:value="formState.email" placeholder="请输入邮箱" size="large" />
        </a-form-item>

        <a-form-item label="姓名" name="fullName">
          <a-input v-model:value="formState.fullName" placeholder="请输入姓名（可选）" size="large" />
        </a-form-item>

        <a-form-item label="密码" name="password">
          <a-input-password v-model:value="formState.password" placeholder="请输入密码" size="large" />
        </a-form-item>

        <a-form-item label="确认密码" name="confirmPassword">
          <a-input-password v-model:value="formState.confirmPassword" placeholder="请再次输入密码" size="large" />
        </a-form-item>

        <a-form-item>
          <a-button type="primary" html-type="submit" size="large" block :loading="authStore.loading">
            注册
          </a-button>
        </a-form-item>

        <a-form-item>
          <div class="auth-link">已有账号？<router-link to="/login">立即登录</router-link></div>
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
const formState = reactive({ username: '', email: '', fullName: '', password: '', confirmPassword: '' });

const validatePassword = async (_rule: any, value: string) => {
  if (!value) return Promise.reject('请输入确认密码');
  if (value !== formState.password) return Promise.reject('两次输入的密码不一致');
  return Promise.resolve();
};

const rules = {
  username: [
    { required: true, message: '请输入用户名' },
    { min: 3, message: '用户名至少 3 个字符' },
  ],
  email: [
    { required: true, message: '请输入邮箱' },
    { type: 'email', message: '请输入有效的邮箱地址' },
  ],
  password: [
    { required: true, message: '请输入密码' },
    { min: 6, message: '密码至少 6 个字符' },
  ],
  confirmPassword: [{ required: true, validator: validatePassword, trigger: 'change' }],
};

async function handleRegister() {
  try {
    await authStore.register({
      username: formState.username,
      email: formState.email,
      password: formState.password,
      fullName: formState.fullName || undefined,
    });
    message.success('注册成功，请登录');
    router.push('/login');
  } catch (error: any) {
    message.error(error.message || '注册失败');
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
