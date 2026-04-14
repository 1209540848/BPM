import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  DEFAULT_THEME,
  THEME_KEY,
  type ThemeConfig,
  type DesignTokens,
  generateDesignTokens,
  createAntThemeConfig,
  applyCompleteTheme,
} from '../theme'

export const useThemeStore = defineStore('theme', () => {
  // ========== 状态 ==========
  const themeConfig = ref<ThemeConfig>(DEFAULT_THEME)

  // 🎯 核心：生成的统一 Design Tokens
  const designTokens = computed<DesignTokens>(() => {
    return generateDesignTokens(themeConfig.value.primary, themeConfig.value.isDark)
  })

  // 🎯 Ant Design Vue 需要的 theme 配置
  const antThemeConfig = computed(() => {
    return createAntThemeConfig(designTokens.value, themeConfig.value.isDark)
  })

  // ========== 方法 ==========

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

    // 立即应用到 DOM（防止闪烁）
    applyCompleteTheme(designTokens.value, themeConfig.value.isDark)
  }

  /**
   * 保存主题到 localStorage
   */
  function saveTheme() {
    localStorage.setItem(THEME_KEY, JSON.stringify(themeConfig.value))
  }

  /**
   * 更新主题配置
   * 🔑 关键函数：更新后会自动同步 Tokens + DOM + localStorage
   *
   * @param payload - 要更新的部分配置
   * @example
   * updateTheme({ primary: '#FF0000' })  // 改颜色
   * updateTheme({ isDark: true })        // 切换暗黑
   */
  function updateTheme(payload: Partial<ThemeConfig>) {
    // 第一步：更新状态
    themeConfig.value = {
      ...themeConfig.value,
      ...payload,
    }

    // 🔑 第二步：这会触发 computed 重新计算 designTokens
    // 由于 designTokens 变化，所有依赖它的 computed 也会更新

    // 第三步：立即应用新 tokens 到 DOM
    applyCompleteTheme(designTokens.value, themeConfig.value.isDark)

    // 第四步：保存到 localStorage
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
    // 基础状态
    themeConfig,

    // 🎯 统一的 Design Tokens（响应式）
    designTokens,

    // 🎯 Ant Design Vue 的 theme 配置（响应式）
    antThemeConfig,

    // 方法
    loadTheme,
    updateTheme,
    toggleDark,
    setPrimaryColor,
  }
})
