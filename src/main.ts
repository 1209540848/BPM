import { createApp } from 'vue';
import { createPinia } from 'pinia';
import Antd from 'ant-design-vue';
import 'ant-design-vue/dist/reset.css';
import router from './router';
import App from './App.vue';
import { useThemeStore } from './stores/theme';
import { applyTheme } from './theme';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(Antd);

app.mount('#app');

/**
 * 🔑 关键：应用启动后立即初始化主题
 * 这确保页面加载时就能从 localStorage 恢复用户上次的主题配置
 */
const initTheme = () => {
  const store = useThemeStore();

  // 从 localStorage 恢复配置
  store.loadTheme();

  // 应用到 DOM
  const { primary, isDark } = store.themeConfig;
  applyTheme(primary, isDark);
};

initTheme();
