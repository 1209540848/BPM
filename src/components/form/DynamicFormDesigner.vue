<template>
  <div class="dynamic-form-designer">
    <div class="designer-toolbar">
      <div>
        <h3>申请表单配置</h3>
        <p>配置后的字段会在发起申请、审批详情和实例详情中动态展示。</p>
      </div>
      <a-space>
        <a-button @click="addPurchasePreset">采购模板</a-button>
        <a-button type="primary" @click="addField">新增字段</a-button>
        <a-button :loading="saving" @click="saveFields">保存表单</a-button>
      </a-space>
    </div>

    <a-alert
      type="info"
      show-icon
      message="字段标识会作为流程变量 key，例如 amount 可用于连线条件 amount >= 5000。"
      style="margin-bottom: 16px"
    />

    <a-empty v-if="!localFields.length" description="暂无字段，请新增字段或使用采购模板" />

    <div v-else class="field-list">
      <a-card v-for="(field, index) in localFields" :key="field.id || field.key || index" class="field-card" size="small">
        <template #title>
          <a-space>
            <span class="field-index">{{ index + 1 }}</span>
            <span>{{ field.label || '未命名字段' }}</span>
          </a-space>
        </template>
        <template #extra>
          <a-button danger size="small" @click="removeField(index)">删除</a-button>
        </template>

        <a-row :gutter="12">
          <a-col :span="6">
            <a-form-item label="字段标识">
              <a-input v-model:value="field.key" placeholder="amount" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="字段名称">
              <a-input v-model:value="field.label" placeholder="采购金额" />
            </a-form-item>
          </a-col>
          <a-col :span="5">
            <a-form-item label="字段类型">
              <a-select v-model:value="field.type">
                <a-select-option value="input">单行文本</a-select-option>
                <a-select-option value="textarea">多行文本</a-select-option>
                <a-select-option value="number">数字</a-select-option>
                <a-select-option value="select">下拉选择</a-select-option>
                <a-select-option value="date">日期</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="3">
            <a-form-item label="必填">
              <a-switch v-model:checked="field.required" />
            </a-form-item>
          </a-col>
          <a-col :span="4">
            <a-form-item label="占位提示">
              <a-input v-model:value="field.placeholder" placeholder="请输入..." />
            </a-form-item>
          </a-col>
        </a-row>

        <a-form-item v-if="field.type === 'select'" label="选项配置">
          <a-input
            v-model:value="field.optionsText"
            placeholder="一行一个选项，例如：办公用品=office"
          />
        </a-form-item>
        <a-form-item label="字段说明">
          <a-input v-model:value="field.description" placeholder="可选，用于提示填写规则" />
        </a-form-item>
      </a-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { message } from 'ant-design-vue';
import { nanoid } from 'nanoid';
import type { DynamicFormField, DynamicFormFieldType } from '../../types';
import { useProcessStore } from '../../stores/process';

interface EditableField extends DynamicFormField {
  id?: string;
  optionsText?: string;
}

const props = defineProps<{
  definitionId?: string;
  fields: DynamicFormField[];
}>();

const processStore = useProcessStore();
const saving = ref(false);
const localFields = ref<EditableField[]>([]);

watch(
  () => props.fields,
  (fields) => {
    localFields.value = fields.map((field) => ({
      ...field,
      id: nanoid(),
      optionsText: (field.options || []).map((option) => `${option.label}=${option.value}`).join('\n'),
    }));
  },
  { immediate: true, deep: true }
);

function addField() {
  localFields.value.push({
    id: nanoid(),
    key: `field_${localFields.value.length + 1}`,
    label: '新字段',
    type: 'input' as DynamicFormFieldType,
    required: false,
    placeholder: '',
    optionsText: '',
  });
}

function addPurchasePreset() {
  localFields.value = [
    { id: nanoid(), key: 'item', label: '采购物品', type: 'input', required: true, placeholder: '请输入采购物品' },
    { id: nanoid(), key: 'amount', label: '采购金额', type: 'number', required: true, placeholder: '请输入采购金额' },
    { id: nanoid(), key: 'supplier', label: '供应商', type: 'input', required: false, placeholder: '请输入供应商' },
    { id: nanoid(), key: 'reason', label: '采购原因', type: 'textarea', required: true, placeholder: '请输入采购原因' },
  ];
}

function removeField(index: number) {
  localFields.value.splice(index, 1);
}

function parseOptions(optionsText?: string) {
  return (optionsText || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, value] = line.split('=').map((item) => item.trim());
      const optionLabel = label || value || line;
      return { label: optionLabel, value: value || optionLabel };
    });
}

function normalizeFields(): DynamicFormField[] {
  return localFields.value.map((field) => ({
    key: field.key.trim(),
    label: field.label.trim(),
    type: field.type,
    required: !!field.required,
    placeholder: field.placeholder,
    description: field.description,
    options: field.type === 'select' ? parseOptions(field.optionsText) : [],
  }));
}

async function saveFields() {
  if (!props.definitionId) {
    message.warning('请先选择或创建流程');
    return;
  }

  const fields = normalizeFields();
  const keySet = new Set<string>();
  for (const field of fields) {
    if (!field.key || !field.label) {
      message.error('字段标识和字段名称不能为空');
      return;
    }
    if (keySet.has(field.key)) {
      message.error(`字段标识重复：${field.key}`);
      return;
    }
    keySet.add(field.key);
  }

  saving.value = true;
  try {
    await processStore.updateFormFields(props.definitionId, fields);
    message.success('表单配置已保存');
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.dynamic-form-designer {
  padding: 4px;
}

.designer-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.designer-toolbar h3 {
  margin: 0 0 4px;
}

.designer-toolbar p {
  margin: 0;
  color: rgba(0, 0, 0, 0.45);
}

.field-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field-card {
  border-radius: 10px;
}

.field-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #e6f4ff;
  color: #1677ff;
  font-size: 12px;
}
</style>
