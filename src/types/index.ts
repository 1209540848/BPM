export const NodeType = {
  START: 'start',
  END: 'end',
  USER_TASK: 'userTask',
  SERVICE_TASK: 'serviceTask',
  EXCLUSIVE_GATEWAY: 'exclusiveGateway',
  PARALLEL_GATEWAY: 'parallelGateway',
} as const;

export type NodeType = typeof NodeType[keyof typeof NodeType];

export const ApprovalMode = {
  SEQUENTIAL: 'sequential',
  ALL_APPROVE: 'allApprove',
  ANY_APPROVE: 'anyApprove',
} as const;

export type ApprovalMode = typeof ApprovalMode[keyof typeof ApprovalMode];

export const ApprovalAssigneeType = {
  USER: 'user',
  ROLE: 'role',
} as const;

export type ApprovalAssigneeType =
  typeof ApprovalAssigneeType[keyof typeof ApprovalAssigneeType];

export const ConditionOperator = {
  EQUALS: 'equals',
  NOT_EQUALS: 'notEquals',
  GREATER_THAN: 'greaterThan',
  LESS_THAN: 'lessThan',
  GREATER_THAN_OR_EQUALS: 'greaterThanOrEquals',
  LESS_THAN_OR_EQUALS: 'lessThanOrEquals',
  CONTAINS: 'contains',
} as const;

export type ConditionOperator = typeof ConditionOperator[keyof typeof ConditionOperator];

export const ConditionGroupMode = {
  ALL: 'all',
  ANY: 'any',
} as const;

export type ConditionGroupMode = typeof ConditionGroupMode[keyof typeof ConditionGroupMode];

export const FormFieldType = {
  TEXT: 'text',
  TEXTAREA: 'textarea',
  NUMBER: 'number',
} as const;

export type FormFieldType = typeof FormFieldType[keyof typeof FormFieldType];

export const ValidationRuleType = {
  MIN: 'min',
  MAX: 'max',
  MIN_LENGTH: 'minLength',
  MAX_LENGTH: 'maxLength',
  GREATER_THAN_FIELD: 'greaterThanField',
  LESS_THAN_FIELD: 'lessThanField',
} as const;

export type ValidationRuleType = typeof ValidationRuleType[keyof typeof ValidationRuleType];

export const ProcessStatus = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
} as const;

export type ProcessStatus = typeof ProcessStatus[keyof typeof ProcessStatus];

export const InstanceStatus = {
  RUNNING: 'running',
  COMPLETED: 'completed',
  SUSPENDED: 'suspended',
  CANCELLED: 'cancelled',
} as const;

export type InstanceStatus = typeof InstanceStatus[keyof typeof InstanceStatus];

export const TaskStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  DELEGATED: 'delegated',
} as const;

export type TaskStatus = typeof TaskStatus[keyof typeof TaskStatus];

export interface NodeData {
  id: string;
  type: NodeType;
  name: string;
  assigneeType?: ApprovalAssigneeType;
  assignee?: string;
  candidateUsers?: string[];
  candidateGroups?: string[];
  expression?: string;
  serviceName?: string;
  x?: number;
  y?: number;
  approvalMode?: ApprovalMode;
  approvalType?: ApprovalMode;
  approverRoles?: string[];
  conditions?: GatewayCondition[];
  condition?: string;
  description?: string;
}

export interface EdgeData {
  id: string;
  source: string;
  target: string;
  label?: string;
  isDefault?: boolean;
  conditionGroup?: ConditionGroup | null;
  conditionExpression?: string;
}

export interface ProcessDefinition {
  id: string;
  name: string;
  description?: string;
  version: number;
  status: ProcessStatus;
  nodes: NodeData[];
  edges: EdgeData[];
  formSchema: FormFieldSchema[];
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

export interface ProcessInstance {
  id: string;
  definitionId: string;
  definitionVersion: number;
  businessKey?: string;
  status: InstanceStatus;
  currentNodeIds: string[];
  variables: Record<string, any>;
  history: InstanceHistory[];
  executedNodes: string[];
  createdAt: number;
  startedAt: number;
  endedAt?: number;
  startedBy: string;
}

export interface InstanceHistory {
  id: string;
  nodeId: string;
  nodeName: string;
  type: string;
  timestamp: number;
  operator?: string;
  comment?: string;
}

export interface Task {
  id: string;
  instanceId: string;
  definitionId: string;
  nodeId: string;
  nodeName: string;
  status: TaskStatus;
  assignee?: string;
  candidateUsers?: string[];
  candidateGroups?: string[];
  variables: Record<string, any>;
  createdAt: number;
  claimedAt?: number;
  completedAt?: number;
}

export interface GatewayCondition {
  id: string;
  field: string;
  operator: ConditionOperator;
  value?: any;
}

export interface FormContext {
  [key: string]: any;
}

export interface ConditionGroup {
  mode: ConditionGroupMode;
  rules: GatewayCondition[];
}

export interface FieldValidationRule {
  id: string;
  type: ValidationRuleType;
  value?: number | string;
  field?: string;
  message?: string;
}

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface FormFieldSchema {
  id: string;
  name: string;
  label: string;
  type: FormFieldType;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string | number;
  visibleWhen?: ConditionGroup | null;
  validations?: FieldValidationRule[];
  options?: FormFieldOption[];
}

export interface ApprovalPathNode {
  id: string;
  label: string;
  approverRoles?: string[];
  approvalMode?: ApprovalMode;
}
