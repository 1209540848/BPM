<template>
  <MainLayout>
    <div class="apply-container">
      <a-card title="发起申请" :bordered="false">
        <a-form ref="formRef" :model="formState" layout="vertical">
          <a-form-item label="选择流程" name="definitionId" :rules="[{ required: true, message: '请选择流程' }]">
            <a-select
              v-model:value="formState.definitionId"
              placeholder="请选择流程"
              @change="handleDefinitionChange"
            >
              <a-select-option
                v-for="definition in publishedDefinitions"
                :key="definition.id"
                :value="definition.id"
              >
                {{ definition.name }}
              </a-select-option>
            </a-select>
          </a-form-item>

          <a-form-item label="业务编号">
            <a-input v-model:value="formState.businessKey" placeholder="请输入业务编号，例如 PO-2026-001" />
          </a-form-item>

          <template v-if="selectedDefinition">
            <a-divider orientation="left">申请信息</a-divider>
            <DynamicFormRenderer
              ref="dynamicFormRef"
              :fields="selectedDefinition.formFields || []"
              v-model="formState.variables"
            />
          </template>

          <a-form-item>
            <a-space>
              <a-button type="primary" :loading="loading" @click="handleSubmit">提交申请</a-button>
              <a-button @click="handleReset">重置</a-button>
            </a-space>
          </a-form-item>
        </a-form>
      </a-card>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import type { FormInstance } from 'ant-design-vue';
import MainLayout from '../components/layout/MainLayout.vue';
import DynamicFormRenderer from '../components/form/DynamicFormRenderer.vue';
import { useProcessStore } from '../stores/process';
import { useInstanceStore } from '../stores/instance';

const processStore = useProcessStore();
const instanceStore = useInstanceStore();
const formRef = ref<FormInstance>();
const dynamicFormRef = ref<InstanceType<typeof DynamicFormRenderer>>();
const loading = ref(false);

const formState = ref({
  definitionId: undefined as string | undefined,
  businessKey: '',
  variables: {} as Record<string, any>,
});

const publishedDefinitions = computed(() => processStore.definitions.filter(d => d.status === 'published'));
const selectedDefinition = computed(() => processStore.definitions.find(d => d.id === formState.value.definitionId));

function handleDefinitionChange() {
  const defaults: Record<string, any> = {};
  selectedDefinition.value?.formFields?.forEach((field) => {
    if (field.defaultValue !== undefined) {
      defaults[field.key] = field.defaultValue;
    }
  });
  formState.value.variables = defaults;
}

async function handleSubmit() {
  if (!formState.value.definitionId) {
    message.error('请选择流程');
    return;
  }

  try {
    await formRef.value?.validate();
  } catch {
    return;
  }

  const dynamicValidateResult = dynamicFormRef.value?.validate();
  if (dynamicValidateResult && !dynamicValidateResult.valid) {
    message.error(dynamicValidateResult.errors[0] || '请完善申请信息');
    return;
  }

  loading.value = true;
  try {
    await instanceStore.startProcess(
      formState.value.definitionId,
      formState.value.businessKey || undefined,
      formState.value.variables
    );
    message.success('申请提交成功');
    handleReset();
  } catch (error: any) {
    message.error(error.message || '申请提交失败');
  } finally {
    loading.value = false;
  }
}

function handleReset() {
  formState.value = {
    definitionId: undefined,
    businessKey: '',
    variables: {},
  };
  formRef.value?.clearValidate();
}

onMounted(() => {
  processStore.fetchDefinitions();
});
</script>

<style scoped>
.apply-container {
  padding: 24px;
}
</style>
