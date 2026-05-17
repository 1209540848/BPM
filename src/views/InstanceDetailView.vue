<template>
  <MainLayout>
    <div class="instance-detail-container">
      <a-page-header :title="getDefinitionName(instance?.definitionId)" @back="goBack">
        <template #extra>
          <a-tag :color="getStatusColor(instance?.status)">{{ getStatusText(instance?.status) }}</a-tag>
        </template>
      </a-page-header>

      <a-row :gutter="24">
        <a-col :span="16">
          <a-card title="流程信息" :bordered="false">
            <a-descriptions :column="2" bordered>
              <a-descriptions-item label="流程名称">{{ getDefinitionName(instance?.definitionId) }}</a-descriptions-item>
              <a-descriptions-item label="业务编号">{{ instance?.businessKey || '-' }}</a-descriptions-item>
              <a-descriptions-item label="状态">
                <a-tag :color="getStatusColor(instance?.status)">{{ getStatusText(instance?.status) }}</a-tag>
              </a-descriptions-item>
              <a-descriptions-item label="发起人">{{ instance?.startedBy }}</a-descriptions-item>
              <a-descriptions-item label="创建时间">{{ formatDate(instance?.createdAt) }}</a-descriptions-item>
              <a-descriptions-item label="结束时间">{{ formatDate(instance?.endedAt) }}</a-descriptions-item>
            </a-descriptions>
          </a-card>

          <a-card title="申请表单数据" :bordered="false" style="margin-top: 24px">
            <DynamicFormDisplay :fields="currentFormFields" :data="instance?.variables" />
          </a-card>
        </a-col>

        <a-col :span="8">
          <a-card title="审批历史" :bordered="false">
            <a-timeline>
              <a-timeline-item v-for="history in instance?.history" :key="history.id" :color="getHistoryColor(history.type)">
                <div>
                  <div style="font-weight: 500">{{ history.nodeName }}</div>
                  <div class="timeline-meta">{{ formatDate(history.timestamp) }}</div>
                  <div v-if="history.operator" class="timeline-meta">操作人：{{ history.operator }}</div>
                  <div v-if="history.comment" class="timeline-meta">备注：{{ history.comment }}</div>
                </div>
              </a-timeline-item>
            </a-timeline>
          </a-card>
        </a-col>
      </a-row>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import MainLayout from '../components/layout/MainLayout.vue';
import DynamicFormDisplay from '../components/form/DynamicFormDisplay.vue';
import { useInstanceStore } from '../stores/instance';
import { useProcessStore } from '../stores/process';
import type { ProcessInstance } from '../types';

const route = useRoute();
const router = useRouter();
const instanceStore = useInstanceStore();
const processStore = useProcessStore();
const instance = ref<ProcessInstance | null>(null);

const currentDefinition = computed(() => processStore.definitions.find((definition) => definition.id === instance.value?.definitionId));
const currentFormFields = computed(() => currentDefinition.value?.formFields || []);

function getDefinitionName(definitionId?: string) {
  if (!definitionId) return '-';
  return processStore.definitions.find(d => d.id === definitionId)?.name || definitionId;
}

function getStatusColor(status?: string) {
  return ({ running: 'processing', completed: 'success', suspended: 'warning', cancelled: 'error' } as Record<string, string>)[status || ''] || 'default';
}

function getStatusText(status?: string) {
  return ({ running: '运行中', completed: '已完成', suspended: '已挂起', cancelled: '已取消' } as Record<string, string>)[status || ''] || status || '-';
}

function getHistoryColor(type: string) {
  return ({ enter: 'blue', leave: 'gray', complete: 'green', task_complete: 'green', task_reject: 'red' } as Record<string, string>)[type] || 'gray';
}

function formatDate(timestamp?: number) {
  if (!timestamp) return '-';
  return new Date(timestamp).toLocaleString('zh-CN');
}

function goBack() {
  router.back();
}

onMounted(async () => {
  const instanceId = route.params.id as string;
  try {
    await Promise.all([
      instanceStore.getInstance(instanceId),
      processStore.fetchDefinitions(),
    ]);
    instance.value = instanceStore.currentInstance;
  } catch (error: any) {
    message.error(error.message || '加载实例详情失败');
  }
});
</script>

<style scoped>
.instance-detail-container {
  padding: 24px;
}

.timeline-meta {
  color: #666;
  font-size: 12px;
}
</style>
