<template>
  <MainLayout>
    <div class="designer-page">
      <a-row :gutter="16">
        <a-col :span="6">
          <a-card title="Process List" :bordered="false" style="margin-bottom: 16px">
            <a-space direction="vertical" style="width: 100%">
              <a-button type="primary" block @click="showCreateModal">New Process</a-button>
            </a-space>
          </a-card>

          <a-card :bordered="false">
            <a-list :data-source="processStore.definitions" item-layout="horizontal">
              <template #renderItem="{ item }">
                <a-list-item @click="selectDefinition(item.id)">
                  <a-list-item-meta :title="item.name" :description="item.description" />
                  <a-tag :color="item.status === 'published' ? 'green' : 'orange'">
                    {{ item.status === 'published' ? 'Published' : 'Draft' }}
                  </a-tag>
                </a-list-item>
              </template>
            </a-list>
          </a-card>
        </a-col>

        <a-col :span="18">
          <a-card v-if="processStore.currentDefinition" :bordered="false">
            <template #title>
              <a-space>
                <span>{{ processStore.currentDefinition.name }}</span>
                <a-tag :color="processStore.currentDefinition.status === 'published' ? 'green' : 'orange'">
                  {{ processStore.currentDefinition.status === 'published' ? 'Published' : 'Draft' }}
                </a-tag>
                <a-button
                  v-if="processStore.currentDefinition.status === 'draft'"
                  type="primary"
                  size="small"
                  @click="handlePublish"
                >
                  Publish
                </a-button>
              </a-space>
            </template>
            <ProcessDesigner />
          </a-card>

          <a-empty v-else description="Select or create a process first" />
        </a-col>
      </a-row>

      <a-modal v-model:open="createModalVisible" title="New Process" @ok="handleCreate">
        <a-form layout="vertical">
          <a-form-item label="Process name">
            <a-input v-model:value="createForm.name" placeholder="Enter process name" />
          </a-form-item>
          <a-form-item label="Description">
            <a-textarea
              v-model:value="createForm.description"
              placeholder="Enter process description"
              :rows="3"
            />
          </a-form-item>
        </a-form>
      </a-modal>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { message } from 'ant-design-vue';
import MainLayout from '../components/layout/MainLayout.vue';
import ProcessDesigner from '../components/designer/ProcessDesigner.vue';
import { useProcessStore } from '../stores/process';

const processStore = useProcessStore();
const createModalVisible = ref(false);
const createForm = ref({
  name: '',
  description: '',
});

onMounted(() => {
  processStore.fetchDefinitions();
});

function showCreateModal() {
  createForm.value = { name: '', description: '' };
  createModalVisible.value = true;
}

async function handleCreate() {
  if (!createForm.value.name.trim()) {
    message.warning('Please enter a process name.');
    return;
  }

  try {
    await processStore.createDefinition(createForm.value.name, createForm.value.description);
    await processStore.fetchDefinitions();
    createModalVisible.value = false;
    message.success('Process created.');
  } catch (error: any) {
    message.error(error.message || 'Create failed.');
  }
}

async function handlePublish() {
  if (!processStore.currentDefinition) return;

  try {
    await processStore.publishDefinition(processStore.currentDefinition.id);
    await processStore.fetchDefinitions();
    message.success('Process published.');
  } catch (error: any) {
    message.error(error.message || 'Publish failed.');
  }
}

function selectDefinition(id: string) {
  processStore.setCurrentDefinition(id);
}
</script>

<style scoped>
.designer-page {
  height: calc(100vh - 136px);
}

.designer-page :deep(.ant-list-item) {
  cursor: pointer;
}

.designer-page :deep(.ant-list-item:hover) {
  background: #f5f5f5;
}
</style>
