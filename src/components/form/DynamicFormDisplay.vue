<template>
  <a-descriptions v-if="displayItems.length" :column="column" bordered>
    <a-descriptions-item
      v-for="item in displayItems"
      :key="item.key"
      :label="item.label"
    >
      {{ formatValue(item.value) }}
    </a-descriptions-item>
  </a-descriptions>
  <a-empty v-else description="暂无表单数据" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { DynamicFormField } from '../../types';

const props = withDefaults(defineProps<{
  fields?: DynamicFormField[];
  data?: Record<string, any> | null;
  column?: number;
}>(), {
  fields: () => [],
  data: () => ({}),
  column: 2,
});

const displayItems = computed(() => {
  const data = props.data || {};
  if (props.fields.length) {
    return props.fields.map((field) => ({
      key: field.key,
      label: field.label,
      value: data[field.key],
    }));
  }

  return Object.entries(data).map(([key, value]) => ({
    key,
    label: key,
    value,
  }));
});

function formatValue(value: any) {
  if (value === null || value === undefined || value === '') return '-';
  if (Array.isArray(value)) return value.join('、');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
</script>
