/**
 * 统一的 Design Tokens 生成系统
 * 🎯 核心原则：一套算法，两处使用
 *  - 传给 Ant Design Vue
 *  - 生成 CSS 变量
 */

import { generateColorLevels } from './colorAlgorithm'
import { theme } from 'ant-design-vue'

/**
 * 完整的设计令牌集合
 * 包含所有 Ant Design Vue 需要的 token + 自定义样式需要的颜色
 */
export interface DesignTokens {
  // ========== Ant Design Vue 需要的 token ==========
  colorPrimary: string
  colorSuccess: string
  colorWarning: string
  colorError: string
  colorInfo: string
  colorBgBase: string
  colorTextBase: string

  // ========== 主色梯度（对应原色系） ==========
  colorPrimaryBg: string // 极浅
  colorPrimaryBgHover: string // 很浅
  colorPrimaryBorder: string // 较浅
  colorPrimaryBorderHover: string // 略浅
  colorPrimaryText: string // 原色文字
  colorPrimaryTextHover: string // 原色悬停
  colorPrimaryBgTextActive: string // 原色活跃背景
  colorPrimaryTextActive: string // 原色活跃文字

  // ========== CSS 变量原始颜色值 ==========
  // 用于 CSS 中的 var()
  cssVariables: Record<string, string>
}

/**
 * 根据主题色和暗亮模式生成完整的 Design Tokens
 *
 * @param primaryColor - 主题色（十六进制）
 * @param isDark - 是否暗黑模式
 * @returns 完整的设计令牌
 *
 * @example
 * const tokens = generateDesignTokens('#1677ff', false)
 * // 可传给 a-config-provider
 * // 也可提取 cssVariables 注入 DOM
 */
export function generateDesignTokens(
  primaryColor: string,
  isDark: boolean = false
): DesignTokens {
  // 这是唯一的颜色生成来源！
  const colorLevels = generateColorLevels(primaryColor, isDark)

  // 基础颜色
  const bgColor = isDark ? '#141414' : '#ffffff'
  const textColor = isDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.88)'
  const textColorSecondary = isDark ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.65)'

  // 语义色（参考 Ant Design Vue 体系）
  const successColor = isDark ? '#52c41a' : '#52c41a'
  const warningColor = isDark ? '#faad14' : '#faad14'
  const errorColor = isDark ? '#f5222d' : '#f5222d'
  const infoColor = isDark ? '#1677ff' : '#1677ff'

  // 生成所有原色的衍生色梯度
  const pLight7 = colorLevels.light7
  const pLight5 = colorLevels.light5
  const pLight3 = colorLevels.light3
  const pLight1 = colorLevels.light1
  const pBase = colorLevels.base
  const pDark2 = colorLevels.dark2
  const pDark4 = colorLevels.dark4
  const pDark6 = colorLevels.dark6

  // 🔑 CSS 变量集合 - 这些值会被注入到 DOM
  const cssVariables: Record<string, string> = {
    // 主色梯度（保持向后兼容的命名）
    '--primary-color': pBase,
    '--primary-light-7': pLight7,
    '--primary-light-5': pLight5,
    '--primary-light-3': pLight3,
    '--primary-light-1': pLight1,
    '--primary-dark-2': pDark2,
    '--primary-dark-4': pDark4,
    '--primary-dark-6': pDark6,

    // 基础色
    '--bg-color': bgColor,
    '--text-primary': textColor,
    '--text-secondary': textColorSecondary,

    // 语义色
    '--color-success': successColor,
    '--color-warning': warningColor,
    '--color-error': errorColor,
    '--color-info': infoColor,
  }

  // 返回 Ant Design Vue 所需的 token 格式
  const tokens: DesignTokens = {
    // Ant Design Vue 官方 token
    colorPrimary: pBase,
    colorSuccess: successColor,
    colorWarning: warningColor,
    colorError: errorColor,
    colorInfo: infoColor,
    colorBgBase: bgColor,
    colorTextBase: textColor,

    // 扩展的原色系列（用于 Ant Design 的主题定制）
    colorPrimaryBg: pLight7,
    colorPrimaryBgHover: pLight5,
    colorPrimaryBorder: pLight3,
    colorPrimaryBorderHover: pLight1,
    colorPrimaryText: pBase,
    colorPrimaryTextHover: pDark2,
    colorPrimaryBgTextActive: pDark4,
    colorPrimaryTextActive: pDark6,

    // CSS 变量 - 供自定义样式使用
    cssVariables,
  }

  return tokens
}

/**
 * 创建 Ant Design Vue 的 theme 配置对象
 * 这是与 a-config-provider :theme 直接对应的格式
 *
 * @param tokens - Design Tokens
 * @param isDark - 是否暗黑模式
 * @returns Ant Design Vue theme 配置
 */
export function createAntThemeConfig(tokens: DesignTokens, isDark: boolean) {
  return {
    token: {
      colorPrimary: tokens.colorPrimary,
      colorSuccess: tokens.colorSuccess,
      colorWarning: tokens.colorWarning,
      colorError: tokens.colorError,
      colorInfo: tokens.colorInfo,
      colorBgBase: tokens.colorBgBase,
      colorTextBase: tokens.colorTextBase,
      colorPrimaryBg: tokens.colorPrimaryBg,
      colorPrimaryBgHover: tokens.colorPrimaryBgHover,
      colorPrimaryBorder: tokens.colorPrimaryBorder,
      colorPrimaryBorderHover: tokens.colorPrimaryBorderHover,
      colorPrimaryText: tokens.colorPrimaryText,
      colorPrimaryTextHover: tokens.colorPrimaryTextHover,
      colorPrimaryBgTextActive: tokens.colorPrimaryBgTextActive,
      colorPrimaryTextActive: tokens.colorPrimaryTextActive,
    },
    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
  }
}

/**
 * 将 CSS 变量注入到 DOM
 * @param cssVariables - CSS 变量对象
 */
export function applyCssVariables(cssVariables: Record<string, string>): void {
  const root = document.documentElement
  Object.entries(cssVariables).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })
}

/**
 * 设置暗黑模式类名
 * @param isDark - 是否暗黑模式
 */
export function setDarkMode(isDark: boolean): void {
  const root = document.documentElement
  root.classList.toggle('dark', isDark)
}

/**
 * 应用完整的主题（一键同步所有系统）
 * @param tokens - Design Tokens
 * @param isDark - 是否暗黑模式
 */
export function applyCompleteTheme(tokens: DesignTokens, isDark: boolean): void {
  // 注入 CSS 变量
  applyCssVariables(tokens.cssVariables)

  // 设置暗黑类名
  setDarkMode(isDark)
}
