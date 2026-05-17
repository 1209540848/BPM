/**
 * 主题系统核心
 * 下层：DOM 应用 - 把 CSS 变量注入到 DOM
 */

import { generateThemeVariables, type ThemeCSSVariables } from './themeVariables'

export interface ThemeConfig {
  primary: string  // 主题色（十六进制）
  isDark: boolean  // 是否暗黑模式
}

export const THEME_KEY = 'bpm-theme-v2'

export const DEFAULT_THEME: ThemeConfig = {
  primary: '#1677ff',
  isDark: false,
}

/**
 * 核心函数：将 CSS 变量注入到 HTML 根元素
 * 这是"下层"的实现
 *
 * @param variables - CSS 变量对象
 * @example
 * applyThemeVariables({
 *   '--primary-color': '#22CC88',
 *   '--primary-light-3': 'rgb(145, 230, 196)',
 *   ...
 * })
 */
export function applyThemeVariables(variables: ThemeCSSVariables): void {
  // 获取根元素（<html>）
  const root = document.documentElement

  // 逐个注入 CSS 变量
  Object.entries(variables).forEach(([key, value]) => {
    // 这行代码的作用：设置 <html style="--primary-color: #22CC88; ...">
    root.style.setProperty(key, value)
  })
}

/**
 * 设置暗黑模式的类名
 * 这样 CSS 规则 html.dark { ... } 就会生效
 *
 * @param isDark - 是否暗黑模式
 * @example
 * setDarkMode(true)  // <html class="dark">
 * setDarkMode(false) // <html>
 */
export function setDarkMode(isDark: boolean): void {
  const root = document.documentElement
  // classList.toggle(className, shouldAdd)
  // 如果 shouldAdd 为 true，则添加类名；false 则移除
  root.classList.toggle('dark', isDark)
}

/**
 * 完整的主题应用函数（中层 + 下层结合）
 * 这是对外的统一入口
 *
 * @param primaryColor - 主题色
 * @param isDark - 是否暗黑模式
 *
 * @example
 * applyTheme('#22CC88', true)
 * // → 应用绿色主题 + 暗黑模式
 */
export function applyTheme(primaryColor: string, isDark: boolean = false): void {
  // 第一步：用颜色混合算法生成衍生色 + CSS 变量（中层）
  const variables = generateThemeVariables(primaryColor, isDark)

  // 第二步：把变量注入到 DOM（下层）
  applyThemeVariables(variables)

  // 第三步：设置类名，让 CSS 级联生效（下层）
  setDarkMode(isDark)
}

/**
 * 从 localStorage 获取主题配置
 */
export function getThemeConfig(): ThemeConfig {
  const saved = localStorage.getItem(THEME_KEY)
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch {
      return DEFAULT_THEME
    }
  }
  return DEFAULT_THEME
}

/**
 * 保存主题配置到 localStorage
 */
export function saveThemeConfig(config: ThemeConfig): void {
  localStorage.setItem(THEME_KEY, JSON.stringify(config))
}
