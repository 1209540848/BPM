import type { ApprovalPathNode, FormContext, ProcessDefinition } from '../types';
import { NodeType } from '../types';
import { evaluateConditionGroup } from '../utils/processDefinition';

export function buildApprovalPath(
  definition: ProcessDefinition,
  context: FormContext
): ApprovalPathNode[] {
  const result: ApprovalPathNode[] = [];
  const startNode = definition.nodes.find(node => node.type === NodeType.START);
  if (!startNode) return result;

  const visited = new Set<string>();
  const queue = [startNode.id];

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    const node = definition.nodes.find(item => item.id === nodeId);
    if (!node) continue;

    if (node.type === NodeType.USER_TASK) {
      result.push({
        id: node.id,
        label: node.assignee || node.name,
        approverRoles: node.assigneeType === 'role' && node.assignee ? [node.assignee] : undefined,
        approvalMode: node.approvalMode,
      });
    }

    if (node.type === NodeType.END) {
      continue;
    }

    const outgoingEdges = definition.edges.filter(edge => edge.source === node.id);
    if (node.type === NodeType.EXCLUSIVE_GATEWAY) {
      const matched =
        outgoingEdges.find(
          edge =>
            (edge.conditionGroup?.rules.length || edge.conditionExpression) &&
            evaluateConditionGroup(edge.conditionGroup, context, edge.conditionExpression)
        ) ||
        outgoingEdges.find(edge => edge.isDefault) ||
        (outgoingEdges.length === 1 ? outgoingEdges[0] : undefined);

      if (matched) queue.push(matched.target);
      continue;
    }

    for (const edge of outgoingEdges) {
      queue.push(edge.target);
    }
  }

  return result;
}
