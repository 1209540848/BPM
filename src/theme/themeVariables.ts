/**
 * 主题 CSS 变量生成
 * 作用：把混合算法的结果转换为 CSS 变量对象
 */

import { generateColorLevels } from './colorAlgorithm'

/**
 * 完整的主题 CSS 变量集合
 */
export interface ThemeCSSVariables {
  // 主色
  '--primary-color': string

  // 衍生色（浅色系）
  '--primary-light-1': string
  '--primary-light-3': string
  '--primary-light-5': string
  '--primary-light-7': string

  // 衍生色（深色系）
  '--primary-dark-2': string
  '--primary-dark-4': string
  '--primary-dark-6': string

  // 其他基础色
  '--bg-color': string
  '--text-primary': string
  '--text-secondary': string
  '--border-color': string
}

/**
 * 根据主题色和模式生成完整的 CSS 变量集
 *
 * @param primaryColor - 主题色（十六进制）
 * @param isDark - 是否暗黑模式
 * @returns CSS 变量对象
 *
 * @example
 * const vars = generateThemeVariables('#22CC88', false)
 * // 返回：{
 * //   '--primary-color': '#22CC88',
 * //   '--primary-light-3': 'rgb(145, 230, 196)',
 * //   '--bg-color': '#ffffff',
 * //   ...
 * // }
 */
export function generateThemeVariables(
  primaryColor: string,
  isDark: boolean = false
): ThemeCSSVariables {
  // 使用混合算法生成色阶
  const colorLevels = generateColorLevels(primaryColor, isDark)

  // 生成其他基础色
  const bgColor = isDark ? '#141414' : '#ffffff'
  const textPrimary = isDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.88)'
  const textSecondary = isDark ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.65)'
  const borderColor = isDark ? '#434343' : '#d9d9d9'

  return {
    '--primary-color': colorLevels.base,
    '--primary-light-1': colorLevels.light1,
    '--primary-light-3': colorLevels.light3,
    '--primary-light-5': colorLevels.light5,
    '--primary-light-7': colorLevels.light7,
    '--primary-dark-2': colorLevels.dark2,
    '--primary-dark-4': colorLevels.dark4,
    '--primary-dark-6': colorLevels.dark6,
    '--bg-color': bgColor,
    '--text-primary': textPrimary,
    '--text-secondary': textSecondary,
    '--border-color': borderColor,
  }
}
