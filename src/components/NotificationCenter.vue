<template>
  <div class="notification-container">
    <a-dropdown v-model:open="dropdownVisible" trigger="click">
      <a-badge :count="unreadCount" :dot="unreadCount > 0">
        <a-button type="text" class="notification-button" @click="handleDropdownClick">
          <BellOutlined />
        </a-button>
      </a-badge>
      <template #overlay>
        <a-menu class="notification-menu">
          <a-menu-item-group title="通知中心">
            <a-menu-item v-if="notifications.length === 0" disabled>
              <span class="empty-text">暂无通知</span>
            </a-menu-item>
            <a-menu-item
              v-for="notification in notifications"
              :key="notification.id"
              @click="markAsRead(notification.id)"
            >
              <div class="notification-item">
                <div class="notification-title">{{ notification.title }}</div>
                <div class="notification-message">{{ notification.message }}</div>
                <div class="notification-time">{{ formatTime(notification.timestamp) }}</div>
              </div>
            </a-menu-item>
          </a-menu-item-group>
          <a-menu-divider v-if="notifications.length > 0" />
          <a-menu-item v-if="notifications.length > 0" @click="clearAll">
            <span class="clear-text">清空所有通知</span>
          </a-menu-item>
        </a-menu>
      </template>
    </a-dropdown>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { BellOutlined } from '@ant-design/icons-vue';
import { useNotificationStore } from '../stores/notification';
import { useWebSocket, type WebSocketMessage } from '../services/websocket.service';

const { notifications, clearAll, markAsRead, addNotification } = useNotificationStore();
const { getWebSocketClient } = useWebSocket();
const dropdownVisible = ref(false);

const unreadCount = computed(() => notifications.value.filter((item) => !item.read).length);

const formatTime = (timestamp: number) => new Date(timestamp).toLocaleString('zh-CN');

const markAllAsRead = () => {
  notifications.value.forEach((notification) => {
    notification.read = true;
  });
};

const handleDropdownClick = () => {
  if (unreadCount.value > 0) {
    markAllAsRead();
  }
  dropdownVisible.value = !dropdownVisible.value;
};

const handleWebSocketMessage = (message: WebSocketMessage) => {
  switch (message.type) {
    case 'info':
      addNotification({
        type: 'info',
        title: message.data.title || '信息通知',
        message: message.data.message || '',
        timestamp: message.timestamp,
      });
      break;
    case 'task_assigned':
      addNotification({
        type: 'info',
        title: '新任务分配',
        message: `您有一个新的审批任务：${message.data.taskName}`,
        timestamp: message.timestamp,
      });
      break;
    case 'task_result':
      addNotification({
        type: message.data.result === 'approved' ? 'success' : 'error',
        title: message.data.result === 'approved' ? '任务已通过' : '任务已驳回',
        message:
          message.data.result === 'approved'
            ? `任务 ${message.data.taskId} 已通过审批`
            : `任务 ${message.data.taskId} 已被驳回${
                message.data.comment ? `，原因：${message.data.comment}` : ''
              }`,
        timestamp: message.timestamp,
      });
      break;
    case 'process_update':
      addNotification({
        type: 'info',
        title: '流程状态更新',
        message: message.data.message,
        timestamp: message.timestamp,
      });
      break;
    case 'timeout_warning':
      addNotification({
        type: 'warning',
        title: '任务超时提醒',
        message: `任务 ${message.data.taskName} 即将超时，请及时处理`,
        timestamp: message.timestamp,
      });
      break;
  }
};

onMounted(() => {
  try {
    const wsClient = getWebSocketClient();
    wsClient.on('info', handleWebSocketMessage);
    wsClient.on('task_assigned', handleWebSocketMessage);
    wsClient.on('task_result', handleWebSocketMessage);
    wsClient.on('process_update', handleWebSocketMessage);
    wsClient.on('timeout_warning', handleWebSocketMessage);
  } catch (error) {
    console.error('WebSocket 初始化错误:', error);
  }
});

onUnmounted(() => {
  try {
    const wsClient = getWebSocketClient();
    wsClient.off('info', handleWebSocketMessage);
    wsClient.off('task_assigned', handleWebSocketMessage);
    wsClient.off('task_result', handleWebSocketMessage);
    wsClient.off('process_update', handleWebSocketMessage);
    wsClient.off('timeout_warning', handleWebSocketMessage);
  } catch (error) {
    console.error('WebSocket 清理错误:', error);
  }
});
</script>

<style scoped>
.notification-container {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  vertical-align: middle;
}

.notification-container :deep(.ant-badge) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  line-height: 1;
}

.notification-button {
  font-size: 18px;
  padding: 0 !important;
  color: #1677ff !important;
  background: rgba(22, 119, 255, 0.1) !important;
  border: none !important;
  box-shadow: none !important;
  transition: all 0.2s;
  border-radius: 50%;
  min-width: 32px;
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 32px;
  vertical-align: middle;
  transform: translateY(0);
}

.notification-button:hover {
  background: rgba(22, 119, 255, 0.16) !important;
  color: #002c8c !important;
  border: none !important;
  box-shadow: none !important;
}

.notification-button :deep(svg) {
  width: 18px;
  height: 18px;
  display: block;
  color: currentColor !important;
  fill: currentColor !important;
  stroke: currentColor !important;
  opacity: 1;
}

.notification-button :deep(path) {
  fill: currentColor !important;
  stroke: currentColor !important;
}

:global(html.dark) .notification-button {
  color: #91caff !important;
  background: rgba(145, 202, 255, 0.16) !important;
  border: none !important;
  box-shadow: none !important;
}

:global(html.dark) .notification-button:hover {
  background: rgba(145, 202, 255, 0.24) !important;
  color: #ffffff !important;
  border: none !important;
  box-shadow: none !important;
}

:global(html.dark) .notification-button :deep(svg) {
  color: currentColor !important;
}

:global(html.dark) .notification-button :deep(path) {
  fill: currentColor !important;
  stroke: currentColor !important;
}

.notification-menu {
  width: 360px;
  max-height: 400px;
  overflow-y: auto;
}

.empty-text {
  color: #999;
}

.clear-text {
  color: #ff4d4f;
}

.notification-item {
  padding: 8px 0;
}

.notification-title {
  font-weight: 500;
  font-size: 14px;
  margin-bottom: 4px;
  color: var(--text-primary);
}

.notification-message {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
  line-height: 1.4;
}

.notification-time {
  font-size: 11px;
  color: var(--text-secondary);
  opacity: 0.7;
}
</style>
