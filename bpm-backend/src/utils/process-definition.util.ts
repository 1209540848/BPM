type ApprovalMode = 'sequential' | 'allApprove' | 'anyApprove';
type NodeType =
  | 'start'
  | 'end'
  | 'userTask'
  | 'serviceTask'
  | 'exclusiveGateway'
  | 'parallelGateway';
type ConditionOperator =
  | 'equals'
  | 'notEquals'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterThanOrEquals'
  | 'lessThanOrEquals'
  | 'contains';

interface GatewayCondition {
  id: string;
  field: string;
  operator: ConditionOperator;
  value?: any;
}

interface ConditionGroup {
  mode: 'all' | 'any';
  rules: GatewayCondition[];
}

interface FieldValidationRule {
  id: string;
  type:
    | 'min'
    | 'max'
    | 'minLength'
    | 'maxLength'
    | 'greaterThanField'
    | 'lessThanField';
  value?: number | string;
  field?: string;
  message?: string;
}

export interface FormFieldSchema {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number';
  placeholder?: string;
  required?: boolean;
  defaultValue?: string | number;
  visibleWhen?: ConditionGroup | null;
  validations?: FieldValidationRule[];
}

export interface NormalizedNode {
  id: string;
  type: NodeType;
  name: string;
  x?: number;
  y?: number;
  assigneeType?: 'user' | 'role';
  assignee?: string;
  approvalMode?: ApprovalMode;
  approverRoles?: string[];
  description?: string;
}

export interface NormalizedEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  isDefault?: boolean;
  conditionGroup?: ConditionGroup | null;
  conditionExpression?: string;
}

export interface NormalizedDefinition {
  nodes: NormalizedNode[];
  edges: NormalizedEdge[];
  formSchema: FormFieldSchema[];
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asObject(value: unknown): Record<string, any> {
  return value && typeof value === 'object' ? (value as Record<string, any>) : {};
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return undefined;
}

export function normalizeProcessDefinition(definition: any): NormalizedDefinition {
  const parsed =
    typeof definition === 'string' ? JSON.parse(definition) : asObject(definition);
  const legacyFields = new Set<string>();

  for (const node of asArray<any>(parsed.nodes)) {
    for (const condition of asArray<any>(node?.conditions)) {
      if (condition?.field) legacyFields.add(String(condition.field));
    }
  }

  return {
    nodes: asArray<any>(parsed.nodes).map(rawNode => {
      const data = asObject(rawNode?.data);
      return {
        id: String(rawNode?.id),
        type: rawNode?.type ?? 'userTask',
        name: String(rawNode?.name ?? rawNode?.label ?? '节点'),
        x: asNumber(rawNode?.x),
        y: asNumber(rawNode?.y),
        assigneeType:
          rawNode?.assigneeType ??
          data.assigneeType ??
          (asArray<string>(rawNode?.approverRoles ?? data.approverRoles).length > 0 ? 'role' : 'user'),
        assignee: rawNode?.assignee ?? data.assignee ?? '',
        approvalMode:
          rawNode?.approvalMode ??
          rawNode?.approvalType ??
          data.approvalMode ??
          data.approvalType ??
          'sequential',
        approverRoles: asArray<string>(rawNode?.approverRoles ?? data.approverRoles),
        description: rawNode?.description ?? data.description ?? '',
      } as NormalizedNode;
    }),
    edges: asArray<any>(parsed.edges).map(rawEdge => {
      const data = asObject(rawEdge?.data);
      return {
        id: String(rawEdge?.id || `${Date.now()}`),
        source: String(rawEdge?.source ?? rawEdge?.source?.cell ?? ''),
        target: String(rawEdge?.target ?? rawEdge?.target?.cell ?? ''),
        label: rawEdge?.label ? String(rawEdge.label) : String(rawEdge?.labels?.[0]?.text || ''),
        isDefault: Boolean(rawEdge?.isDefault ?? data.isDefault),
        conditionGroup: rawEdge?.conditionGroup ?? data.conditionGroup ?? null,
        conditionExpression:
          rawEdge?.conditionExpression ?? rawEdge?.condition ?? data.conditionExpression ?? '',
      } as NormalizedEdge;
    }),
    formSchema:
      asArray<any>(parsed.formSchema).length > 0
        ? asArray<any>(parsed.formSchema).map(field => ({
            id: String(field?.id || field?.name || Date.now()),
            name: String(field?.name || `field_${Date.now()}`),
            label: String(field?.label || field?.name || '未命名字段'),
            type: field?.type === 'number' || field?.type === 'textarea' ? field.type : 'text',
            placeholder: field?.placeholder ? String(field.placeholder) : '',
            required: Boolean(field?.required),
            defaultValue: field?.defaultValue ?? '',
            visibleWhen: field?.visibleWhen
              ? {
                  mode: field.visibleWhen.mode === 'any' ? 'any' : 'all',
                  rules: asArray<any>(field.visibleWhen.rules)
                    .map(rule => ({
                      id: String(rule?.id || `${Date.now()}`),
                      field: String(rule?.field || ''),
                      operator: (rule?.operator || 'equals') as ConditionOperator,
                      value: rule?.value ?? '',
                    }))
                    .filter(rule => rule.field),
                }
              : null,
            validations: asArray<any>(field?.validations).map(rule => ({
              id: String(rule?.id || `${Date.now()}`),
              type: rule?.type || 'min',
              value: rule?.value,
              field: rule?.field ? String(rule.field) : undefined,
              message: rule?.message ? String(rule.message) : undefined,
            })),
          }))
        : Array.from(legacyFields).map(name => ({
            id: name,
            name,
            label: name,
            type: 'text' as const,
            required: false,
            defaultValue: '',
            visibleWhen: null,
            validations: [],
          })),
  };
}

export function buildDefinitionPayload(definition: NormalizedDefinition) {
  return {
    nodes: definition.nodes.map(node => ({
      ...node,
      approvalType: node.approvalMode || 'sequential',
    })),
    edges: definition.edges.map(edge => ({
      ...edge,
      conditionGroup:
        edge.conditionGroup && edge.conditionGroup.rules.length > 0 ? edge.conditionGroup : null,
      conditionExpression: edge.conditionExpression || '',
    })),
    formSchema: definition.formSchema,
  };
}

function toComparableValue(value: any): any {
  if (value === null || value === undefined || value === '') return value;
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return value;
}

function evaluateLegacyExpression(expression: string, variables: Record<string, any>) {
  if (!expression) return true;

  try {
    const fn = new Function('context', `with (context) { return (${expression}); }`);
    return Boolean(fn(variables));
  } catch (error) {
    console.error('Failed to evaluate legacy condition expression:', error);
    return false;
  }
}

function evaluateConditionRule(rule: GatewayCondition, variables: Record<string, any>) {
  const actual = toComparableValue(variables[rule.field]);
  const expected = toComparableValue(rule.value);

  switch (rule.operator) {
    case 'notEquals':
      return actual !== expected;
    case 'greaterThan':
      return Number(actual) > Number(expected);
    case 'lessThan':
      return Number(actual) < Number(expected);
    case 'greaterThanOrEquals':
      return Number(actual) >= Number(expected);
    case 'lessThanOrEquals':
      return Number(actual) <= Number(expected);
    case 'contains':
      return String(actual ?? '').includes(String(expected ?? ''));
    case 'equals':
    default:
      return actual === expected;
  }
}

export function evaluateConditionGroup(
  group: ConditionGroup | null | undefined,
  variables: Record<string, any>,
  legacyExpression?: string
) {
  if ((!group || group.rules.length === 0) && legacyExpression) {
    return evaluateLegacyExpression(legacyExpression, variables);
  }

  if (!group || group.rules.length === 0) return true;
  if (group.mode === 'any') {
    return group.rules.some(rule => evaluateConditionRule(rule, variables));
  }
  return group.rules.every(rule => evaluateConditionRule(rule, variables));
}

export function isFieldVisible(field: FormFieldSchema, variables: Record<string, any>) {
  return evaluateConditionGroup(field.visibleWhen, variables);
}

export function validateFormValues(
  definition: NormalizedDefinition,
  variables: Record<string, any>
) {
  const errors: string[] = [];

  for (const field of definition.formSchema) {
    if (!isFieldVisible(field, variables)) continue;

    const value = variables[field.name];
    if (field.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field.label}不能为空`);
    }

    for (const rule of field.validations || []) {
      const numericValue = Number(value);
      const compareValue = rule.field ? variables[rule.field] : rule.value;
      const numericCompareValue = Number(compareValue);

      switch (rule.type) {
        case 'min':
          if (value !== undefined && value !== '' && numericValue < Number(rule.value)) {
            errors.push(rule.message || `${field.label}不能小于${rule.value}`);
          }
          break;
        case 'max':
          if (value !== undefined && value !== '' && numericValue > Number(rule.value)) {
            errors.push(rule.message || `${field.label}不能大于${rule.value}`);
          }
          break;
        case 'minLength':
          if (String(value ?? '').length < Number(rule.value)) {
            errors.push(rule.message || `${field.label}长度不能小于${rule.value}`);
          }
          break;
        case 'maxLength':
          if (String(value ?? '').length > Number(rule.value)) {
            errors.push(rule.message || `${field.label}长度不能大于${rule.value}`);
          }
          break;
        case 'greaterThanField':
          if (
            value !== undefined &&
            value !== '' &&
            compareValue !== undefined &&
            compareValue !== '' &&
            numericValue <= numericCompareValue
          ) {
            errors.push(rule.message || `${field.label}必须大于${rule.field}`);
          }
          break;
        case 'lessThanField':
          if (
            value !== undefined &&
            value !== '' &&
            compareValue !== undefined &&
            compareValue !== '' &&
            numericValue >= numericCompareValue
          ) {
            errors.push(rule.message || `${field.label}必须小于${rule.field}`);
          }
          break;
      }
    }
  }

  return errors;
}

function detectCycle(nodes: NormalizedNode[], edges: NormalizedEdge[]) {
  const adjacency = new Map<string, string[]>();
  for (const node of nodes) adjacency.set(node.id, []);
  for (const edge of edges) adjacency.get(edge.source)?.push(edge.target);

  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (nodeId: string): boolean => {
    if (visiting.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;
    visiting.add(nodeId);
    for (const nextId of adjacency.get(nodeId) || []) {
      if (visit(nextId)) return true;
    }
    visiting.delete(nodeId);
    visited.add(nodeId);
    return false;
  };

  return nodes.some(node => visit(node.id));
}

export function validateProcessDefinition(definition: NormalizedDefinition) {
  const errors: string[] = [];
  const fieldNames = new Set(definition.formSchema.map(field => field.name));
  const startNodes = definition.nodes.filter(node => node.type === 'start');
  const endNodes = definition.nodes.filter(node => node.type === 'end');

  if (startNodes.length !== 1) errors.push('流程必须且只能有一个开始节点');
  if (endNodes.length < 1) errors.push('流程至少需要一个结束节点');
  if (detectCycle(definition.nodes, definition.edges)) errors.push('流程图不能包含环路');

  for (const node of definition.nodes) {
    if (node.type === 'userTask' && !String(node.assignee || '').trim()) {
      errors.push(`审批节点 ${node.name} 未配置审批人`);
    }
    if (node.type === 'exclusiveGateway') {
      const outgoingEdges = definition.edges.filter(edge => edge.source === node.id);
      if (outgoingEdges.length === 0) {
        errors.push(`条件网关 ${node.name} 至少需要一条分支`);
      }
      const defaultCount = outgoingEdges.filter(edge => edge.isDefault).length;
      if (outgoingEdges.length > 1 && defaultCount === 0) {
        errors.push(`条件网关 ${node.name} 需要配置默认分支`);
      }
      if (defaultCount > 1) {
        errors.push(`条件网关 ${node.name} 只能配置一条默认分支`);
      }
      for (const edge of outgoingEdges) {
        for (const rule of edge.conditionGroup?.rules || []) {
          if (!fieldNames.has(rule.field)) {
            errors.push(`分支 ${edge.label || edge.id} 引用了不存在的字段 ${rule.field}`);
          }
        }
      }
    }
  }

  const startNode = startNodes[0];
  if (startNode) {
    const reachable = new Set<string>();
    const queue = [startNode.id];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (reachable.has(current)) continue;
      reachable.add(current);
      for (const edge of definition.edges.filter(item => item.source === current)) {
        queue.push(edge.target);
      }
    }
    for (const node of definition.nodes) {
      if (!reachable.has(node.id)) {
        errors.push(`节点 ${node.name} 不在主流程路径上`);
      }
    }
  }

  for (const field of definition.formSchema) {
    if (!field.name.trim()) errors.push('存在未填写字段名的表单项');
    if (!field.label.trim()) errors.push('存在未填写标题的表单项');
    for (const rule of field.visibleWhen?.rules || []) {
      if (!fieldNames.has(rule.field)) {
        errors.push(`字段 ${field.label} 的显隐规则引用了不存在的字段 ${rule.field}`);
      }
    }
  }

  return Array.from(new Set(errors));
}

export function resolveNextEdges(
  nodeId: string,
  definition: NormalizedDefinition,
  variables: Record<string, any>
) {
  const outgoingEdges = definition.edges.filter(edge => edge.source === nodeId);
  const node = definition.nodes.find(item => item.id === nodeId);

  if (!node) return [];
  if (node.type === 'exclusiveGateway') {
    const matched = outgoingEdges.find(
      edge =>
        (edge.conditionGroup?.rules.length || edge.conditionExpression) &&
        evaluateConditionGroup(edge.conditionGroup, variables, edge.conditionExpression)
    );
    if (matched) return [matched];
    const defaultEdge = outgoingEdges.find(edge => edge.isDefault);
    if (defaultEdge) return [defaultEdge];
    return outgoingEdges.length === 1 ? [outgoingEdges[0]] : [];
  }

  return outgoingEdges;
}
