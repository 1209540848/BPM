<template>
  <!-- 触发按钮 -->
  <button class="theme-trigger-btn" @click="isOpen = !isOpen" :title="isOpen ? '隐藏主题面板' : '显示主题面板'">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="5"></circle>
      <line x1="12" y1="1" x2="12" y2="3"></line>
      <line x1="12" y1="21" x2="12" y2="23"></line>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
      <line x1="1" y1="12" x2="3" y2="12"></line>
      <line x1="21" y1="12" x2="23" y2="12"></line>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    </svg>
  </button>

  <!-- 抽屉面板 -->
  <transition name="slide-drawer">
    <div v-if="isOpen" class="theme-drawer">
      <!-- 关闭按钮 -->
      <div class="drawer-header">
        <h3>主题设置</h3>
        <button class="close-btn" @click="isOpen = false">✕</button>
      </div>

      <div class="drawer-content">
        <!-- 颜色选择器 -->
        <div class="setting-item">
          <label for="theme-color" class="setting-label">主题色</label>
          <div class="color-input-group">
            <input
              id="theme-color"
              type="color"
              :value="primaryColor"
              @change="handleColorChange"
              class="color-picker"
              :title="`当前主题色: ${primaryColor}`"
            />
            <span class="color-text">{{ primaryColor }}</span>
          </div>
        </div>

        <!-- 暗黑模式切换 -->
        <div class="setting-item">
          <label class="setting-label">外观模式</label>
          <label class="toggle-label">
            <input
              type="checkbox"
              :checked="isDark"
              @change="handleDarkToggle"
              class="toggle-checkbox"
            />
            <span class="toggle-text">{{ isDark ? '暗黑模式' : '亮色模式' }}</span>
          </label>
        </div>

        <!-- 预设颜色 -->
        <div class="setting-item">
          <label class="setting-label">预设颜色</label>
          <div class="preset-grid">
            <button
              v-for="color in presetColors"
              :key="color"
              :style="{ backgroundColor: color }"
              :class="{ active: primaryColor === color }"
              @click="changeColor(color)"
              :title="`切换到 ${color}`"
              class="preset-color-btn"
            />
          </div>
        </div>
      </div>
    </div>
  </transition>

  <!-- 背景遮罩 -->
  <transition name="fade">
    <div v-if="isOpen" class="drawer-overlay" @click="isOpen = false"></div>
  </transition>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useTheme } from '../hooks/useTheme'

// 使用 useTheme 钩子
const { primaryColor, isDark, changeColor, toggleDark } = useTheme()

// 抽屉状态
const isOpen = ref(false)

// 预设颜色
const presetColors = [
  '#1677ff',  // 蓝色
  '#22CC88',  // 绿色
  '#FF0000',  // 红色
  '#FFA500',  // 橙色
  '#722ED1',  // 紫色
  '#13C2C2',  // 青色
]

/**
 * 处理颜色选择
 */
function handleColorChange(event: Event) {
  const input = event.target as HTMLInputElement
  const newColor = input.value
  changeColor(newColor)
}

/**
 * 处理暗黑模式切换
 */
function handleDarkToggle() {
  toggleDark()
}
</script>

<style scoped>
/* 触发按钮 */
.theme-trigger-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 999;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-dark-2));
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.theme-trigger-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
}

.theme-trigger-btn:active {
  transform: scale(0.95);
}

.theme-trigger-btn svg {
  width: 28px;
  height: 28px;
  stroke: white;
}

/* 抽屉面板 */
.theme-drawer {
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 1000;
  width: 360px;
  background-color: var(--bg-color);
  box-shadow: -2px 0 12px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
}

.drawer-header h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background-color: var(--border-color);
  color: var(--text-primary);
}

/* 抽屉内容 */
.drawer-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.setting-label {
  color: var(--text-primary);
  font-weight: 600;
  font-size: 14px;
}

/* 颜色输入 */
.color-input-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.color-picker {
  width: 48px;
  height: 48px;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.color-picker:hover {
  border-color: var(--primary-color);
  box-shadow: 0 0 8px rgba(22, 119, 255, 0.2);
}

.color-text {
  font-family: 'Courier New', monospace;
  color: var(--text-secondary);
  font-size: 13px;
  letter-spacing: 1px;
}

/* 暗黑模式切换 */
.toggle-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
}

.toggle-checkbox {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: var(--primary-color);
}

.toggle-text {
  color: var(--text-primary);
  font-size: 15px;
}

/* 预设颜色网格 */
.preset-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.preset-color-btn {
  width: 100%;
  aspect-ratio: 1;
  border: 3px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  padding: 0;
}

.preset-color-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.preset-color-btn.active {
  border-color: var(--text-primary);
  box-shadow: 0 0 0 1px var(--bg-color), 0 2px 8px rgba(0, 0, 0, 0.2);
  transform: scale(1.08);
}

/* 背景遮罩 */
.drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.4);
  z-index: 999;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* 动画类 */
.slide-drawer-enter-active,
.slide-drawer-leave-active {
  transition: transform 0.3s ease;
}

.slide-drawer-enter-from {
  transform: translateX(100%);
}

.slide-drawer-leave-to {
  transform: translateX(100%);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 移动端适配 */
@media (max-width: 640px) {
  .theme-drawer {
    width: 100%;
  }

  .preset-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>
