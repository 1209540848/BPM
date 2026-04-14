<template>
  <!-- 🎯 直接使用 store 的统一 antThemeConfig -->
  <a-config-provider :theme="themeStore.antThemeConfig">
    <router-view />
  </a-config-provider>
</template>

<script setup lang="ts">
import { useThemeStore } from './stores/theme'

const themeStore = useThemeStore()
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}
</style>
