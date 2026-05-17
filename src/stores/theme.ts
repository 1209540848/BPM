import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  DEFAULT_THEME,
  THEME_KEY,
  type ThemeConfig,
  applyTheme,
} from '../theme'

export const useThemeStore = defineStore('theme', () => {
  const themeConfig = ref<ThemeConfig>(DEFAULT_THEME)

  /**
   * 从 localStorage 加载主题
   * 应该在应用初始化时调用
   */
  function loadTheme() {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved) {
      try {
        themeConfig.value = JSON.parse(saved)
      } catch (e) {
        console.error('主题加载失败', e)
        themeConfig.value = DEFAULT_THEME
      }
    } else {
      themeConfig.value = DEFAULT_THEME
    }
  }

  /**
   * 保存主题到 localStorage
   */
  function saveTheme() {
    localStorage.setItem(THEME_KEY, JSON.stringify(themeConfig.value))
  }

  /**
   * 更新主题配置并应用到 DOM
   * 🔑 关键函数：每次更新都会自动应用到页面
   *
   * @param payload - 要更新的部分配置
   * @example
   * updateTheme({ primary: '#FF0000' })  // 改颜色
   * updateTheme({ isDark: true })        // 切换暗黑
   */
  function updateTheme(payload: Partial<ThemeConfig>) {
    // 更新状态
    themeConfig.value = {
      ...themeConfig.value,
      ...payload,
    }

    // 🔑 立即应用到 DOM（这是关键！）
    applyTheme(themeConfig.value.primary, themeConfig.value.isDark)

    // 保存到 localStorage
    saveTheme()
  }

  /**
   * 切换暗黑模式
   */
  function toggleDark() {
    updateTheme({ isDark: !themeConfig.value.isDark })
  }

  /**
   * 设置主题色
   */
  function setPrimaryColor(color: string) {
    updateTheme({ primary: color })
  }

  // 初始化时加载
  loadTheme()

  return {
    themeConfig,
    loadTheme,
    updateTheme,
    toggleDark,
    setPrimaryColor,
  }
})
