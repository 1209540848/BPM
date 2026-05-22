<template>
  <MainLayout>
    <div class="designer-page">
      <a-row :gutter="16" class="designer-layout">
        <a-col :span="6" class="designer-sidebar">
          <a-card title="流程列表" :bordered="false" style="margin-bottom: 16px">
            <a-button v-if="authStore.can('oa:process:write')" type="primary" block @click="showCreateModal">新建流程</a-button>
          </a-card>
          <a-card :bordered="false" class="definition-card">
            <a-list :data-source="processStore.definitions" item-layout="horizontal">
              <template #renderItem="{ item }">
                <a-list-item @click="selectDefinition(item.id)">
                  <a-list-item-meta :title="item.name" :description="item.description || '暂无描述'" />
                  <a-tag :color="item.status === 'published' ? 'green' : 'orange'">
                    {{ item.status === 'published' ? '已发布' : '草稿' }}
                  </a-tag>
                </a-list-item>
              </template>
            </a-list>
          </a-card>
        </a-col>

        <a-col :span="18" class="designer-main">
          <a-card v-if="processStore.currentDefinition" :bordered="false" class="workspace-card">
            <template #title>
              <a-space>
                <span>{{ processStore.currentDefinition.name }}</span>
                <a-tag :color="processStore.currentDefinition.status === 'published' ? 'green' : 'orange'">
                  {{ processStore.currentDefinition.status === 'published' ? '已发布' : '草稿' }}
                </a-tag>
                <a-button
                  v-if="processStore.currentDefinition.status === 'draft' && authStore.can('oa:process:publish')"
                  type="primary"
                  size="small"
                  @click="handlePublish"
                >
                  发布
                </a-button>
              </a-space>
            </template>

            <a-tabs v-model:activeKey="activeTab" class="designer-tabs">
              <a-tab-pane key="flow" tab="流程设计">
                <ProcessDesigner />
              </a-tab-pane>
              <a-tab-pane key="form" tab="表单配置">
                <DynamicFormDesigner
                  :definition-id="processStore.currentDefinition.id"
                  :fields="processStore.currentDefinition.formFields || []"
                />
              </a-tab-pane>
            </a-tabs>
          </a-card>
          <a-empty v-else description="请先选择或创建一个流程" />
        </a-col>
      </a-row>

      <a-modal v-model:open="createModalVisible" title="新建流程" @ok="handleCreate">
        <a-form layout="vertical">
          <a-form-item label="流程名称">
            <a-input v-model:value="createForm.name" placeholder="请输入流程名称" />
          </a-form-item>
          <a-form-item label="流程描述">
            <a-textarea v-model:value="createForm.description" placeholder="请输入流程描述" :rows="3" />
          </a-form-item>
        </a-form>
      </a-modal>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import MainLayout from '../components/layout/MainLayout.vue';
import ProcessDesigner from '../components/designer/ProcessDesigner.vue';
import DynamicFormDesigner from '../components/form/DynamicFormDesigner.vue';
import { useProcessStore } from '../stores/process';
import { useAuthStore } from '../stores/auth';

const processStore = useProcessStore();
const authStore = useAuthStore();
const createModalVisible = ref(false);
const activeTab = ref('flow');
const createForm = ref({ name: '', description: '' });

onMounted(() => {
  processStore.fetchDefinitions();
});

function showCreateModal() {
  createForm.value = { name: '', description: '' };
  createModalVisible.value = true;
}

async function handleCreate() {
  if (!createForm.value.name) {
    message.warning('请输入流程名称');
    return;
  }
  try {
    await processStore.createDefinition(createForm.value.name, createForm.value.description);
    await processStore.fetchDefinitions();
    createModalVisible.value = false;
    message.success('创建成功');
  } catch (error: any) {
    message.error(error.message || '创建失败');
  }
}

async function handlePublish() {
  if (!processStore.currentDefinition) return;
  try {
    await processStore.publishDefinition(processStore.currentDefinition.id);
    await processStore.fetchDefinitions();
    message.success('发布成功');
  } catch (error: any) {
    message.error(error.message || '发布失败');
  }
}

function selectDefinition(id: string) {
  processStore.setCurrentDefinition(id);
  activeTab.value = 'flow';
}
</script>

<style scoped>
.designer-page,
.designer-layout,
.designer-main,
.workspace-card,
.designer-tabs {
  min-height: calc(100vh - 136px);
}

.designer-page :deep(.workspace-card > .ant-card-body) {
  min-height: calc(100vh - 196px);
}

.designer-page :deep(.designer-tabs .ant-tabs-content),
.designer-page :deep(.designer-tabs .ant-tabs-tabpane) {
  min-height: calc(100vh - 270px);
}

.designer-page :deep(.ant-list-item) {
  cursor: pointer;
  color: rgba(0, 0, 0, 0.88);
  border-radius: 8px;
  padding: 10px 12px;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.designer-page :deep(.ant-list-item:hover),
.designer-page :deep(.ant-list-item:hover .ant-list-item-meta),
.designer-page :deep(.ant-list-item:hover .ant-list-item-meta-content) {
  background: #f5f7fb !important;
}

.designer-page :deep(.ant-list-item:hover .ant-list-item-meta-title),
.designer-page :deep(.ant-list-item:hover .ant-list-item-meta-description) {
  color: rgba(0, 0, 0, 0.88) !important;
}

:global(html.dark) .designer-page :deep(.ant-list-item) {
  color: rgba(255, 255, 255, 0.88);
}

:global(html.dark) .designer-page :deep(.ant-list-item:hover),
:global(html.dark) .designer-page :deep(.ant-list-item:hover .ant-list-item-meta),
:global(html.dark) .designer-page :deep(.ant-list-item:hover .ant-list-item-meta-content) {
  background: #1f2937 !important;
}

:global(html.dark) .designer-page :deep(.ant-list-item-meta-title),
:global(html.dark) .designer-page :deep(.ant-list-item-meta-description),
:global(html.dark) .designer-page :deep(.ant-list-item:hover .ant-list-item-meta-title),
:global(html.dark) .designer-page :deep(.ant-list-item:hover .ant-list-item-meta-description) {
  color: rgba(255, 255, 255, 0.88) !important;
}

:global(html.dark) .designer-page :deep(.ant-card),
:global(html.dark) .designer-page :deep(.ant-card-body),
:global(html.dark) .designer-page :deep(.ant-list) {
  background: #111827;
  color: rgba(255, 255, 255, 0.88);
}
</style>
