<template>
  <MainLayout>
    <div class="task-detail-container">
      <a-page-header :title="task?.nodeName || '任务详情'" @back="goBack">
        <template #extra>
          <a-tag :color="getStatusColor(task?.status)">{{ getStatusText(task?.status) }}</a-tag>
        </template>
      </a-page-header>

      <a-row :gutter="24">
        <a-col :span="16">
          <a-card title="任务信息" :bordered="false">
            <a-descriptions :column="2" bordered>
              <a-descriptions-item label="任务名称">{{ task?.nodeName }}</a-descriptions-item>
              <a-descriptions-item label="状态">
                <a-tag :color="getStatusColor(task?.status)">{{ getStatusText(task?.status) }}</a-tag>
              </a-descriptions-item>
              <a-descriptions-item label="审批人">{{ task?.assignee || '-' }}</a-descriptions-item>
              <a-descriptions-item label="创建时间">{{ formatDate(task?.createdAt) }}</a-descriptions-item>
              <a-descriptions-item label="完成时间">{{ formatDate(task?.completedAt) }}</a-descriptions-item>
            </a-descriptions>
          </a-card>

          <a-card title="申请表单数据" :bordered="false" style="margin-top: 24px">
            <DynamicFormDisplay :fields="currentFormFields" :data="formData" />
          </a-card>

          <a-card v-if="task?.status === 'pending'" title="处理任务" :bordered="false" style="margin-top: 24px">
            <a-form layout="vertical">
              <a-form-item label="处理结果">
                <a-radio-group v-model:value="action">
                  <a-radio value="approve">同意</a-radio>
                  <a-radio value="reject">拒绝</a-radio>
                </a-radio-group>
              </a-form-item>
              <a-form-item label="备注">
                <a-textarea v-model:value="comment" placeholder="请输入备注（可选）" :rows="4" />
              </a-form-item>
              <a-form-item>
                <a-space>
                  <a-button type="primary" :loading="loading" @click="handleProcess">提交</a-button>
                  <a-button @click="goBack">取消</a-button>
                </a-space>
              </a-form-item>
            </a-form>
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
import { useInstanceStore, useTaskStore } from '../stores/instance';
import { useProcessStore } from '../stores/process';
import type { Task } from '../types';

const route = useRoute();
const router = useRouter();
const taskStore = useTaskStore();
const instanceStore = useInstanceStore();
const processStore = useProcessStore();

const task = ref<Task | null>(null);
const instance = ref(instanceStore.currentInstance);
const action = ref<'approve' | 'reject'>('approve');
const comment = ref('');
const loading = ref(false);

const currentDefinition = computed(() => processStore.definitions.find((definition) => definition.id === task.value?.definitionId));
const currentFormFields = computed(() => currentDefinition.value?.formFields || []);
const formData = computed(() => instance.value?.variables || task.value?.variables || {});

function getStatusColor(status?: string) {
  return ({ pending: 'processing', approved: 'success', rejected: 'error', delegated: 'warning' } as Record<string, string>)[status || ''] || 'default';
}

function getStatusText(status?: string) {
  return ({ pending: '待处理', approved: '已同意', rejected: '已拒绝', delegated: '已委派' } as Record<string, string>)[status || ''] || status || '-';
}

function getHistoryColor(type: string) {
  return ({ enter: 'blue', leave: 'gray', complete: 'green', task_complete: 'green', task_reject: 'red' } as Record<string, string>)[type] || 'gray';
}

function formatDate(timestamp?: number) {
  if (!timestamp) return '-';
  return new Date(timestamp).toLocaleString('zh-CN');
}

async function handleProcess() {
  if (!task.value) return;
  loading.value = true;
  try {
    if (action.value === 'approve') {
      await taskStore.completeTask(task.value.id, {}, comment.value);
      message.success('任务处理成功');
    } else {
      await taskStore.rejectTask(task.value.id, comment.value);
      message.success('任务已拒绝');
    }
    goBack();
  } catch (error: any) {
    message.error(error.message || '任务处理失败');
  } finally {
    loading.value = false;
  }
}

function goBack() {
  router.back();
}

onMounted(async () => {
  const taskId = route.params.id as string;
  try {
    await Promise.all([taskStore.fetchTasks(), processStore.fetchDefinitions()]);
    task.value = taskStore.tasks.find((item: Task) => item.id === taskId) || null;
    if (task.value) {
      await instanceStore.getInstance(task.value.instanceId);
      instance.value = instanceStore.currentInstance;
    }
  } catch (error: any) {
    message.error(error.message || '加载任务详情失败');
  }
});
</script>

<style scoped>
.task-detail-container {
  padding: 24px;
}

.timeline-meta {
  color: #666;
  font-size: 12px;
}
</style>
