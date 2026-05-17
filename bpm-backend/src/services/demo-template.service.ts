import prisma from '../config/database.config';
import { hashPassword } from '../utils/password.util';
import * as instanceService from './instance.service';

type DemoUserKey =
  | 'admin'
  | 'applicant'
  | 'approver1'
  | 'approver2'
  | 'approver3'
  | 'approver4'
  | 'approver5';

type DemoNodeType = 'start' | 'end' | 'userTask' | 'exclusiveGateway' | 'parallelGateway' | 'serviceTask';

type DemoUser = {
  key: DemoUserKey;
  username: string;
  email: string;
  fullName: string;
  role: string;
};

type DemoNode = {
  id: string;
  type: DemoNodeType;
  name: string;
  x: number;
  y: number;
  data?: Record<string, any>;
};

type DemoEdge = {
  id: string;
  source: string;
  target: string;
  condition?: string;
  label?: string;
  data?: Record<string, any>;
};

type DemoFormField = {
  key: string;
  label: string;
  type: 'input' | 'textarea' | 'number' | 'select' | 'date';
  required?: boolean;
  options?: Array<{ label: string; value: string | number }>;
};

type DemoTemplate = {
  name: string;
  description: string;
  formFields: DemoFormField[];
  nodes: (users: DemoUserResult[]) => DemoNode[];
  edges: DemoEdge[];
  sampleVariables: Record<string, any>;
};

type DemoUserResult = {
  key: DemoUserKey;
  username: string;
  fullName: string | null;
  role: string;
  id: string;
};

const DEFAULT_PASSWORD = 'Demo@123456';
const X = 360;
const LEFT_X = 180;
const RIGHT_X = 540;

const DEMO_USERS: DemoUser[] = [
  { key: 'admin', username: 'admin_demo', email: 'admin_demo@example.com', fullName: '演示管理员', role: 'admin' },
  { key: 'applicant', username: 'user_apply', email: 'user_apply@example.com', fullName: '演示申请人', role: 'user' },
  { key: 'approver1', username: 'user_approver_1', email: 'user_approver_1@example.com', fullName: '审批人一', role: 'user' },
  { key: 'approver2', username: 'user_approver_2', email: 'user_approver_2@example.com', fullName: '审批人二', role: 'user' },
  { key: 'approver3', username: 'user_approver_3', email: 'user_approver_3@example.com', fullName: '审批人三', role: 'user' },
  { key: 'approver4', username: 'user_approver_4', email: 'user_approver_4@example.com', fullName: '审批人四', role: 'user' },
  { key: 'approver5', username: 'user_approver_5', email: 'user_approver_5@example.com', fullName: '审批人五', role: 'user' },
];

const assigneeData = (users: DemoUserResult[], key: DemoUserKey) => ({
  assigneeType: 'user',
  assignee: userIdByKey(users, key),
  candidateUsers: [],
  candidateGroups: [],
});

const baseNode = (id: string, type: DemoNodeType, name: string, x: number, y: number, data?: Record<string, any>): DemoNode => ({
  id,
  type,
  name,
  x,
  y,
  ...(data ? { data } : {}),
});

const DEMO_TEMPLATES: DemoTemplate[] = [
  {
    name: '请假审批流程(模板)',
    description: '演示模板：包含条件网关，短假走直属领导审批，长假追加HR审批。',
    formFields: [
      {
        key: 'leaveType',
        label: '请假类型',
        type: 'select',
        required: true,
        options: [
          { label: '年假', value: 'annual' },
          { label: '病假', value: 'sick' },
          { label: '事假', value: 'personal' },
        ],
      },
      { key: 'startDate', label: '开始日期', type: 'date', required: true },
      { key: 'endDate', label: '结束日期', type: 'date', required: true },
      { key: 'days', label: '请假天数', type: 'number', required: true },
      { key: 'reason', label: '请假原因', type: 'textarea', required: true },
    ],
    nodes: (users) => [
      baseNode('start_1', 'start', '开始', X, 80),
      baseNode('gateway_1', 'exclusiveGateway', '条件网关-请假天数判断', X, 220),
      baseNode('task_1', 'userTask', '用户任务-直属领导审批', LEFT_X, 360, assigneeData(users, 'approver1')),
      baseNode('task_2', 'userTask', '用户任务-HR审批', RIGHT_X, 360, assigneeData(users, 'approver2')),
      baseNode('end_1', 'end', '结束', X, 520),
    ],
    edges: [
      { id: 'edge_1', source: 'start_1', target: 'gateway_1' },
      { id: 'edge_2', source: 'gateway_1', target: 'task_1', condition: 'days <= 2', label: '2天以内' },
      { id: 'edge_3', source: 'gateway_1', target: 'task_2', condition: 'days > 2', label: '超过2天' },
      { id: 'edge_4', source: 'task_1', target: 'end_1' },
      { id: 'edge_5', source: 'task_2', target: 'end_1' },
    ],
    sampleVariables: {
      leaveType: 'annual',
      startDate: '2026-05-18',
      endDate: '2026-05-19',
      days: 2,
      reason: '演示请假申请',
    },
  },
  {
    name: '报销审批流程(模板)',
    description: '演示模板：包含条件网关，小额报销走主管审批，大额报销走财务审批。',
    formFields: [
      { key: 'amount', label: '报销金额', type: 'number', required: true },
      {
        key: 'category',
        label: '报销类别',
        type: 'select',
        required: true,
        options: [
          { label: '交通', value: 'traffic' },
          { label: '餐饮', value: 'meal' },
          { label: '住宿', value: 'hotel' },
          { label: '办公用品', value: 'office' },
        ],
      },
      { key: 'reason', label: '报销说明', type: 'textarea', required: true },
    ],
    nodes: (users) => [
      baseNode('start_1', 'start', '开始', X, 80),
      baseNode('gateway_1', 'exclusiveGateway', '条件网关-报销金额判断', X, 220),
      baseNode('task_1', 'userTask', '用户任务-部门主管审批', LEFT_X, 360, assigneeData(users, 'approver3')),
      baseNode('task_2', 'userTask', '用户任务-财务审批', RIGHT_X, 360, assigneeData(users, 'approver4')),
      baseNode('end_1', 'end', '结束', X, 520),
    ],
    edges: [
      { id: 'edge_1', source: 'start_1', target: 'gateway_1' },
      { id: 'edge_2', source: 'gateway_1', target: 'task_1', condition: 'amount <= 1000', label: '1000以内' },
      { id: 'edge_3', source: 'gateway_1', target: 'task_2', condition: 'amount > 1000', label: '超过1000' },
      { id: 'edge_4', source: 'task_1', target: 'end_1' },
      { id: 'edge_5', source: 'task_2', target: 'end_1' },
    ],
    sampleVariables: {
      amount: 680,
      category: 'traffic',
      reason: '演示差旅交通费用报销',
    },
  },
  {
    name: '采购审批流程(模板)',
    description: '演示模板：包含并行网关，主管、采购、财务同时收到审批任务。',
    formFields: [
      { key: 'itemName', label: '采购物品', type: 'input', required: true },
      { key: 'quantity', label: '采购数量', type: 'number', required: true },
      { key: 'budget', label: '预算金额', type: 'number', required: true },
      { key: 'reason', label: '采购原因', type: 'textarea', required: true },
    ],
    nodes: (users) => [
      baseNode('start_1', 'start', '开始', X, 80),
      baseNode('gateway_1', 'parallelGateway', '并行网关-多部门会审', X, 220),
      baseNode('task_1', 'userTask', '用户任务-部门主管审批', LEFT_X, 360, assigneeData(users, 'approver1')),
      baseNode('task_2', 'userTask', '用户任务-采购审批', X, 360, assigneeData(users, 'approver5')),
      baseNode('task_3', 'userTask', '用户任务-财务审批', RIGHT_X, 360, assigneeData(users, 'approver4')),
      baseNode('end_1', 'end', '结束', X, 540),
    ],
    edges: [
      { id: 'edge_1', source: 'start_1', target: 'gateway_1' },
      { id: 'edge_2', source: 'gateway_1', target: 'task_1' },
      { id: 'edge_3', source: 'gateway_1', target: 'task_2' },
      { id: 'edge_4', source: 'gateway_1', target: 'task_3' },
      { id: 'edge_5', source: 'task_1', target: 'end_1' },
      { id: 'edge_6', source: 'task_2', target: 'end_1' },
      { id: 'edge_7', source: 'task_3', target: 'end_1' },
    ],
    sampleVariables: {
      itemName: '笔记本电脑',
      quantity: 2,
      budget: 12000,
      reason: '演示办公设备采购',
    },
  },
  {
    name: '出差审批流程(模板)',
    description: '演示模板：包含条件网关，短途走主管审批，长途走总监审批。',
    formFields: [
      { key: 'destination', label: '出差地点', type: 'input', required: true },
      { key: 'days', label: '出差天数', type: 'number', required: true },
      { key: 'purpose', label: '出差事由', type: 'textarea', required: true },
    ],
    nodes: (users) => [
      baseNode('start_1', 'start', '开始', X, 80),
      baseNode('gateway_1', 'exclusiveGateway', '条件网关-出差天数判断', X, 220),
      baseNode('task_1', 'userTask', '用户任务-部门主管审批', LEFT_X, 360, assigneeData(users, 'approver3')),
      baseNode('task_2', 'userTask', '用户任务-总监审批', RIGHT_X, 360, assigneeData(users, 'approver2')),
      baseNode('end_1', 'end', '结束', X, 520),
    ],
    edges: [
      { id: 'edge_1', source: 'start_1', target: 'gateway_1' },
      { id: 'edge_2', source: 'gateway_1', target: 'task_1', condition: 'days <= 3', label: '3天以内' },
      { id: 'edge_3', source: 'gateway_1', target: 'task_2', condition: 'days > 3', label: '超过3天' },
      { id: 'edge_4', source: 'task_1', target: 'end_1' },
      { id: 'edge_5', source: 'task_2', target: 'end_1' },
    ],
    sampleVariables: {
      destination: '上海',
      days: 3,
      purpose: '演示客户拜访出差',
    },
  },
  {
    name: '用章审批流程(模板)',
    description: '演示模板：包含服务任务和用户任务，先自动记录再进入行政审批。',
    formFields: [
      { key: 'docType', label: '文件类型', type: 'input', required: true },
      { key: 'copies', label: '用章份数', type: 'number', required: true },
      { key: 'purpose', label: '用章用途', type: 'textarea', required: true },
    ],
    nodes: (users) => [
      baseNode('start_1', 'start', '开始', X, 80),
      baseNode('service_1', 'serviceTask', '服务任务-自动登记用章申请', X, 220, { serviceName: 'sealRegister' }),
      baseNode('task_1', 'userTask', '用户任务-部门主管审批', X, 360, assigneeData(users, 'approver1')),
      baseNode('task_2', 'userTask', '用户任务-行政审批', X, 500, assigneeData(users, 'approver5')),
      baseNode('end_1', 'end', '结束', X, 660),
    ],
    edges: [
      { id: 'edge_1', source: 'start_1', target: 'service_1' },
      { id: 'edge_2', source: 'service_1', target: 'task_1' },
      { id: 'edge_3', source: 'task_1', target: 'task_2' },
      { id: 'edge_4', source: 'task_2', target: 'end_1' },
    ],
    sampleVariables: {
      docType: '合同',
      copies: 2,
      purpose: '演示合同用章',
    },
  },
];

const getDemoUserMap = async () => {
  const users = await prisma.user.findMany({
    where: {
      username: {
        in: DEMO_USERS.map((user) => user.username),
      },
    },
  });

  return new Map(users.map((user) => [user.username, user]));
};

const ensureDemoUsers = async (): Promise<DemoUserResult[]> => {
  const hashedPassword = await hashPassword(DEFAULT_PASSWORD);
  const existingUsers = await getDemoUserMap();
  const result: DemoUserResult[] = [];

  for (const demoUser of DEMO_USERS) {
    const existing = existingUsers.get(demoUser.username);

    const user = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: {
            email: demoUser.email,
            fullName: demoUser.fullName,
            role: demoUser.role,
          },
        })
      : await prisma.user.create({
          data: {
            username: demoUser.username,
            email: demoUser.email,
            password: hashedPassword,
            fullName: demoUser.fullName,
            role: demoUser.role,
          },
        });

    result.push({
      key: demoUser.key,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      id: user.id,
    });
  }

  return result;
};

const userIdByKey = (users: DemoUserResult[], key: DemoUserKey) => {
  const user = users.find((item) => item.key === key);
  if (!user) {
    throw new Error(`缺少演示用户：${key}`);
  }
  return user.id;
};

const buildDefinition = (template: DemoTemplate, users: DemoUserResult[]) => ({
  nodes: template.nodes(users),
  edges: template.edges,
  formFields: template.formFields,
});

const containsQuestionMarks = (value: unknown): boolean => {
  if (typeof value === 'string') {
    return value.includes('????') || /\?{2,}/.test(value);
  }
  if (Array.isArray(value)) {
    return value.some(containsQuestionMarks);
  }
  if (value && typeof value === 'object') {
    return Object.values(value).some(containsQuestionMarks);
  }
  return false;
};

const parseDefinition = (definition: any) => {
  if (typeof definition !== 'string') return definition;
  return JSON.parse(definition);
};

const isolateOldTemplates = async () => {
  const names = DEMO_TEMPLATES.map((template) => template.name);
  const oldTemplates = await prisma.processDefinition.findMany({
    where: {
      OR: [
        { name: { in: names } },
        { name: { contains: '????' } },
        { description: { contains: '????' } },
        { name: { contains: '（不可演示-旧模板）' } },
      ],
      NOT: {
        status: 'archived',
      },
    },
  });

  const isolated = [];

  for (const oldTemplate of oldTemplates) {
    await prisma.processDefinition.update({
      where: { id: oldTemplate.id },
      data: {
        name: oldTemplate.name.includes('不可演示')
          ? oldTemplate.name
          : `${oldTemplate.name}（不可演示-旧模板）`,
        status: 'archived',
        updatedAt: new Date(),
      },
    });

    isolated.push({
      id: oldTemplate.id,
      name: oldTemplate.name,
      status: 'archived',
    });
  }

  return isolated;
};

export const rebuildDemoTemplates = async () => {
  const users = await ensureDemoUsers();
  const adminId = userIdByKey(users, 'admin');
  const isolated = await isolateOldTemplates();
  const templates = [];

  for (const template of DEMO_TEMPLATES) {
    const definition = buildDefinition(template, users);

    const created = await prisma.processDefinition.create({
      data: {
        name: template.name,
        description: template.description,
        version: 1,
        status: 'published',
        definition: JSON.stringify(definition),
        createdBy: adminId,
      },
    });

    templates.push({
      id: created.id,
      name: created.name,
      status: created.status,
      nodeTypes: definition.nodes.map((node) => node.type),
    });
  }

  return {
    defaultPassword: DEFAULT_PASSWORD,
    users,
    isolated,
    templates,
  };
};

const getNodeLabelPrefix = (type: DemoNodeType) => {
  const prefixMap: Record<DemoNodeType, string> = {
    start: '开始',
    end: '结束',
    userTask: '用户任务-',
    exclusiveGateway: '条件网关-',
    parallelGateway: '并行网关-',
    serviceTask: '服务任务-',
  };
  return prefixMap[type];
};

const checkTemplateShape = (template: any) => {
  const errors: string[] = [];
  const definition = parseDefinition(template.definition);
  const nodes: DemoNode[] = definition.nodes || [];
  const edges: DemoEdge[] = definition.edges || [];
  const formFields: DemoFormField[] = definition.formFields || [];

  if (containsQuestionMarks(template.name) || containsQuestionMarks(definition)) {
    errors.push('包含 ???? 或连续问号乱码');
  }

  const startNodes = nodes.filter((node) => node.type === 'start');
  const endNodes = nodes.filter((node) => node.type === 'end');

  if (startNodes.length !== 1 || startNodes[0].name !== '开始') {
    errors.push('开始节点数量或名称不正确');
  }

  if (endNodes.length !== 1 || endNodes[0].name !== '结束') {
    errors.push('结束节点数量或名称不正确');
  }

  for (const node of nodes) {
    const prefix = getNodeLabelPrefix(node.type);
    if (node.type === 'start' || node.type === 'end') {
      if (node.name !== prefix) {
        errors.push(`${node.type} 节点名称不符合标准：${node.name}`);
      }
    } else if (!node.name.startsWith(prefix)) {
      errors.push(`${node.type} 节点名称不符合标准：${node.name}`);
    }
  }

  for (const field of formFields) {
    if (!field.key || !field.label || !field.type) {
      errors.push(`表单字段不完整：${JSON.stringify(field)}`);
    }
  }

  if (!nodes.some((node) => node.type === 'exclusiveGateway' || node.type === 'parallelGateway' || node.type === 'serviceTask')) {
    errors.push('未使用节点库中的网关或服务任务节点');
  }

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  for (const edge of edges) {
    const source = nodeMap.get(edge.source);
    const target = nodeMap.get(edge.target);
    if (!source || !target) {
      errors.push(`连线引用不存在节点：${edge.id}`);
      continue;
    }
    if (target.y <= source.y) {
      errors.push(`连线不是自上而下：${source.name} -> ${target.name}`);
    }
  }

  return errors;
};

const countPendingTasksForInstance = async (instanceId: string) => {
  return prisma.task.count({
    where: {
      instanceId,
      status: 'pending',
    },
  });
};

export const verifyDemoTemplates = async () => {
  const templateNames = DEMO_TEMPLATES.map((template) => template.name);
  const templates = await prisma.processDefinition.findMany({
    where: {
      name: {
        in: templateNames,
      },
      status: 'published',
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const latestByName = new Map<string, any>();
  for (const template of templates) {
    if (!latestByName.has(template.name)) {
      latestByName.set(template.name, template);
    }
  }

  const errors: string[] = [];
  const results = [];

  for (const name of templateNames) {
    const template = latestByName.get(name);
    if (!template) {
      errors.push(`缺少已发布模板：${name}`);
      continue;
    }

    const definition = parseDefinition(template.definition);
    const shapeErrors = checkTemplateShape(template);
    errors.push(...shapeErrors.map((error) => `${name}: ${error}`));
    results.push({
      id: template.id,
      name: template.name,
      status: template.status,
      nodeTypes: definition.nodes.map((node: DemoNode) => node.type),
      errors: shapeErrors,
    });
  }

  const users = await ensureDemoUsers();
  const applicantId = userIdByKey(users, 'applicant');
  const leaveTemplate = latestByName.get('请假审批流程(模板)');
  const purchaseTemplate = latestByName.get('采购审批流程(模板)');
  let startedInstanceId: string | null = null;
  let approver1PendingHit = false;
  let parallelInstanceId: string | null = null;
  let parallelPendingCount = 0;

  if (leaveTemplate) {
    const instance = await instanceService.startInstance(
      {
        definitionId: leaveTemplate.id,
        businessKey: `DEMO-VERIFY-${Date.now()}`,
        variables: DEMO_TEMPLATES[0].sampleVariables,
      },
      applicantId
    );
    startedInstanceId = instance.id;

    const approver1Id = userIdByKey(users, 'approver1');
    const task = await prisma.task.findFirst({
      where: {
        instanceId: instance.id,
        assignee: approver1Id,
        status: 'pending',
      },
    });

    approver1PendingHit = !!task;
    if (!task) {
      errors.push('请假流程发起后，审批人一未命中待办任务');
    }
  }

  if (purchaseTemplate) {
    const instance = await instanceService.startInstance(
      {
        definitionId: purchaseTemplate.id,
        businessKey: `DEMO-PARALLEL-${Date.now()}`,
        variables: DEMO_TEMPLATES[2].sampleVariables,
      },
      applicantId
    );
    parallelInstanceId = instance.id;
    parallelPendingCount = await countPendingTasksForInstance(instance.id);

    if (parallelPendingCount < 3) {
      errors.push(`采购并行流程未生成3个并行待办，当前=${parallelPendingCount}`);
    }
  }

  return {
    pass: errors.length === 0,
    errors,
    templates: results,
    validation: {
      startedInstanceId,
      approver1PendingHit,
      parallelInstanceId,
      parallelPendingCount,
    },
  };
};
