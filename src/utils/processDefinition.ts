import { nanoid } from 'nanoid';
import type {
  ConditionGroup,
  EdgeData,
  FieldValidationRule,
  FormContext,
  FormFieldSchema,
  GatewayCondition,
  NodeData,
  ProcessDefinition,
} from '../types';
import {
  ApprovalAssigneeType,
  ApprovalMode,
  ConditionGroupMode,
  ConditionOperator,
  FormFieldType,
  NodeType,
  ValidationRuleType,
} from '../types';

type RawDefinitionEnvelope = {
  definition?: unknown;
  nodes?: unknown;
  edges?: unknown;
  formSchema?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  [key: string]: unknown;
};

const DEFAULT_START_NODE: NodeData = {
  id: 'start',
  type: NodeType.START,
  name: '开始',
  x: 100,
  y: 100,
};

const DEFAULT_END_NODE: NodeData = {
  id: 'end',
  type: NodeType.END,
  name: '结束',
  x: 520,
  y: 100,
};

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

function parseDefinitionEnvelope(entity: RawDefinitionEnvelope) {
  const parsed =
    typeof entity.definition === 'string'
      ? JSON.parse(entity.definition)
      : asObject(entity.definition);

  return {
    nodes: asArray<any>(parsed.nodes ?? entity.nodes),
    edges: asArray<any>(parsed.edges ?? entity.edges),
    formSchema: asArray<any>(parsed.formSchema ?? entity.formSchema),
  };
}

export function createEmptyConditionGroup(): ConditionGroup {
  return {
    mode: ConditionGroupMode.ALL,
    rules: [],
  };
}

export function createConditionRule(field = ''): GatewayCondition {
  return {
    id: nanoid(),
    field,
    operator: ConditionOperator.EQUALS,
    value: '',
  };
}

export function createValidationRule(): FieldValidationRule {
  return {
    id: nanoid(),
    type: ValidationRuleType.MIN,
    value: 0,
  };
}

export function createFormField(): FormFieldSchema {
  return {
    id: nanoid(),
    name: `field_${Date.now()}`,
    label: '新字段',
    type: FormFieldType.TEXT,
    placeholder: '',
    required: false,
    defaultValue: '',
    visibleWhen: null,
    validations: [],
  };
}

function normalizeConditionRule(rule: any): GatewayCondition {
  return {
    id: String(rule?.id || nanoid()),
    field: String(rule?.field || ''),
    operator: Object.values(ConditionOperator).includes(rule?.operator)
      ? rule.operator
      : ConditionOperator.EQUALS,
    value: rule?.value ?? '',
  };
}

function normalizeConditionGroup(group: any): ConditionGroup | null {
  if (!group) return null;
  const rules = asArray<any>(group.rules).map(normalizeConditionRule).filter(rule => rule.field);
  return {
    mode: group.mode === ConditionGroupMode.ANY ? ConditionGroupMode.ANY : ConditionGroupMode.ALL,
    rules,
  };
}

function normalizeValidationRule(rule: any): FieldValidationRule {
  return {
    id: String(rule?.id || nanoid()),
    type: Object.values(ValidationRuleType).includes(rule?.type)
      ? rule.type
      : ValidationRuleType.MIN,
    value: rule?.value,
    field: rule?.field ? String(rule.field) : undefined,
    message: rule?.message ? String(rule.message) : undefined,
  };
}

function deriveLegacyFields(nodes: any[]): FormFieldSchema[] {
  const fieldNames = new Set<string>();

  for (const node of nodes) {
    for (const condition of asArray<any>(node?.conditions)) {
      if (condition?.field) fieldNames.add(String(condition.field));
    }
  }

  return Array.from(fieldNames).map(name => ({
    id: nanoid(),
    name,
    label: name,
    type: FormFieldType.TEXT,
    required: false,
    defaultValue: '',
    visibleWhen: null,
    validations: [],
  }));
}

export function normalizeNode(rawNode: any): NodeData {
  const data = asObject(rawNode?.data);
  const approverRoles = asArray<string>(rawNode?.approverRoles ?? data.approverRoles);
  const legacyAssignee = rawNode?.assignee ?? data.assignee;
  const assigneeType =
    rawNode?.assigneeType ??
    data.assigneeType ??
    (approverRoles.length > 0 ? ApprovalAssigneeType.ROLE : ApprovalAssigneeType.USER);

  return {
    id: String(rawNode?.id),
    type: rawNode?.type ?? NodeType.USER_TASK,
    name: String(rawNode?.name ?? rawNode?.label ?? '节点'),
    x: asNumber(rawNode?.x),
    y: asNumber(rawNode?.y),
    assigneeType,
    assignee: legacyAssignee ? String(legacyAssignee) : '',
    candidateUsers: asArray<string>(rawNode?.candidateUsers ?? data.candidateUsers),
    candidateGroups: asArray<string>(rawNode?.candidateGroups ?? data.candidateGroups),
    approvalMode:
      rawNode?.approvalMode ??
      rawNode?.approvalType ??
      data.approvalMode ??
      data.approvalType ??
      ApprovalMode.SEQUENTIAL,
    approvalType:
      rawNode?.approvalType ??
      rawNode?.approvalMode ??
      data.approvalType ??
      data.approvalMode ??
      ApprovalMode.SEQUENTIAL,
    approverRoles,
    description: rawNode?.description ?? data.description ?? '',
  };
}

export function normalizeEdge(rawEdge: any): EdgeData {
  const data = asObject(rawEdge?.data);
  return {
    id: String(rawEdge?.id || nanoid()),
    source: String(rawEdge?.source ?? rawEdge?.source?.cell ?? ''),
    target: String(rawEdge?.target ?? rawEdge?.target?.cell ?? ''),
    label: rawEdge?.label ? String(rawEdge.label) : String(rawEdge?.labels?.[0]?.text || ''),
    isDefault: Boolean(rawEdge?.isDefault ?? data.isDefault),
    conditionGroup: normalizeConditionGroup(rawEdge?.conditionGroup ?? data.conditionGroup),
    conditionExpression: rawEdge?.conditionExpression ?? rawEdge?.condition ?? data.conditionExpression,
  };
}

export function normalizeFormField(rawField: any): FormFieldSchema {
  return {
    id: String(rawField?.id || nanoid()),
    name: String(rawField?.name || `field_${Date.now()}`),
    label: String(rawField?.label || rawField?.name || '未命名字段'),
    type: Object.values(FormFieldType).includes(rawField?.type)
      ? rawField.type
      : FormFieldType.TEXT,
    placeholder: rawField?.placeholder ? String(rawField.placeholder) : '',
    required: Boolean(rawField?.required),
    defaultValue: rawField?.defaultValue ?? '',
    visibleWhen: normalizeConditionGroup(rawField?.visibleWhen),
    validations: asArray<any>(rawField?.validations).map(normalizeValidationRule),
    options: asArray<any>(rawField?.options)
      .map(option => ({
        label: String(option?.label || option?.value || ''),
        value: String(option?.value || option?.label || ''),
      }))
      .filter(option => option.value),
  };
}

export function normalizeProcessDefinition(entity: RawDefinitionEnvelope): ProcessDefinition {
  const parsed = parseDefinitionEnvelope(entity);
  const nodes = parsed.nodes.map(normalizeNode);
  const edges = parsed.edges.map(normalizeEdge);
  const formSchema =
    parsed.formSchema.length > 0
      ? parsed.formSchema.map(normalizeFormField)
      : deriveLegacyFields(parsed.nodes);

  return {
    ...(entity as any),
    nodes: nodes.length > 0 ? nodes : [DEFAULT_START_NODE, DEFAULT_END_NODE],
    edges,
    formSchema,
    createdAt:
      typeof entity.createdAt === 'number'
        ? entity.createdAt
        : new Date(String(entity.createdAt ?? Date.now())).getTime(),
    updatedAt:
      typeof entity.updatedAt === 'number'
        ? entity.updatedAt
        : new Date(String(entity.updatedAt ?? Date.now())).getTime(),
  } as ProcessDefinition;
}

export function buildDefinitionPayload(definition: {
  nodes: NodeData[];
  edges: EdgeData[];
  formSchema: FormFieldSchema[];
}) {
  return {
    nodes: definition.nodes.map(node => ({
      ...node,
      approvalType: node.approvalMode ?? node.approvalType ?? ApprovalMode.SEQUENTIAL,
    })),
    edges: definition.edges.map(edge => ({
      ...edge,
      conditionGroup:
        edge.conditionGroup && edge.conditionGroup.rules.length > 0
          ? edge.conditionGroup
          : null,
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

function evaluateConditionRule(rule: GatewayCondition, context: FormContext): boolean {
  const actual = toComparableValue(context[rule.field]);
  const expected = toComparableValue(rule.value);

  switch (rule.operator) {
    case ConditionOperator.NOT_EQUALS:
      return actual !== expected;
    case ConditionOperator.GREATER_THAN:
      return Number(actual) > Number(expected);
    case ConditionOperator.LESS_THAN:
      return Number(actual) < Number(expected);
    case ConditionOperator.GREATER_THAN_OR_EQUALS:
      return Number(actual) >= Number(expected);
    case ConditionOperator.LESS_THAN_OR_EQUALS:
      return Number(actual) <= Number(expected);
    case ConditionOperator.CONTAINS:
      return String(actual ?? '').includes(String(expected ?? ''));
    case ConditionOperator.EQUALS:
    default:
      return actual === expected;
  }
}

function evaluateLegacyExpression(expression: string, context: FormContext): boolean {
  if (!expression) return true;

  try {
    const fn = new Function('context', `with (context) { return (${expression}); }`);
    return Boolean(fn(context));
  } catch (error) {
    console.error('Failed to evaluate legacy condition expression:', error);
    return false;
  }
}

export function evaluateConditionGroup(
  group: ConditionGroup | null | undefined,
  context: FormContext,
  legacyExpression?: string
): boolean {
  if ((!group || group.rules.length === 0) && legacyExpression) {
    return evaluateLegacyExpression(legacyExpression, context);
  }

  if (!group || group.rules.length === 0) return true;

  if (group.mode === ConditionGroupMode.ANY) {
    return group.rules.some(rule => evaluateConditionRule(rule, context));
  }

  return group.rules.every(rule => evaluateConditionRule(rule, context));
}

export function isFieldVisible(field: FormFieldSchema, context: FormContext): boolean {
  return evaluateConditionGroup(field.visibleWhen, context);
}

export function validateField(field: FormFieldSchema, context: FormContext): string[] {
  const value = context[field.name];
  const errors: string[] = [];

  if (!isFieldVisible(field, context)) {
    return errors;
  }

  if (field.required && (value === undefined || value === null || value === '')) {
    errors.push(`${field.label}不能为空`);
  }

  for (const rule of field.validations || []) {
    const numericValue = Number(value);
    const compareValue = rule.field ? context[rule.field] : rule.value;
    const numericCompareValue = Number(compareValue);

    switch (rule.type) {
      case ValidationRuleType.MIN:
        if (value !== undefined && value !== '' && numericValue < Number(rule.value)) {
          errors.push(rule.message || `${field.label}不能小于${rule.value}`);
        }
        break;
      case ValidationRuleType.MAX:
        if (value !== undefined && value !== '' && numericValue > Number(rule.value)) {
          errors.push(rule.message || `${field.label}不能大于${rule.value}`);
        }
        break;
      case ValidationRuleType.MIN_LENGTH:
        if (String(value ?? '').length < Number(rule.value)) {
          errors.push(rule.message || `${field.label}长度不能小于${rule.value}`);
        }
        break;
      case ValidationRuleType.MAX_LENGTH:
        if (String(value ?? '').length > Number(rule.value)) {
          errors.push(rule.message || `${field.label}长度不能大于${rule.value}`);
        }
        break;
      case ValidationRuleType.GREATER_THAN_FIELD:
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
      case ValidationRuleType.LESS_THAN_FIELD:
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

  return errors;
}

export function validateFormValues(definition: ProcessDefinition, context: FormContext) {
  return definition.formSchema.flatMap(field => validateField(field, context));
}

function detectCycle(nodes: NodeData[], edges: EdgeData[]): boolean {
  const adjacency = new Map<string, string[]>();
  for (const node of nodes) {
    adjacency.set(node.id, []);
  }
  for (const edge of edges) {
    adjacency.get(edge.source)?.push(edge.target);
  }

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

export function validateProcessDefinition(definition: {
  nodes: NodeData[];
  edges: EdgeData[];
  formSchema: FormFieldSchema[];
}) {
  const errors: string[] = [];
  const nodes = definition.nodes;
  const edges = definition.edges;
  const fields = definition.formSchema;
  const fieldNames = new Set(fields.map(field => field.name));

  const startNodes = nodes.filter(node => node.type === NodeType.START);
  const endNodes = nodes.filter(node => node.type === NodeType.END);

  if (startNodes.length !== 1) {
    errors.push('流程必须且只能有一个开始节点');
  }
  if (endNodes.length < 1) {
    errors.push('流程至少需要一个结束节点');
  }

  const duplicatedFields = fields.filter(
    (field, index) => fields.findIndex(item => item.name === field.name) !== index
  );
  if (duplicatedFields.length > 0) {
    errors.push('表单字段名不能重复');
  }

  for (const field of fields) {
    if (!field.name.trim()) errors.push('存在未填写字段名的表单项');
    if (!field.label.trim()) errors.push('存在未填写标题的表单项');
    for (const rule of field.visibleWhen?.rules || []) {
      if (!fieldNames.has(rule.field)) {
        errors.push(`字段 ${field.label} 的显隐规则引用了不存在的字段 ${rule.field}`);
      }
    }
    for (const rule of field.validations || []) {
      if (
        (rule.type === ValidationRuleType.GREATER_THAN_FIELD ||
          rule.type === ValidationRuleType.LESS_THAN_FIELD) &&
        rule.field &&
        !fieldNames.has(rule.field)
      ) {
        errors.push(`字段 ${field.label} 的校验规则引用了不存在的字段 ${rule.field}`);
      }
    }
  }

  for (const node of nodes) {
    if (node.type === NodeType.USER_TASK && !String(node.assignee || '').trim()) {
      errors.push(`审批节点 ${node.name} 未配置审批人`);
    }
    if (node.type === NodeType.EXCLUSIVE_GATEWAY) {
      const outgoingEdges = edges.filter(edge => edge.source === node.id);
      if (outgoingEdges.length === 0) {
        errors.push(`条件网关 ${node.name} 至少需要一条分支`);
      }
      const defaultCount = outgoingEdges.filter(edge => edge.isDefault).length;
      if (outgoingEdges.length > 1 && defaultCount > 1) {
        errors.push(`条件网关 ${node.name} 只能配置一条默认分支`);
      }
      if (outgoingEdges.length > 1 && defaultCount === 0) {
        errors.push(`条件网关 ${node.name} 需要配置默认分支`);
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

  if (detectCycle(nodes, edges)) {
    errors.push('流程图不能包含环路');
  }

  const startNode = startNodes[0];
  if (startNode) {
    const reachable = new Set<string>();
    const queue = [startNode.id];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (reachable.has(current)) continue;
      reachable.add(current);
      for (const edge of edges.filter(item => item.source === current)) {
        queue.push(edge.target);
      }
    }

    for (const node of nodes) {
      if (!reachable.has(node.id)) {
        errors.push(`节点 ${node.name} 不在主流程路径上`);
      }
    }
  }

  return Array.from(new Set(errors));
}
