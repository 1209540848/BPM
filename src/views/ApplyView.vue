<template>
  <MainLayout>
    <div class="apply-container">
      <a-card title="Start Process" :bordered="false">
        <a-form :model="formState" layout="vertical">
          <a-form-item label="Process">
            <a-select v-model:value="formState.definitionId" placeholder="Select a process" @change="handleDefinitionChange">
              <a-select-option v-for="definition in publishedDefinitions" :key="definition.id" :value="definition.id">
                {{ definition.name }}
              </a-select-option>
            </a-select>
          </a-form-item>

          <a-form-item label="Business key">
            <a-input v-model:value="formState.businessKey" placeholder="Optional business key" />
          </a-form-item>

          <template v-if="selectedDefinition">
            <a-divider>Form Data</a-divider>

            <a-alert
              v-if="visibleFields.length === 0"
              type="info"
              show-icon
              message="This process has no configured form fields."
              style="margin-bottom: 16px"
            />

            <a-form-item
              v-for="field in visibleFields"
              :key="field.id"
              :label="field.label"
              :required="field.required"
            >
              <a-input
                v-if="field.type === 'text'"
                v-model:value="formState.variables[field.name]"
                :placeholder="field.placeholder"
              />
              <a-input-number
                v-else-if="field.type === 'number'"
                v-model:value="formState.variables[field.name]"
                :placeholder="field.placeholder"
                style="width: 100%"
              />
              <a-textarea
                v-else
                v-model:value="formState.variables[field.name]"
                :placeholder="field.placeholder"
                :rows="4"
              />
            </a-form-item>
          </template>

          <a-form-item>
            <a-space>
              <a-button type="primary" :loading="loading" @click="handleSubmit">Submit</a-button>
              <a-button @click="handleReset">Reset</a-button>
            </a-space>
          </a-form-item>
        </a-form>
      </a-card>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { message } from 'ant-design-vue';
import MainLayout from '../components/layout/MainLayout.vue';
import { useInstanceStore } from '../stores/instance';
import { useProcessStore } from '../stores/process';
import { isFieldVisible, validateFormValues } from '../utils/processDefinition';

const processStore = useProcessStore();
const instanceStore = useInstanceStore();

const formState = ref({
  definitionId: undefined as string | undefined,
  businessKey: '',
  variables: {} as Record<string, any>,
});

const loading = ref(false);

const publishedDefinitions = computed(() =>
  processStore.definitions.filter(definition => definition.status === 'published')
);

const selectedDefinition = computed(() =>
  processStore.definitions.find(definition => definition.id === formState.value.definitionId)
);

const visibleFields = computed(() => {
  if (!selectedDefinition.value) return [];
  return selectedDefinition.value.formSchema.filter(field =>
    isFieldVisible(field, formState.value.variables)
  );
});

watch(
  selectedDefinition,
  definition => {
    if (!definition) return;
    const nextValues: Record<string, any> = {};
    for (const field of definition.formSchema) {
      nextValues[field.name] =
        formState.value.variables[field.name] ??
        field.defaultValue ??
        (field.type === 'number' ? undefined : '');
    }
    formState.value.variables = nextValues;
  }
);

function handleDefinitionChange() {
  formState.value.variables = {};
}

async function handleSubmit() {
  if (!formState.value.definitionId || !selectedDefinition.value) {
    message.error('Please select a process.');
    return;
  }

  const errors = validateFormValues(selectedDefinition.value, formState.value.variables);
  if (errors.length > 0) {
    message.error(errors[0]);
    return;
  }

  loading.value = true;
  try {
    await instanceStore.startProcess(
      formState.value.definitionId,
      formState.value.businessKey || undefined,
      formState.value.variables
    );
    message.success('Process started.');
    handleReset();
  } catch (error: any) {
    message.error(error.message || 'Submit failed.');
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
}

onMounted(() => {
  processStore.fetchDefinitions();
});
</script>

<style scoped>
.apply-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
}
</style>
