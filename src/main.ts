import { createApp } from 'vue';
import { createPinia } from 'pinia';
import Antd from 'ant-design-vue';
import 'ant-design-vue/dist/reset.css';
import router from './router';
import App from './App.vue';
import { useThemeStore } from './stores/theme';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(Antd);

app.mount('#app');

/**
 * 🔑 应用启动后初始化主题
 * store.loadTheme() 会：
 *  1. 从 localStorage 恢复用户配置
 *  2. 自动生成统一 Design Tokens
 *  3. 立即应用到 DOM（防止闪烁）
 */
const store = useThemeStore();
store.loadTheme();

