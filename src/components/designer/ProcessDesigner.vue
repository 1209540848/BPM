<template>
  <div class="process-designer">
    <a-card :bordered="false" class="designer-card">
      <template #title>
        <a-space>
          <a-button type="primary" :loading="saving" @click="handleSave">保存流程</a-button>
          <a-button @click="handleClear">清空</a-button>
          <a-button @click="handleExport">导出 JSON</a-button>
          <a-divider type="vertical" />
          <a-button @click="handleZoomIn" :disabled="zoom >= 2">放大</a-button>
          <a-button @click="handleZoomOut" :disabled="zoom <= 0.5">缩小</a-button>
          <a-button @click="handleZoomReset">重置</a-button>
          <a-divider type="vertical" />
          <a-button @click="handleUndo" :disabled="!canUndo">撤销</a-button>
          <a-button @click="handleRedo" :disabled="!canRedo">重做</a-button>
        </a-space>
      </template>

      <div class="designer-content">
        <div class="node-palette">
          <div class="palette-title">节点库</div>
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
        </div>

        <div ref="containerRef" class="designer-container" @dragover.prevent @drop="handleDrop"></div>

        <div class="node-properties">
          <template v-if="selectedNode">
            <div class="properties-header">
              <div>
                <div class="properties-eyebrow">当前节点</div>
                <div class="properties-title">{{ selectedNode.typeLabel }}配置</div>
              </div>
              <span class="node-type-pill">{{ selectedNode.typeLabel }}</span>
            </div>
            <a-form layout="vertical" size="small">
              <a-form-item label="节点名称">
                <a-input v-model:value="selectedNode.name" @change="updateNodeName" />
              </a-form-item>

              <template v-if="selectedNode.type === NodeType.USER_TASK">
                <a-form-item label="分配方式">
                  <a-select
                    v-model:value="selectedNode.assigneeType"
                    placeholder="请选择分配方式"
                    @change="updateNodeProperty"
                  >
                    <a-select-option value="user">指定用户</a-select-option>
                    <a-select-option value="role">按角色分配</a-select-option>
                  </a-select>
                </a-form-item>
                <a-form-item label="审批人">
                  <a-select
                    v-model:value="selectedNode.assignee"
                    placeholder="请选择审批人"
                    @change="updateNodeProperty"
                  >
                    <a-select-option value="manager">manager / 部门经理</a-select-option>
                    <a-select-option value="director">director / 业务总监</a-select-option>
                    <a-select-option value="finance">finance / 财务审批人</a-select-option>
                    <a-select-option value="admin">admin / 系统管理员</a-select-option>
                    <a-select-option value="employee">employee / 普通员工（角色）</a-select-option>
                  </a-select>
                </a-form-item>
                <a-form-item label="审批方式">
                  <a-select
                    v-model:value="selectedNode.approvalType"
                    placeholder="请选择审批方式"
                    @change="updateNodeProperty"
                  >
                    <a-select-option value="sequential">单人审批/顺序审批（已实现）</a-select-option>
                    <a-select-option value="allApprove" disabled>会签：全部通过（待实现）</a-select-option>
                    <a-select-option value="anyApprove" disabled>或签：任一通过（待实现）</a-select-option>
                  </a-select>
                </a-form-item>
                <a-alert
                  type="info"
                  show-icon
                  message="当前后端会根据审批人 assignee 创建待办任务；会签/或签还没有真正参与任务分配。"
                />
              </template>

              <a-alert
                v-else-if="selectedNode.type === NodeType.EXCLUSIVE_GATEWAY"
                type="info"
                show-icon
                message="条件网关的表达式配置在出线连线上。双击/点击连线后填写 amount >= 5000 这类条件。"
              />

              <a-alert
                v-else-if="selectedNode.type === NodeType.PARALLEL_GATEWAY"
                type="info"
                show-icon
                message="并行网关会同时推进所有出线分支；当前版本尚未实现并行汇聚等待。"
              />

              <a-alert
                v-else-if="selectedNode.type === NodeType.SERVICE_TASK"
                type="warning"
                show-icon
                message="服务任务目前作为自动穿透节点，还未接入外部 HTTP/脚本执行器。"
              />

              <a-alert
                v-else
                type="success"
                show-icon
                message="开始/结束节点用于控制流程入口和出口，不需要审批人配置。"
              />

              <a-form-item label="描述" style="margin-top: 12px">
                <a-textarea
                  v-model:value="selectedNode.description"
                  placeholder="请输入描述"
                  :rows="2"
                  @change="updateNodeProperty"
                />
              </a-form-item>
              <a-form-item>
                <a-button type="primary" danger block @click="handleDeleteNode">删除节点</a-button>
              </a-form-item>
            </a-form>
          </template>
          <a-empty v-else description="请选择一个节点进行配置" />
        </div>
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, h } from 'vue';
import { Graph } from '@antv/x6';
import { Selection } from '@antv/x6-plugin-selection';
import { Snapline } from '@antv/x6-plugin-snapline';
import { Keyboard } from '@antv/x6-plugin-keyboard';
import { Clipboard } from '@antv/x6-plugin-clipboard';
import { History } from '@antv/x6-plugin-history';
import { Transform } from '@antv/x6-plugin-transform';
import { message, Modal } from 'ant-design-vue';
import { useProcessStore } from '../../stores/process';
import type { EdgeData, NodeData } from '../../types';
import { NodeType } from '../../types';
import { nanoid } from 'nanoid';

const processStore = useProcessStore();
const containerRef = ref<HTMLDivElement>();
const saving = ref(false);
const zoom = ref(1);
const canUndo = ref(false);
const canRedo = ref(false);
const selectedNode = ref<any>(null);

let graph: Graph | null = null;
let isLoadingDefinition = false;
let syncTimeout: number | null = null;

const nodeTypes = [
  { type: NodeType.START, label: '开始', color: '#52c41a' },
  { type: NodeType.END, label: '结束', color: '#ff4d4f' },
  { type: NodeType.USER_TASK, label: '用户任务', color: '#1677ff' },
  { type: NodeType.EXCLUSIVE_GATEWAY, label: '条件网关', color: '#faad14' },
  { type: NodeType.PARALLEL_GATEWAY, label: '并行网关', color: '#722ed1' },
  { type: NodeType.SERVICE_TASK, label: '服务任务', color: '#13c2c2' },
];

const nodeColorMap: Record<string, string> = Object.fromEntries(nodeTypes.map((item) => [item.type, item.color]));
const nodeLabelMap: Record<string, string> = Object.fromEntries(nodeTypes.map((item) => [item.type, item.label]));

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
      anchor: 'orth',
      connectionPoint: 'boundary',
      allowBlank: false,
      allowLoop: false,
      snap: true,
      allowNode: false,
      createEdge() {
        return graph?.createEdge({
          attrs: { line: { stroke: '#A2B1C3', strokeWidth: 2, targetMarker: { name: 'block', width: 12, height: 8 } } },
          zIndex: 0,
        });
      },
      validateMagnet({ magnet }: any) {
        return magnet?.getAttribute('port-group') !== 'top';
      },
      validateConnection({ sourceCell, targetCell, sourceMagnet, targetMagnet }: any) {
        if (!sourceCell || !targetCell || !sourceMagnet || !targetMagnet) return false;
        if (sourceCell.id === targetCell.id) return false;
        const sourceGroup = sourceMagnet.getAttribute('port-group');
        const targetGroup = targetMagnet.getAttribute('port-group');
        return sourceGroup === 'bottom' && targetGroup === 'top';
      },
    },
    highlighting: { magnetAdsorbed: { name: 'stroke', args: { attrs: { fill: '#5F95FF', stroke: '#5F95FF' } } } },
    background: { color: '#f5f5f5' },
  } as any);

  graph.use(new Selection({ enabled: true, multiple: true, rubberband: true }));
  graph.use(new Snapline({ enabled: true }));
  graph.use(new Keyboard({ enabled: true }));
  graph.use(new Clipboard({ enabled: true }));
  graph.use(new History());
  graph.use(new Transform());

  setupGraphEvents();
  loadDefinition();
  setupKeyboardShortcuts();
});

onUnmounted(() => {
  if (syncTimeout) clearTimeout(syncTimeout);
  graph?.dispose();
});

watch(() => processStore.currentDefinition?.id, () => {
  if (graph && !isLoadingDefinition) loadDefinition();
});

function setupGraphEvents() {
  if (!graph) return;

  graph.on('node:click', ({ node }) => selectNode(node));
  graph.on('blank:click', () => { selectedNode.value = null; });
  graph.on('node:moved', debouncedSync);
  graph.on('node:removed', debouncedSync);
  graph.on('edge:connected', debouncedSync);
  graph.on('edge:removed', debouncedSync);
  graph.on('history:change', () => {
    const historyPlugin = graph?.getPlugin('history');
    if (historyPlugin) {
      canUndo.value = (historyPlugin as any).canUndo();
      canRedo.value = (historyPlugin as any).canRedo();
    }
  });

  graph.on('edge:click', ({ edge }) => {
    const oldCondition = edge.getData()?.condition || edge.getLabels()[0]?.text || '';
    const inputValue = ref(oldCondition);

    Modal.confirm({
      title: '配置连线条件',
      content: () => h('div', [
        h('div', { style: { marginBottom: '8px' } }, '条件网关出线可填写表达式，例如 amount >= 5000；普通连线可留空。'),
        h('input', {
          value: inputValue.value,
          placeholder: 'amount >= 5000',
          onInput: (event: any) => { inputValue.value = event.target.value; },
          style: { width: '100%', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' },
        }),
      ]),
      okText: '保存',
      cancelText: '取消',
      onOk: () => {
        const condition = inputValue.value.trim();
        edge.setData({ condition });
        edge.setLabels(condition ? [{ text: condition }] : []);
        debouncedSync();
      },
    });
  });
}

function setupKeyboardShortcuts() {
  if (!graph) return;
  graph.bindKey(['backspace', 'delete'], () => {
    const cells = graph?.getSelectedCells();
    if (cells?.length) graph?.removeCells(cells);
  });
  graph.bindKey(['meta+z', 'ctrl+z'], () => graph?.undo());
  graph.bindKey(['meta+shift+z', 'ctrl+shift+z'], () => graph?.redo());
}

function getNodeTypeLabel(type: NodeType) {
  return nodeLabelMap[type] || '节点';
}

function getNodeColor(type: NodeType): string {
  return nodeColorMap[type] || '#1677ff';
}

function getCellNodeType(node: any): NodeType {
  return node.getData()?.type || node.getData()?.nodeType || getNodeTypeByColor(node.attr('body/fill') as string);
}

function getNodeTypeByColor(color: string): NodeType {
  return (nodeTypes.find((item) => item.color === color)?.type || NodeType.USER_TASK) as NodeType;
}

function selectNode(node: any) {
  const type = getCellNodeType(node);
  const data = node.getData() || {};
  selectedNode.value = {
    id: node.id,
    type,
    typeLabel: getNodeTypeLabel(type),
    name: String(node.attr('label/text') || data.name || getNodeTypeLabel(type)),
    assignee: data.assignee || '',
    assigneeType: data.assigneeType || 'user',
    approvalType: data.approvalType || 'sequential',
    description: data.description || '',
  };
}

function createGraphNode(node: Partial<NodeData> & { id: string; type: NodeType; name?: string; x?: number; y?: number }) {
  const label = node.name || getNodeTypeLabel(node.type);
  graph?.addNode({
    id: node.id,
    x: node.x ?? 100,
    y: node.y ?? 100,
    width: 120,
    height: 60,
    label,
    data: {
      type: node.type,
      name: label,
      assignee: node.assignee,
      assigneeType: node.assigneeType || 'user',
      approvalType: node.approvalType || 'sequential',
      description: node.description,
    },
    attrs: {
      body: { fill: getNodeColor(node.type), stroke: getNodeColor(node.type), rx: 6, ry: 6 },
      label: { text: label, fill: '#fff', fontSize: 14, fontWeight: 500 },
    },
    ports: {
      groups: {
        top: { position: 'top', attrs: { circle: { r: 4, magnet: true, stroke: '#5F95FF', strokeWidth: 1, fill: '#fff' } } },
        bottom: { position: 'bottom', attrs: { circle: { r: 4, magnet: true, stroke: '#5F95FF', strokeWidth: 1, fill: '#fff' } } },
        left: { position: 'left', attrs: { circle: { r: 4, magnet: false, stroke: '#5F95FF', strokeWidth: 1, fill: '#fff' } } },
        right: { position: 'right', attrs: { circle: { r: 4, magnet: false, stroke: '#5F95FF', strokeWidth: 1, fill: '#fff' } } },
      },
      items: [
        { id: 'top', group: 'top' },
        { id: 'bottom', group: 'bottom' },
        { id: 'left', group: 'left' },
        { id: 'right', group: 'right' },
      ],
    },
  });
}

function loadDefinition() {
  const definition = processStore.currentDefinition;
  if (!definition || !graph || isLoadingDefinition) return;
  isLoadingDefinition = true;
  graph.clearCells();

  const layoutNodes = normalizeNodePositions(definition.nodes, definition.edges);
  layoutNodes.forEach((node) => createGraphNode(node));
  definition.edges.forEach((edge) => {
    graph?.addEdge({
      id: edge.id,
      source: { cell: edge.source, port: 'bottom' },
      target: { cell: edge.target, port: 'top' },
      data: { condition: edge.condition || edge.label || '' },
      labels: edge.condition || edge.label ? [{ text: edge.condition || edge.label }] : [],
      attrs: { line: { stroke: '#A2B1C3', strokeWidth: 2, targetMarker: { name: 'block', width: 12, height: 8 } } },
    });
  });
  isLoadingDefinition = false;

  requestAnimationFrame(() => {
    graph?.centerContent();
  });
}

function normalizeNodePositions(nodes: NodeData[], edges: EdgeData[]) {
  const missingPosition = nodes.some((node) => node.x === undefined || node.y === undefined);
  const duplicatedDefaultPosition = nodes.length > 1 && nodes.filter((node) => (node.x ?? 100) === 100 && (node.y ?? 100) === 100).length > 1;

  if (!missingPosition && !duplicatedDefaultPosition) {
    return nodes;
  }

  const incomingCount = new Map<string, number>();
  nodes.forEach((node) => incomingCount.set(node.id, 0));
  edges.forEach((edge) => incomingCount.set(edge.target, (incomingCount.get(edge.target) || 0) + 1));

  const startNode = nodes.find((node) => node.type === NodeType.START) || nodes.find((node) => (incomingCount.get(node.id) || 0) === 0) || nodes[0];
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const levels = new Map<string, number>();
  const queue = startNode ? [{ id: startNode.id, level: 0 }] : [];

  while (queue.length) {
    const current = queue.shift()!;
    if (levels.has(current.id) && (levels.get(current.id) || 0) <= current.level) continue;
    levels.set(current.id, current.level);
    edges
      .filter((edge) => edge.source === current.id && nodeMap.has(edge.target))
      .forEach((edge) => queue.push({ id: edge.target, level: current.level + 1 }));
  }

  nodes.forEach((node) => {
    if (!levels.has(node.id)) {
      levels.set(node.id, levels.size);
    }
  });

  const levelIndex = new Map<number, number>();
  return nodes.map((node, index) => {
    if (node.x !== undefined && node.y !== undefined && !duplicatedDefaultPosition) {
      return node;
    }

    const level = levels.get(node.id) ?? index;
    const order = levelIndex.get(level) || 0;
    levelIndex.set(level, order + 1);

    return {
      ...node,
      x: 120 + level * 220,
      y: 120 + order * 120,
    };
  });
}

async function syncToStore() {
  const definition = processStore.currentDefinition;
  if (!definition || !graph) return;

  const nodes: NodeData[] = graph.getNodes().map((node) => {
    const data = node.getData() || {};
    const type = getCellNodeType(node);
    const name = String(node.attr('label/text') || data.name || getNodeTypeLabel(type));
    return {
      id: node.id,
      type,
      name,
      x: node.position().x,
      y: node.position().y,
      assignee: data.assignee,
      assigneeType: data.assigneeType || 'user',
      approvalType: data.approvalType || 'sequential',
      description: data.description,
    };
  });

  const edges: EdgeData[] = graph.getEdges().map((edge) => {
    const condition = edge.getData()?.condition || edge.getLabels()[0]?.text || '';
    return {
      id: edge.id,
      source: edge.getSourceCellId()!,
      target: edge.getTargetCellId()!,
      condition,
      label: condition,
    };
  });

  await processStore.updateNodesAndEdges(definition.id, nodes, edges);
}

function debouncedSync() {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = window.setTimeout(() => { syncToStore().catch(console.error); }, 500);
}

async function handleSave() {
  if (!processStore.currentDefinition) {
    message.warning('请先选择或创建流程');
    return;
  }
  saving.value = true;
  try {
    await syncToStore();
    message.success('保存成功');
  } catch (error: any) {
    message.error('保存失败：' + (error.message || '未知错误'));
  } finally {
    saving.value = false;
  }
}

function handleClear() {
  if (!graph) return;
  Modal.confirm({
    title: '确认清空',
    content: '确定要清空画布吗？此操作不可恢复。',
    okText: '确定',
    cancelText: '取消',
    onOk: () => {
      graph?.clearCells();
      selectedNode.value = null;
      debouncedSync();
    },
  });
}

function handleExport() {
  if (!graph) return;
  const data = graph.toJSON();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `process-${processStore.currentDefinition?.name || 'export'}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function handleZoomIn() {
  if (!graph) return;
  zoom.value = Math.min(zoom.value + 0.1, 2);
  graph.zoomTo(zoom.value);
}

function handleZoomOut() {
  if (!graph) return;
  zoom.value = Math.max(zoom.value - 0.1, 0.5);
  graph.zoomTo(zoom.value);
}

function handleZoomReset() {
  if (!graph) return;
  zoom.value = 1;
  graph.zoomTo(1);
  graph.centerContent();
}

function handleUndo() {
  graph?.undo();
}

function handleRedo() {
  graph?.redo();
}

function handleDragStart(event: DragEvent, nodeType: any) {
  event.dataTransfer?.setData('nodeType', JSON.stringify(nodeType));
}

function handleDrop(event: DragEvent) {
  if (!graph || !containerRef.value || !processStore.currentDefinition) {
    message.warning('请先选择或创建流程');
    return;
  }
  const nodeTypeStr = event.dataTransfer?.getData('nodeType');
  if (!nodeTypeStr) return;
  const nodeType = JSON.parse(nodeTypeStr);
  const rect = containerRef.value.getBoundingClientRect();
  createGraphNode({
    id: nanoid(),
    type: nodeType.type,
    name: nodeType.label,
    x: event.clientX - rect.left - 60,
    y: event.clientY - rect.top - 30,
  });
  message.success(`${nodeType.label}已添加`);
}

function updateNodeName() {
  if (!graph || !selectedNode.value) return;
  const node = graph.getCellById(selectedNode.value.id);
  if (!node) return;
  node.setAttrs({ label: { text: selectedNode.value.name } });
  node.setData({ ...node.getData(), name: selectedNode.value.name });
  debouncedSync();
}

function updateNodeProperty() {
  if (!graph || !selectedNode.value) return;
  const node = graph.getCellById(selectedNode.value.id);
  if (!node) return;
  node.setData({
    ...node.getData(),
    type: selectedNode.value.type,
    name: selectedNode.value.name,
    assignee: selectedNode.value.assignee,
    assigneeType: selectedNode.value.assigneeType || 'user',
    approvalType: selectedNode.value.approvalType,
    description: selectedNode.value.description,
  });
  debouncedSync();
}

function handleDeleteNode() {
  if (!graph || !selectedNode.value) return;
  Modal.confirm({
    title: '确认删除',
    content: '确定要删除这个节点吗？相关连线也会被删除。',
    okText: '确定',
    cancelText: '取消',
    onOk: () => {
      const node = graph?.getCellById(selectedNode.value.id);
      if (node) graph?.removeCell(node);
      selectedNode.value = null;
      debouncedSync();
    },
  });
}
</script>

<style scoped>
.process-designer,
.designer-card {
  height: 100%;
}

:deep(.ant-card-body) {
  height: calc(100% - 57px);
  display: flex;
  flex-direction: column;
}

.designer-content {
  display: flex;
  flex: 1;
  gap: 16px;
  min-height: 0;
}

.node-palette,
.node-properties {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 14px;
  overflow-y: auto;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
}

.node-palette {
  width: 176px;
}

.node-properties {
  width: 328px;
}

.palette-title {
  font-weight: 700;
  margin-bottom: 12px;
  color: #111827;
}

.properties-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
  margin-bottom: 16px;
  border-bottom: 1px solid #edf0f5;
}

.properties-eyebrow {
  margin-bottom: 3px;
  color: #64748b;
  font-size: 12px;
}

.properties-title {
  font-weight: 600;
  color: #0f172a;
  font-size: 16px;
}

.node-type-pill {
  flex-shrink: 0;
  padding: 3px 8px;
  border-radius: 999px;
  background: #eff6ff;
  color: #1677ff;
  font-size: 12px;
  font-weight: 600;
}

.palette-item {
  margin-bottom: 8px;
  cursor: move;
}

.palette-item:hover .palette-node {
  transform: translateY(-1px);
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.22);
  filter: brightness(1.04);
}

.palette-node {
  padding: 9px 12px;
  border-radius: 8px;
  color: #fff;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  user-select: none;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
  transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
}

.designer-container {
  flex: 1;
  min-height: 500px;
  border: 1px solid #d9d9d9;
  border-radius: 12px;
  background: #f5f5f5;
}

.node-properties :deep(.ant-form-item-label > label) {
  color: #334155;
  font-weight: 600;
}

.node-properties :deep(.ant-input),
.node-properties :deep(.ant-select-selector),
.node-properties :deep(.ant-input-affix-wrapper) {
  border-radius: 8px;
  background: #fff;
  color: #0f172a;
}

.node-properties :deep(.ant-alert) {
  border-radius: 10px;
  line-height: 1.7;
}

.node-properties :deep(.ant-input:hover),
.node-properties :deep(.ant-select-selector:hover),
.node-properties :deep(.ant-input-affix-wrapper:hover) {
  border-color: #1677ff !important;
  background: #f8fbff !important;
}

.node-properties :deep(.ant-input:focus),
.node-properties :deep(.ant-input-focused),
.node-properties :deep(.ant-select-focused .ant-select-selector),
.node-properties :deep(.ant-input-affix-wrapper-focused) {
  border-color: #1677ff !important;
  box-shadow: 0 0 0 3px rgba(22, 119, 255, 0.12) !important;
}

.node-properties :deep(.ant-btn-dangerous:hover) {
  color: #fff !important;
  background: #cf1322 !important;
  border-color: #cf1322 !important;
  transform: translateY(-1px);
  box-shadow: 0 8px 16px rgba(207, 19, 34, 0.22);
}

:global(html.dark) .node-palette,
:global(html.dark) .node-properties {
  background: #111827;
  border-color: #263244;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.24);
}

:global(html.dark) .palette-title,
:global(html.dark) .properties-title {
  color: rgba(255, 255, 255, 0.92);
}

:global(html.dark) .properties-eyebrow {
  color: rgba(255, 255, 255, 0.55);
}

:global(html.dark) .properties-header {
  border-bottom-color: #263244;
}

:global(html.dark) .node-type-pill {
  background: rgba(22, 119, 255, 0.18);
  color: #8ec5ff;
}

:global(html.dark) .node-properties :deep(.ant-form-item-label > label) {
  color: rgba(255, 255, 255, 0.82);
}

:global(html.dark) .node-properties :deep(.ant-input),
:global(html.dark) .node-properties :deep(.ant-select-selector),
:global(html.dark) .node-properties :deep(.ant-input-affix-wrapper) {
  background: #0b1220 !important;
  border-color: #334155 !important;
  color: rgba(255, 255, 255, 0.9) !important;
}

:global(html.dark) .node-properties :deep(.ant-input:hover),
:global(html.dark) .node-properties :deep(.ant-select-selector:hover),
:global(html.dark) .node-properties :deep(.ant-input-affix-wrapper:hover) {
  background: #111c2f !important;
  border-color: #60a5fa !important;
}

:global(html.dark) .node-properties :deep(.ant-input:focus),
:global(html.dark) .node-properties :deep(.ant-input-focused),
:global(html.dark) .node-properties :deep(.ant-select-focused .ant-select-selector),
:global(html.dark) .node-properties :deep(.ant-input-affix-wrapper-focused) {
  border-color: #60a5fa !important;
  box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.18) !important;
}

:global(html.dark) .node-properties :deep(.ant-select-arrow) {
  color: rgba(255, 255, 255, 0.55);
}

:global(html.dark) .node-properties :deep(.ant-btn-dangerous:hover) {
  color: #fff !important;
  background: #f5222d !important;
  border-color: #f5222d !important;
}

:global(html.dark) .node-properties :deep(.ant-input::placeholder) {
  color: rgba(255, 255, 255, 0.38);
}

:global(html.dark) .node-properties :deep(.ant-select-selection-item) {
  color: rgba(255, 255, 255, 0.9);
}

:global(html.dark) .designer-container {
  border-color: #334155;
  background: #0f172a;
}
</style>
