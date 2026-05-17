/**
 * 颜色混合算法 - 这是整个主题系统的数学核心
 * 作用：根据主题色和基础色动态生成衍生色
 */

/**
 * 转换 HEX 颜色为 RGB 数组
 * @param hex - 十六进制颜色，如 '#1677ff'
 * @returns RGB 数组，如 [22, 119, 255]
 */
export function hexToRgb(hex: string): [number, number, number] {
  // 移除 # 符号
  const cleanHex = hex.replace('#', '')
  // 提取每两个字符作为一个通道
  const r = parseInt(cleanHex.substring(0, 2), 16)
  const g = parseInt(cleanHex.substring(2, 4), 16)
  const b = parseInt(cleanHex.substring(4, 6), 16)
  return [r, g, b]
}

/**
 * 转换 RGB 为 HEX 颜色
 * @param r - 红色分量
 * @param g - 绿色分量
 * @param b - 蓝色分量
 * @returns 十六进制颜色字符串
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (value: number) => {
    const hex = Math.round(value).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * 核心：颜色混合算法
 * 原理：在 RGB 空间中按比例混合两个颜色的每个通道
 *
 * @param color - 主题色（HEX 格式），如 '#22CC88'
 * @param ratio - 混合比例（0-1），表示主题色的占比
 *                0 = 100% 基础色，1 = 100% 主题色
 * @param base - 基础色（HEX 格式），默认白色 '#ffffff'
 *               亮色模式用白色，暗黑模式用黑色
 * @returns CSS 格式的 RGB 颜色，如 'rgb(145, 230, 196)'
 *
 * @example
 * // 亮色模式：生成浅绿色（主题色 + 白色）
 * mixColors('#22CC88', 0.7, '#ffffff')
 * // → rgb(145, 230, 196)
 *
 * @example
 * // 暗黑模式：生成深绿色（主题色 + 黑色）
 * mixColors('#22CC88', 0.7, '#000000')
 * // → rgb(20, 122, 82)
 */
export function mixColors(
  color: string,
  ratio: number,
  base: string = '#ffffff'
): string {
  // 第 1 步：将两个 HEX 颜色转换为 RGB 数组
  const [r, g, b] = hexToRgb(color)
  const [br, bg, bb] = hexToRgb(base)

  // 第 2 步：对每个通道进行线性混合
  // 混合公式：result = source * ratio + base * (1 - ratio)
  const mixChannel = (source: number, baseChannel: number): number => {
    return source * ratio + baseChannel * (1 - ratio)
  }

  // 第 3 步：混合三个通道
  const mixedR = mixChannel(r, br)
  const mixedG = mixChannel(g, bg)
  const mixedB = mixChannel(b, bb)

  // 第 4 步：转换回 RGB 格式的字符串
  return `rgb(${Math.round(mixedR)}, ${Math.round(mixedG)}, ${Math.round(mixedB)})`
}

/**
 * 生成颜色等级
 * 用多个 ratio 生成一套完整的颜色梯度
 *
 * @param color - 主题色
 * @param isDark - 是否暗黑模式
 * @returns 包含 8 个等级的颜色对象
 */
export interface ColorLevel {
  light7: string   // 最浅
  light5: string   // 很浅
  light3: string   // 较浅
  light1: string   // 略浅
  base: string     // 原色
  dark2: string    // 略深
  dark4: string    // 较深
  dark6: string    // 很深
}

export function generateColorLevels(
  color: string,
  isDark: boolean = false
): ColorLevel {
  // 选择基础色：亮色模式用白，暗黑模式用黑
  const baseColor = isDark ? '#000000' : '#ffffff'

  return {
    // 浅色系：ratio 从高到低，逐渐接近基础色
    light7: mixColors(color, 0.1, baseColor),    // 最浅（10% 原色 + 90% 基础色）
    light5: mixColors(color, 0.2, baseColor),    // 很浅（20% 原色 + 80% 基础色）
    light3: mixColors(color, 0.4, baseColor),    // 较浅（40% 原色 + 60% 基础色）
    light1: mixColors(color, 0.6, baseColor),    // 略浅（60% 原色 + 40% 基础色）

    // 原色
    base: color,

    // 深色系：ratio 从低到高，逐渐接近原色
    // 注意：在暗黑模式下，这些是"更深的"，在亮色模式下是"更亮的"
    dark2: mixColors(color, 0.8, baseColor),    // 略深（80% 原色 + 20% 基础色）
    dark4: mixColors(color, 0.7, baseColor),    // 较深（70% 原色 + 30% 基础色）
    dark6: mixColors(color, 0.6, baseColor),    // 很深（60% 原色 + 40% 基础色）
  }
}
