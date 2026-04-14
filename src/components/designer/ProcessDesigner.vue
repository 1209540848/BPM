<template>
  <div class="process-designer">
    <a-card :bordered="false" style="height: 100%; display: flex; flex-direction: column">
      <template #title>
        <a-space wrap>
          <a-button type="primary" :loading="saving" @click="handleSave">Save</a-button>
          <a-button @click="handleValidate">Validate ({{ validationIssues.length }})</a-button>
          <a-button @click="handleClear">Clear</a-button>
          <a-button @click="handleExport">Export</a-button>
          <a-divider type="vertical" />
          <a-button @click="handleZoomIn">Zoom In</a-button>
          <a-button @click="handleZoomOut">Zoom Out</a-button>
          <a-button @click="handleZoomReset">Reset</a-button>
          <a-divider type="vertical" />
          <a-button :disabled="!canUndo" @click="handleUndo">Undo</a-button>
          <a-button :disabled="!canRedo" @click="handleRedo">Redo</a-button>
        </a-space>
      </template>

      <div class="designer-content">
        <div class="node-palette">
          <div class="section-title">Palette</div>
          <div
            v-for="nodeType in nodeTypes"
            :key="nodeType.type"
            class="palette-item"
            draggable="true"
            @dragstart="handleDragStart($event, nodeType)"
          >
            <div class="palette-node" :style="{ backgroundColor: nodeType.color }">
              {{ nodeType.label }}
            </div>
          </div>
          <div class="section-title" style="margin-top: 16px">Validation</div>
          <a-alert
            :type="validationIssues.length ? 'warning' : 'success'"
            :message="validationIssues.length ? 'Flow has issues to fix before publish.' : 'Flow passes basic checks.'"
            show-icon
          />
        </div>

        <div ref="containerRef" class="designer-container" @dragover.prevent @drop="handleDrop"></div>

        <div class="designer-sidebar">
          <a-tabs v-model:activeKey="activeTab" size="small">
            <a-tab-pane key="element" tab="Element">
              <a-form v-if="selectedNode" layout="vertical" size="small">
                <a-form-item label="Node name">
                  <a-input v-model:value="selectedNode.name" @change="applySelectedNode" />
                </a-form-item>
                <template v-if="selectedNode.type === 'userTask'">
                  <a-form-item label="Assignee type">
                    <a-select v-model:value="selectedNode.assigneeType" @change="applySelectedNode">
                      <a-select-option value="user">User</a-select-option>
                      <a-select-option value="role">Role</a-select-option>
                    </a-select>
                  </a-form-item>
                  <a-form-item label="Assignee value">
                    <a-input v-model:value="selectedNode.assignee" @change="applySelectedNode" />
                  </a-form-item>
                  <a-form-item label="Approval mode">
                    <a-select v-model:value="selectedNode.approvalMode" @change="applySelectedNode">
                      <a-select-option value="sequential">Sequential</a-select-option>
                      <a-select-option value="allApprove">All approve</a-select-option>
                      <a-select-option value="anyApprove">Any approve</a-select-option>
                    </a-select>
                  </a-form-item>
                </template>
                <a-form-item label="Description">
                  <a-textarea v-model:value="selectedNode.description" :rows="3" @change="applySelectedNode" />
                </a-form-item>
                <a-button danger block @click="handleDeleteNode">Delete node</a-button>
              </a-form>

              <a-form v-else-if="selectedEdge" layout="vertical" size="small">
                <a-form-item label="Branch label">
                  <a-input v-model:value="selectedEdge.label" @change="applySelectedEdge" />
                </a-form-item>
                <a-form-item label="Default branch">
                  <a-switch v-model:checked="selectedEdge.isDefault" @change="applySelectedEdge" />
                </a-form-item>
                <template v-if="!selectedEdge.isDefault">
                  <a-form-item label="Rule mode">
                    <a-select v-model:value="selectedEdge.conditionGroup!.mode" @change="applySelectedEdge">
                      <a-select-option value="all">All rules</a-select-option>
                      <a-select-option value="any">Any rule</a-select-option>
                    </a-select>
                  </a-form-item>
                  <div v-for="rule in selectedEdge.conditionGroup!.rules" :key="rule.id" class="rule-row">
                    <a-select v-model:value="rule.field" style="width: 110px" @change="applySelectedEdge">
                      <a-select-option v-for="field in formSchema" :key="field.id" :value="field.name">{{ field.label }}</a-select-option>
                    </a-select>
                    <a-select v-model:value="rule.operator" style="width: 110px" @change="applySelectedEdge">
                      <a-select-option value="equals">=</a-select-option>
                      <a-select-option value="notEquals">!=</a-select-option>
                      <a-select-option value="greaterThan">&gt;</a-select-option>
                      <a-select-option value="lessThan">&lt;</a-select-option>
                      <a-select-option value="greaterThanOrEquals">&gt;=</a-select-option>
                      <a-select-option value="lessThanOrEquals">&lt;=</a-select-option>
                      <a-select-option value="contains">contains</a-select-option>
                    </a-select>
                    <a-input v-model:value="rule.value" style="width: 100px" @change="applySelectedEdge" />
                    <a-button danger @click="removeEdgeRule(rule.id)">Del</a-button>
                  </div>
                  <a-button block @click="addEdgeRule">Add rule</a-button>
                </template>
                <a-button danger block style="margin-top: 12px" @click="handleDeleteEdge">Delete edge</a-button>
              </a-form>

              <a-empty v-else description="Select a node or edge" />
            </a-tab-pane>

            <a-tab-pane key="form" tab="Form">
              <a-button type="primary" block @click="addFormField">Add field</a-button>
              <div class="field-list">
                <div
                  v-for="field in formSchema"
                  :key="field.id"
                  class="field-item"
                  :class="{ active: field.id === selectedFieldId }"
                  @click="selectedFieldId = field.id"
                >
                  <div>
                    <div class="field-title">{{ field.label }}</div>
                    <div class="field-name">{{ field.name }}</div>
                  </div>
                  <a-button size="small" danger @click.stop="removeFormField(field.id)">Del</a-button>
                </div>
              </div>

              <a-form v-if="selectedField" layout="vertical" size="small">
                <a-divider />
                <a-form-item label="Field key"><a-input v-model:value="selectedField.name" /></a-form-item>
                <a-form-item label="Field label"><a-input v-model:value="selectedField.label" /></a-form-item>
                <a-form-item label="Field type">
                  <a-select v-model:value="selectedField.type">
                    <a-select-option value="text">Text</a-select-option>
                    <a-select-option value="textarea">Textarea</a-select-option>
                    <a-select-option value="number">Number</a-select-option>
                  </a-select>
                </a-form-item>
                <a-form-item label="Placeholder"><a-input v-model:value="selectedField.placeholder" /></a-form-item>
                <a-form-item label="Default value"><a-input v-model:value="selectedField.defaultValue" /></a-form-item>
                <a-form-item label="Required"><a-switch v-model:checked="selectedField.required" /></a-form-item>

                <a-divider orientation="left">Visibility rules</a-divider>
                <a-button v-if="!selectedField.visibleWhen" block @click="enableFieldVisibleWhen">Enable visibility rules</a-button>
                <template v-else>
                  <a-form-item label="Rule mode">
                    <a-select v-model:value="selectedField.visibleWhen.mode">
                      <a-select-option value="all">All rules</a-select-option>
                      <a-select-option value="any">Any rule</a-select-option>
                    </a-select>
                  </a-form-item>
                  <div v-for="rule in selectedField.visibleWhen.rules" :key="rule.id" class="rule-row">
                    <a-select v-model:value="rule.field" style="width: 110px">
                      <a-select-option v-for="field in referencableFields(selectedField.id)" :key="field.id" :value="field.name">{{ field.label }}</a-select-option>
                    </a-select>
                    <a-select v-model:value="rule.operator" style="width: 110px">
                      <a-select-option value="equals">=</a-select-option>
                      <a-select-option value="notEquals">!=</a-select-option>
                      <a-select-option value="greaterThan">&gt;</a-select-option>
                      <a-select-option value="lessThan">&lt;</a-select-option>
                      <a-select-option value="greaterThanOrEquals">&gt;=</a-select-option>
                      <a-select-option value="lessThanOrEquals">&lt;=</a-select-option>
                      <a-select-option value="contains">contains</a-select-option>
                    </a-select>
                    <a-input v-model:value="rule.value" style="width: 100px" />
                    <a-button danger @click="removeFieldVisibleRule(rule.id)">Del</a-button>
                  </div>
                  <a-space>
                    <a-button @click="addFieldVisibleRule">Add visibility rule</a-button>
                    <a-button @click="selectedField.visibleWhen = null">Clear visibility rules</a-button>
                  </a-space>
                </template>

                <a-divider orientation="left">Validation rules</a-divider>
                <div v-for="rule in selectedField.validations" :key="rule.id" class="rule-row">
                  <a-select v-model:value="rule.type" style="width: 150px">
                    <a-select-option value="min">Min</a-select-option>
                    <a-select-option value="max">Max</a-select-option>
                    <a-select-option value="minLength">Min length</a-select-option>
                    <a-select-option value="maxLength">Max length</a-select-option>
                    <a-select-option value="greaterThanField">Greater than field</a-select-option>
                    <a-select-option value="lessThanField">Less than field</a-select-option>
                  </a-select>
                  <a-select
                    v-if="rule.type === 'greaterThanField' || rule.type === 'lessThanField'"
                    v-model:value="rule.field"
                    style="width: 110px"
                  >
                    <a-select-option v-for="field in referencableFields(selectedField.id)" :key="field.id" :value="field.name">{{ field.label }}</a-select-option>
                  </a-select>
                  <a-input v-else v-model:value="rule.value" style="width: 100px" />
                  <a-button danger @click="removeFieldValidationRule(rule.id)">Del</a-button>
                </div>
                <a-button block @click="addFieldValidationRule">Add validation rule</a-button>
              </a-form>
            </a-tab-pane>
          </a-tabs>
        </div>
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { Graph } from '@antv/x6';
import { Clipboard } from '@antv/x6-plugin-clipboard';
import { History } from '@antv/x6-plugin-history';
import { Keyboard } from '@antv/x6-plugin-keyboard';
import { Selection } from '@antv/x6-plugin-selection';
import { Snapline } from '@antv/x6-plugin-snapline';
import { Transform } from '@antv/x6-plugin-transform';
import { message, Modal } from 'ant-design-vue';
import { nanoid } from 'nanoid';
import type { EdgeData, FormFieldSchema, NodeData } from '../../types';
import { ApprovalAssigneeType, ApprovalMode, NodeType } from '../../types';
import { useProcessStore } from '../../stores/process';
import { buildDefinitionPayload, createConditionRule, createEmptyConditionGroup, createFormField, createValidationRule, normalizeProcessDefinition, validateProcessDefinition } from '../../utils/processDefinition';

const processStore = useProcessStore();
const containerRef = ref<HTMLDivElement>();
const saving = ref(false);
const zoom = ref(1);
const canUndo = ref(false);
const canRedo = ref(false);
const activeTab = ref('element');
const selectedNode = ref<NodeData | null>(null);
const selectedEdge = ref<EdgeData | null>(null);
const selectedFieldId = ref<string | null>(null);
const formSchema = ref<FormFieldSchema[]>([]);
let graph: Graph | null = null;
let isLoadingDefinition = false;
let syncTimeout: number | null = null;

const nodeTypes = [
  { type: NodeType.START, label: 'Start', color: '#52c41a' },
  { type: NodeType.END, label: 'End', color: '#ff4d4f' },
  { type: NodeType.USER_TASK, label: 'User Task', color: '#1677ff' },
  { type: NodeType.EXCLUSIVE_GATEWAY, label: 'Gateway', color: '#faad14' },
  { type: NodeType.PARALLEL_GATEWAY, label: 'Parallel', color: '#722ed1' },
  { type: NodeType.SERVICE_TASK, label: 'Service', color: '#13c2c2' },
];

const selectedField = computed(() => formSchema.value.find(field => field.id === selectedFieldId.value) || null);
const validationIssues = computed(() => !graph ? [] : validateProcessDefinition({ nodes: collectNodes(), edges: collectEdges(), formSchema: formSchema.value }));

watch(() => processStore.currentDefinition?.id, () => loadDefinition());
watch(formSchema, () => debouncedSync(), { deep: true });

onMounted(() => {
  if (!containerRef.value) return;
  graph = new Graph({
    container: containerRef.value,
    width: '100%',
    height: '100%',
    grid: { visible: true, size: 10, type: 'dot', args: { color: '#d0d0d0', thickness: 1 } },
    panning: { enabled: true, modifiers: 'ctrl' },
    mousewheel: { enabled: true, modifiers: 'ctrl', factor: 1.1, maxScale: 2, minScale: 0.5 },
    connecting: {
      router: 'manhattan',
      connector: { name: 'rounded', args: { radius: 8 } },
      anchor: 'center',
      connectionPoint: 'anchor',
      allowBlank: false,
      snap: true,
      createEdge() {
        return graph?.createEdge({ data: { conditionGroup: createEmptyConditionGroup(), isDefault: false, conditionExpression: '' }, attrs: { line: { stroke: '#A2B1C3', strokeWidth: 2, targetMarker: { name: 'block', width: 12, height: 8 } } }, zIndex: 0 });
      },
      validateConnection({ targetMagnet }: any) {
        return !!targetMagnet;
      },
    },
    background: { color: '#f5f5f5' },
  } as any);
  graph.use(new Selection({ enabled: true, multiple: true, rubberband: true }));
  graph.use(new Snapline({ enabled: true }));
  graph.use(new Keyboard({ enabled: true }));
  graph.use(new Clipboard({ enabled: true }));
  graph.use(new History());
  graph.use(new Transform());
  setupGraphEvents();
  setupKeyboardShortcuts();
  loadDefinition();
});

onUnmounted(() => {
  if (syncTimeout) clearTimeout(syncTimeout);
  graph?.dispose();
});

function setupGraphEvents() {
  if (!graph) return;
  graph.on('node:change:*', debouncedSync);
  graph.on('node:moved', debouncedSync);
  graph.on('edge:connected', debouncedSync);
  graph.on('edge:removed', debouncedSync);
  graph.on('node:removed', debouncedSync);
  graph.on('cell:added', debouncedSync);
  graph.on('history:change', () => {
    const historyPlugin = graph?.getPlugin('history');
    canUndo.value = Boolean(historyPlugin && (historyPlugin as any).canUndo());
    canRedo.value = Boolean(historyPlugin && (historyPlugin as any).canRedo());
  });
  graph.on('node:click', ({ node }) => {
    const data = node.getData() || {};
    selectedEdge.value = null;
    selectedNode.value = { id: node.id, type: data.nodeType || NodeType.USER_TASK, name: String(node.getAttrs().label?.text || 'Node'), assigneeType: data.assigneeType || ApprovalAssigneeType.USER, assignee: data.assignee || '', approvalMode: data.approvalMode || ApprovalMode.SEQUENTIAL, approvalType: data.approvalMode || ApprovalMode.SEQUENTIAL, description: data.description || '', x: node.position().x, y: node.position().y };
    activeTab.value = 'element';
  });
  graph.on('edge:click', ({ edge }) => {
    const data = edge.getData() || {};
    selectedNode.value = null;
    selectedEdge.value = { id: edge.id, source: edge.getSourceCellId() || '', target: edge.getTargetCellId() || '', label: edge.getLabels()[0]?.text as string, isDefault: Boolean(data.isDefault), conditionGroup: data.conditionGroup || createEmptyConditionGroup(), conditionExpression: data.conditionExpression || '' };
    activeTab.value = 'element';
  });
  graph.on('blank:click', () => {
    selectedNode.value = null;
    selectedEdge.value = null;
  });
}

function setupKeyboardShortcuts() {
  if (!graph) return;
  graph.bindKey('delete', () => { const cells = graph?.getSelectedCells(); if (cells?.length) graph?.removeCells(cells); });
  graph.bindKey('backspace', () => { const cells = graph?.getSelectedCells(); if (cells?.length) graph?.removeCells(cells); });
  graph.bindKey(['meta+z', 'ctrl+z'], () => { if (graph?.canUndo()) graph.undo(); });
  graph.bindKey(['meta+shift+z', 'ctrl+shift+z'], () => { if (graph?.canRedo()) graph.redo(); });
}

function loadDefinition() {
  const definition = processStore.currentDefinition;
  if (!definition || !graph || isLoadingDefinition) return;
  const normalized = normalizeProcessDefinition(definition);
  isLoadingDefinition = true;
  graph.clearCells();
  formSchema.value = JSON.parse(JSON.stringify(normalized.formSchema));
  selectedNode.value = null;
  selectedEdge.value = null;
  selectedFieldId.value = formSchema.value[0]?.id || null;
  for (const node of normalized.nodes) {
    graph.addNode({ id: node.id, x: node.x || 100, y: node.y || 100, width: 120, height: 60, label: node.name, data: { nodeType: node.type, assigneeType: node.assigneeType || ApprovalAssigneeType.USER, assignee: node.assignee || '', approvalMode: node.approvalMode || ApprovalMode.SEQUENTIAL, description: node.description || '' }, attrs: { body: { fill: getNodeColor(node.type), stroke: getNodeColor(node.type), rx: 6, ry: 6 }, label: { fill: '#fff', fontSize: 14 } }, ports: getPorts() });
  }
  for (const edge of normalized.edges) {
    graph.addEdge({ id: edge.id, source: edge.source, target: edge.target, labels: edge.label ? [{ text: edge.label }] : [], data: { conditionGroup: edge.conditionGroup || createEmptyConditionGroup(), isDefault: edge.isDefault || false, conditionExpression: edge.conditionExpression || '' }, attrs: { line: { stroke: '#A2B1C3', strokeWidth: 2, targetMarker: { name: 'block', width: 12, height: 8 } } } });
  }
  isLoadingDefinition = false;
}

function getPorts() {
  return { groups: { top: { position: 'top', attrs: { circle: { r: 4, magnet: true, stroke: '#5F95FF', strokeWidth: 1, fill: '#fff' } } }, bottom: { position: 'bottom', attrs: { circle: { r: 4, magnet: true, stroke: '#5F95FF', strokeWidth: 1, fill: '#fff' } } }, left: { position: 'left', attrs: { circle: { r: 4, magnet: true, stroke: '#5F95FF', strokeWidth: 1, fill: '#fff' } } }, right: { position: 'right', attrs: { circle: { r: 4, magnet: true, stroke: '#5F95FF', strokeWidth: 1, fill: '#fff' } } } }, items: [{ group: 'top' }, { group: 'bottom' }, { group: 'left' }, { group: 'right' }] };
}

function getNodeColor(type: string) {
  switch (type) {
    case NodeType.START: return '#52c41a';
    case NodeType.END: return '#ff4d4f';
    case NodeType.EXCLUSIVE_GATEWAY: return '#faad14';
    case NodeType.PARALLEL_GATEWAY: return '#722ed1';
    case NodeType.SERVICE_TASK: return '#13c2c2';
    default: return '#1677ff';
  }
}

function collectNodes(): NodeData[] {
  if (!graph) return [];
  return graph.getNodes().map(node => {
    const data = node.getData() || {};
    return { id: node.id, type: data.nodeType || NodeType.USER_TASK, name: String(node.getAttrs().label?.text || 'Node'), x: node.position().x, y: node.position().y, assigneeType: data.assigneeType || ApprovalAssigneeType.USER, assignee: data.assignee || '', approvalMode: data.approvalMode || ApprovalMode.SEQUENTIAL, approvalType: data.approvalMode || ApprovalMode.SEQUENTIAL, description: data.description || '' };
  });
}

function collectEdges(): EdgeData[] {
  if (!graph) return [];
  return graph.getEdges().map(edge => {
    const data = edge.getData() || {};
    return { id: edge.id, source: edge.getSourceCellId() || '', target: edge.getTargetCellId() || '', label: edge.getLabels()[0]?.text as string, isDefault: Boolean(data.isDefault), conditionGroup: data.conditionGroup || createEmptyConditionGroup(), conditionExpression: data.conditionExpression || '' };
  });
}

function debouncedSync() {
  if (isLoadingDefinition) return;
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = window.setTimeout(() => syncToStore(), 500);
}

async function syncToStore() {
  const definition = processStore.currentDefinition;
  if (!definition || !graph) return;
  await processStore.updateNodesAndEdges(definition.id, collectNodes(), collectEdges(), JSON.parse(JSON.stringify(formSchema.value)));
}

async function handleSave() {
  if (!processStore.currentDefinition) return message.warning('Select or create a process first.');
  saving.value = true;
  try {
    await syncToStore();
    message.success('Saved');
  } catch (error: any) {
    message.error(error.message || 'Save failed');
  } finally {
    saving.value = false;
  }
}

function handleValidate() {
  if (validationIssues.value.length === 0) return message.success('Flow passes validation.');
  message.warning(validationIssues.value.join(' | '));
}

function handleClear() {
  if (!graph) return;
  Modal.confirm({ title: 'Clear designer', content: 'This removes the graph and form schema.', onOk: () => { graph?.clearCells(); formSchema.value = []; selectedNode.value = null; selectedEdge.value = null; selectedFieldId.value = null; debouncedSync(); } });
}

function handleExport() {
  if (!graph) return;
  const payload = buildDefinitionPayload({ nodes: collectNodes(), edges: collectEdges(), formSchema: formSchema.value });
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `process-${processStore.currentDefinition?.name || 'definition'}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function handleZoomIn() { if (!graph) return; const nextZoom = Math.min(graph.zoom() * 1.1, 2); graph.zoomTo(nextZoom); zoom.value = nextZoom; }
function handleZoomOut() { if (!graph) return; const nextZoom = Math.max(graph.zoom() * 0.9, 0.5); graph.zoomTo(nextZoom); zoom.value = nextZoom; }
function handleZoomReset() { if (!graph) return; graph.zoomTo(1); graph.centerContent(); zoom.value = 1; }
function handleUndo() { graph?.undo(); }
function handleRedo() { graph?.redo(); }

function handleDragStart(event: DragEvent, nodeType: { type: string; label: string; color: string }) {
  event.dataTransfer?.setData('nodeType', JSON.stringify(nodeType));
}

function handleDrop(event: DragEvent) {
  if (!graph || !containerRef.value || !processStore.currentDefinition) return message.warning('Select or create a process first.');
  const nodeTypeStr = event.dataTransfer?.getData('nodeType');
  if (!nodeTypeStr) return;
  const nodeType = JSON.parse(nodeTypeStr);
  const rect = containerRef.value.getBoundingClientRect();
  graph.addNode({ id: nanoid(), x: event.clientX - rect.left - 60, y: event.clientY - rect.top - 30, width: 120, height: 60, label: nodeType.label, data: { nodeType: nodeType.type, assigneeType: ApprovalAssigneeType.USER, assignee: '', approvalMode: ApprovalMode.SEQUENTIAL, description: '' }, attrs: { body: { fill: nodeType.color, stroke: nodeType.color, rx: 6, ry: 6 }, label: { fill: '#fff', fontSize: 14 } }, ports: getPorts() });
}

function applySelectedNode() {
  if (!graph || !selectedNode.value) return;
  const node = graph.getCellById(selectedNode.value.id);
  if (!node) return;
  node.setAttrs({ label: { text: selectedNode.value.name } });
  node.setData({ nodeType: selectedNode.value.type, assigneeType: selectedNode.value.assigneeType || ApprovalAssigneeType.USER, assignee: selectedNode.value.assignee || '', approvalMode: selectedNode.value.approvalMode || ApprovalMode.SEQUENTIAL, description: selectedNode.value.description || '' });
  debouncedSync();
}

function applySelectedEdge() {
  if (!graph || !selectedEdge.value) return;
  const edge = graph.getCellById(selectedEdge.value.id) as any;
  if (!edge) return;
  selectedEdge.value.conditionGroup = selectedEdge.value.conditionGroup || createEmptyConditionGroup();
  edge.setLabels(selectedEdge.value.label ? [{ text: selectedEdge.value.label }] : []);
  edge.setData({ conditionGroup: selectedEdge.value.conditionGroup, isDefault: selectedEdge.value.isDefault || false, conditionExpression: selectedEdge.value.conditionExpression || '' });
  debouncedSync();
}

function handleDeleteNode() { if (!graph || !selectedNode.value) return; const node = graph.getCellById(selectedNode.value.id); if (!node) return; graph.removeCell(node); selectedNode.value = null; }
function handleDeleteEdge() { if (!graph || !selectedEdge.value) return; const edge = graph.getCellById(selectedEdge.value.id); if (!edge) return; graph.removeCell(edge); selectedEdge.value = null; }
function addEdgeRule() { if (!selectedEdge.value) return; selectedEdge.value.conditionGroup = selectedEdge.value.conditionGroup || createEmptyConditionGroup(); selectedEdge.value.conditionGroup.rules.push(createConditionRule()); applySelectedEdge(); }
function removeEdgeRule(ruleId: string) { if (!selectedEdge.value?.conditionGroup) return; selectedEdge.value.conditionGroup.rules = selectedEdge.value.conditionGroup.rules.filter(rule => rule.id !== ruleId); applySelectedEdge(); }
function addFormField() { const field = createFormField(); formSchema.value.push(field); selectedFieldId.value = field.id; activeTab.value = 'form'; }
function removeFormField(fieldId: string) { formSchema.value = formSchema.value.filter(field => field.id !== fieldId); if (selectedFieldId.value === fieldId) selectedFieldId.value = formSchema.value[0]?.id || null; }
function referencableFields(currentFieldId: string) { return formSchema.value.filter(field => field.id !== currentFieldId); }
function enableFieldVisibleWhen() { if (!selectedField.value) return; selectedField.value.visibleWhen = createEmptyConditionGroup(); }
function addFieldVisibleRule() { if (!selectedField.value) return; selectedField.value.visibleWhen = selectedField.value.visibleWhen || createEmptyConditionGroup(); selectedField.value.visibleWhen.rules.push(createConditionRule()); }
function removeFieldVisibleRule(ruleId: string) { if (!selectedField.value?.visibleWhen) return; selectedField.value.visibleWhen.rules = selectedField.value.visibleWhen.rules.filter(rule => rule.id !== ruleId); }
function addFieldValidationRule() { if (!selectedField.value) return; selectedField.value.validations = selectedField.value.validations || []; selectedField.value.validations.push(createValidationRule()); }
function removeFieldValidationRule(ruleId: string) { if (!selectedField.value) return; selectedField.value.validations = (selectedField.value.validations || []).filter(rule => rule.id !== ruleId); }
</script>

<style scoped>
.process-designer { height: 100%; }
.designer-content { display: grid; grid-template-columns: 180px 1fr 360px; gap: 16px; flex: 1; min-height: 0; }
.node-palette, .designer-sidebar { background: #fafafa; border: 1px solid #f0f0f0; border-radius: 8px; padding: 12px; overflow-y: auto; }
.section-title { font-size: 13px; font-weight: 600; margin-bottom: 12px; }
.palette-item + .palette-item { margin-top: 10px; }
.palette-node { border-radius: 8px; color: #fff; cursor: grab; padding: 12px; text-align: center; }
.designer-container { background: #f5f5f5; border: 1px solid #f0f0f0; border-radius: 8px; min-height: 640px; }
.field-list { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
.field-item { display: flex; align-items: center; justify-content: space-between; border: 1px solid #e5e7eb; border-radius: 8px; cursor: pointer; padding: 10px 12px; }
.field-item.active { border-color: #1677ff; background: #f0f7ff; }
.field-title { font-weight: 600; }
.field-name { color: #8c8c8c; font-size: 12px; }
.rule-row { display: flex; gap: 8px; margin-bottom: 8px; }
@media (max-width: 1440px) { .designer-content { grid-template-columns: 160px 1fr 320px; } }
</style>
