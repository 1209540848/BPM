/**
 * 主题系统 Vue 3 Composition API 钩子
 * 在组件中使用主题相关的逻辑
 */

import { computed, type ComputedRef } from 'vue'
import { useThemeStore } from '../stores/theme'
import type { ThemeConfig } from '../theme'

/**
 * useTheme 钩子
 * 提供主题相关的响应式数据和方法
 *
 * @returns 包含主题相关的响应式属性和方法
 *
 * @example
 * const { primaryColor, isDark, changeColor, toggleDark } = useTheme()
 *
 * // 在模板中使用
 * <button @click="toggleDark">切换暗黑模式</button>
 * <input type="color" :value="primaryColor" @change="e => changeColor(e.target.value)" />
 */
export function useTheme() {
  const store = useThemeStore()

  /**
   * 主色（响应式）
   */
  const primaryColor: ComputedRef<string> = computed(() => store.themeConfig.primary)

  /**
   * 暗黑模式标志（响应式）
   */
  const isDark: ComputedRef<boolean> = computed(() => store.themeConfig.isDark)

  /**
   * 完整主题配置（响应式）
   */
  const themeConfig: ComputedRef<ThemeConfig> = computed(() => store.themeConfig)

  /**
   * 改变主题色
   * @param color - 十六进制颜色值，如 '#FF0000'
   *
   * @example
   * changeColor('#22CC88')  // 改变主色为绿色
   */
  function changeColor(color: string) {
    store.setPrimaryColor(color)
  }

  /**
   * 切换暗黑模式
   *
   * @example
   * toggleDark()  // 在暗黑和亮色之间切换
   */
  function toggleDark() {
    store.toggleDark()
  }

  /**
   * 设置为暗黑模式
   */
  function setDark() {
    store.updateTheme({ isDark: true })
  }

  /**
   * 设置为亮色模式
   */
  function setLight() {
    store.updateTheme({ isDark: false })
  }

  /**
   * 完全自定义主题（同时设置主色和模式）
   * @param config - 部分或完整的主题配置
   *
   * @example
   * useTheme().updateTheme({ primary: '#FF0000', isDark: true })
   */
  function updateTheme(config: Partial<ThemeConfig>) {
    store.updateTheme(config)
  }

  return {
    primaryColor,
    isDark,
    themeConfig,
    changeColor,
    toggleDark,
    setDark,
    setLight,
    updateTheme,
  }
}
