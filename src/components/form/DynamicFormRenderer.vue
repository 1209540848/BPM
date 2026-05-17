<template>
  <div class="dynamic-form-renderer">
    <a-empty v-if="!fields.length" description="当前流程还没有配置申请表单字段" />
    <template v-else>
      <a-form-item
        v-for="field in fields"
        :key="field.key"
        :label="field.label"
        :extra="field.description"
        :validate-status="getValidateStatus(field)"
        :help="getValidateHelp(field)"
      >
        <a-input
          v-if="field.type === 'input'"
          v-model:value="formData[field.key]"
          :placeholder="field.placeholder || `请输入${field.label}`"
        />
        <a-textarea
          v-else-if="field.type === 'textarea'"
          v-model:value="formData[field.key]"
          :placeholder="field.placeholder || `请输入${field.label}`"
          :rows="4"
        />
        <a-input-number
          v-else-if="field.type === 'number'"
          v-model:value="formData[field.key]"
          :placeholder="field.placeholder || `请输入${field.label}`"
          style="width: 100%"
        />
        <a-select
          v-else-if="field.type === 'select'"
          v-model:value="formData[field.key]"
          :placeholder="field.placeholder || `请选择${field.label}`"
          allow-clear
        >
          <a-select-option
            v-for="option in field.options || []"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </a-select-option>
        </a-select>
        <a-date-picker
          v-else-if="field.type === 'date'"
          v-model:value="formData[field.key]"
          :placeholder="field.placeholder || `请选择${field.label}`"
          value-format="YYYY-MM-DD"
          style="width: 100%"
        />
      </a-form-item>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import type { DynamicFormField } from '../../types';

const props = defineProps<{
  fields: DynamicFormField[];
  modelValue: Record<string, any>;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, any>];
}>();

const formData = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

watch(
  () => props.fields,
  (fields) => {
    const nextValue = { ...props.modelValue };
    fields.forEach((field) => {
      if (nextValue[field.key] === undefined && field.defaultValue !== undefined) {
        nextValue[field.key] = field.defaultValue;
      }
    });
    emit('update:modelValue', nextValue);
  },
  { immediate: true }
);

function isEmpty(value: any) {
  return value === undefined || value === null || value === '';
}

function getFieldError(field: DynamicFormField) {
  const value = props.modelValue[field.key];
  if (field.required && isEmpty(value)) {
    return `请填写${field.label}`;
  }
  if (!isEmpty(value) && field.type === 'number' && Number.isNaN(Number(value))) {
    return `${field.label}必须是数字`;
  }
  return '';
}

function getValidateStatus(field: DynamicFormField) {
  return getFieldError(field) ? 'error' : undefined;
}

function getValidateHelp(field: DynamicFormField) {
  return getFieldError(field) || undefined;
}

defineExpose({
  validate() {
    const errors = props.fields.map(getFieldError).filter(Boolean);
    return {
      valid: errors.length === 0,
      errors,
    };
  },
});
</script>

<style scoped>
.dynamic-form-renderer {
  width: 100%;
}
</style>
