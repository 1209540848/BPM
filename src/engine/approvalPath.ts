import type { ProcessDefinition, FormContext, ApprovalPathNode, EdgeData, NodeData } from '../types';

// ------------------------------------------------------------------------
// 优化 1：条件执行引擎加缓存 (极其重要)
// ------------------------------------------------------------------------
// new Function 每次都会重新编译字符串为字节码，极其耗时。
// 我们用一个 Map 把编译好的函数缓存起来。
const conditionCache = new Map<string, Function>();

export function evaluateCondition(condition: string, context: FormContext): boolean {
  if (!condition) return true;

  try {
    let func = conditionCache.get(condition);
    if (!func) {
      // 只有第一次遇到这个条件时才编译
      func = new Function('context', `return ${condition}`);
      conditionCache.set(condition, func);
    }
    return func(context);
  } catch (error) {
    console.error(`Condition evaluation error for "${condition}":`, error);
    return false;
  }
}

// ------------------------------------------------------------------------
// 优化 2：构建图索引 (邻接表)
// ------------------------------------------------------------------------
// 将线性查找 O(N) 转变为 O(1) 的哈希查找
class ProcessGraphIndex {
  public nodeMap: Map<string, NodeData> = new Map();
  public outEdges: Map<string, EdgeData[]> = new Map();
  public startNode: NodeData | null = null;

  constructor(definition: ProcessDefinition) {
    // 1. 构建节点索引，顺便找到开始节点
    for (const node of definition.nodes) {
      this.nodeMap.set(node.id, node);
      if (node.type === 'start') {
        this.startNode = node;
      }
    }

    // 2. 构建边的“邻接表” (每个 source 对应哪些 edge)
    for (const edge of definition.edges) {
      if (!this.outEdges.has(edge.source)) {
        this.outEdges.set(edge.source, []);
      }
      this.outEdges.get(edge.source)!.push(edge);
    }
  }
}

// ------------------------------------------------------------------------
// 优化 3：重构核心逻辑，接入索引
// ------------------------------------------------------------------------
export function resolveNextNodeId(
  graph: ProcessGraphIndex,
  currentNodeId: string,
  context: FormContext
): string | null {
  // O(1) 查找节点
  if (!graph.nodeMap.has(currentNodeId)) return null;

  // O(1) 获取出边，取代之前的 array.filter
  const outgoingEdges = graph.outEdges.get(currentNodeId) || [];

  if (outgoingEdges.length === 0) return null;
  if (outgoingEdges.length === 1) return outgoingEdges[0]?.target || null;

  // 多个分支，评估条件
  for (const edge of outgoingEdges) {
    if (edge.condition && evaluateCondition(edge.condition, context)) {
      return edge.target;
    }
  }

  // 默认返回第一条无条件的边 (或者看业务是否需要返回 null)
  return outgoingEdges[0]?.target || null;
}

export function buildApprovalPath(
  definition: ProcessDefinition,
  context: FormContext
): ApprovalPathNode[] {
  // 第一步：在循环外统一构建一次图索引。时间复杂度 O(N + E)
  const graph = new ProcessGraphIndex(definition);
  
  if (!graph.startNode) return [];

  const visited = new Set<string>();
  const result: ApprovalPathNode[] = [];

  let cursor: string | null = graph.startNode.id;
  let guard = 0;

  // 第二步：开始寻址。由于有了 graph 索引，这里的单次寻址全是 O(1)
  while (cursor && guard < 200) {
    guard++;

    if (visited.has(cursor)) break;
    visited.add(cursor);

    // O(1) 查找当前节点
    const node = graph.nodeMap.get(cursor);
    if (!node) break;

    if (node.type === 'userTask') {
      const label = node.approverRoles && node.approverRoles.length > 0
        ? `${node.approverRoles.join(' / ')}${node.approvalMode === 'allApprove' ? '（会签）' : node.approvalMode === 'anyApprove' ? '（或签）' : ''}`
        : node.name;

      result.push({
        id: node.id,
        label,
        approverRoles: node.approverRoles,
        approvalMode: node.approvalMode,
      });
    }

    if (node.type === 'end') break;

    // 传入 graph 实例而不是 definition
    cursor = resolveNextNodeId(graph, cursor, context);
  }

  return result;
}