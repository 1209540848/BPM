import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { nanoid } from 'nanoid';
import type { EdgeData, FormFieldSchema, NodeData, ProcessDefinition } from '../types';
import { NodeType, ProcessStatus } from '../types';
import { processApi } from '../api';
import { buildDefinitionPayload, normalizeProcessDefinition } from '../utils/processDefinition';

export const useProcessStore = defineStore('process', () => {
  const definitions = ref<ProcessDefinition[]>([]);
  const currentDefinition = ref<ProcessDefinition | null>(null);
  const loading = ref(false);

  const publishedDefinitions = computed(() =>
    definitions.value.filter(definition => definition.status === 'published')
  );
  const draftDefinitions = computed(() =>
    definitions.value.filter(definition => definition.status === 'draft')
  );

  async function fetchDefinitions(params?: { page?: number; pageSize?: number; status?: string }) {
    loading.value = true;
    try {
      const data: any = await processApi.getDefinitions(params);
      definitions.value = data.list.map((item: any) => normalizeProcessDefinition(item));
    } finally {
      loading.value = false;
    }
  }

  async function createDefinition(name: string, description?: string): Promise<ProcessDefinition> {
    const now = Date.now();
    const definition: ProcessDefinition = {
      id: nanoid(),
      name,
      description,
      version: 1,
      status: ProcessStatus.DRAFT,
      nodes: [
        {
          id: 'start',
          type: NodeType.START,
          name: '开始',
          x: 100,
          y: 100,
        },
        {
          id: 'end',
          type: NodeType.END,
          name: '结束',
          x: 500,
          y: 100,
        },
      ],
      edges: [],
      formSchema: [],
      createdAt: now,
      updatedAt: now,
      createdBy: 'admin',
    };

    const result: any = await processApi.createDefinition({
      name,
      description,
      definition: buildDefinitionPayload(definition),
    });

    const parsedResult = normalizeProcessDefinition(result);
    definitions.value.push(parsedResult);
    currentDefinition.value = parsedResult;
    return parsedResult;
  }

  async function updateDefinitionData(
    id: string,
    nodes?: NodeData[],
    edges?: EdgeData[],
    formSchema?: FormFieldSchema[]
  ) {
    const index = definitions.value.findIndex(definition => definition.id === id);
    if (index === -1) return;

    const current = definitions.value[index];
    if (!current) return;

    const result: any = await processApi.updateDefinition(id, {
      name: current.name,
      description: current.description,
      definition: buildDefinitionPayload({
        nodes: nodes || current.nodes,
        edges: edges || current.edges,
        formSchema: formSchema || current.formSchema,
      }),
    });

    const parsedResult = normalizeProcessDefinition(result);
    definitions.value[index] = parsedResult;
    if (currentDefinition.value?.id === id) {
      currentDefinition.value = parsedResult;
    }
  }

  async function updateDefinition(id: string, updates: Partial<ProcessDefinition>) {
    const index = definitions.value.findIndex(definition => definition.id === id);
    if (index === -1) return;

    const current = definitions.value[index];
    if (!current) return;

    const result: any = await processApi.updateDefinition(id, {
      name: updates.name ?? current.name,
      description: updates.description ?? current.description,
      definition: buildDefinitionPayload({
        nodes: updates.nodes ?? current.nodes,
        edges: updates.edges ?? current.edges,
        formSchema: updates.formSchema ?? current.formSchema,
      }),
    });

    const parsedResult = normalizeProcessDefinition(result);
    definitions.value[index] = parsedResult;
    if (currentDefinition.value?.id === id) {
      currentDefinition.value = parsedResult;
    }
  }

  async function updateNodesAndEdges(
    id: string,
    nodes: NodeData[],
    edges: EdgeData[],
    formSchema?: FormFieldSchema[]
  ) {
    await updateDefinitionData(id, nodes, edges, formSchema);
  }

  async function updateNodes(id: string, nodes: NodeData[]) {
    const current = definitions.value.find(definition => definition.id === id);
    if (!current) return;
    await updateDefinitionData(id, nodes, current.edges, current.formSchema);
  }

  async function updateEdges(id: string, edges: EdgeData[]) {
    const current = definitions.value.find(definition => definition.id === id);
    if (!current) return;
    await updateDefinitionData(id, current.nodes, edges, current.formSchema);
  }

  async function updateFormSchema(id: string, formSchema: FormFieldSchema[]) {
    const current = definitions.value.find(definition => definition.id === id);
    if (!current) return;
    await updateDefinitionData(id, current.nodes, current.edges, formSchema);
  }

  async function publishDefinition(id: string) {
    const result: any = await processApi.publishDefinition(id);
    const parsedResult = normalizeProcessDefinition(result);
    const index = definitions.value.findIndex(definition => definition.id === id);
    if (index !== -1) {
      definitions.value[index] = parsedResult;
    }
    if (currentDefinition.value?.id === id) {
      currentDefinition.value = parsedResult;
    }
  }

  async function deleteDefinition(id: string) {
    await processApi.deleteDefinition(id);
    const index = definitions.value.findIndex(definition => definition.id === id);
    if (index !== -1) {
      definitions.value.splice(index, 1);
      if (currentDefinition.value?.id === id) {
        currentDefinition.value = null;
      }
    }
  }

  function setCurrentDefinition(id: string) {
    currentDefinition.value =
      definitions.value.find(definition => definition.id === id) || null;
  }

  return {
    definitions,
    currentDefinition,
    loading,
    publishedDefinitions,
    draftDefinitions,
    fetchDefinitions,
    createDefinition,
    updateDefinition,
    updateNodes,
    updateEdges,
    updateFormSchema,
    updateNodesAndEdges,
    publishDefinition,
    deleteDefinition,
    setCurrentDefinition,
  };
});
