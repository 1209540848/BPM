import prisma from '../config/database.config';
import { PaginationParams, PaginationResult, ProcessInstance } from '../types';
import * as processService from './process.service';
import {
  normalizeProcessDefinition,
  resolveNextEdges,
  validateFormValues,
  type NormalizedDefinition,
  type NormalizedNode,
} from '../utils/process-definition.util';

export const getInstances = async (
  params: PaginationParams & { definitionId?: string }
): Promise<PaginationResult<ProcessInstance>> => {
  const { page = 1, pageSize = 10, status, definitionId } = params;
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (status) where.status = status;
  if (definitionId) where.definitionId = definitionId;

  const [list, total] = await Promise.all([
    prisma.processInstance.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        definition: true,
      },
    }),
    prisma.processInstance.count({ where }),
  ]);

  return { list, total, page, pageSize };
};

export const startInstance = async (
  data: {
    definitionId: string;
    businessKey?: string;
    variables?: any;
  },
  startedBy: string
): Promise<ProcessInstance> => {
  const { definitionId, businessKey, variables = {} } = data;

  const definition = await processService.getDefinitionById(definitionId);
  if (!definition) {
    throw new Error('流程定义不存在');
  }

  if (definition.status !== 'published') {
    throw new Error('流程定义未发布');
  }

  const normalizedDefinition = normalizeProcessDefinition(definition.definition);
  const formErrors = validateFormValues(normalizedDefinition, variables);
  if (formErrors.length > 0) {
    throw new Error(`表单校验失败：${formErrors.join('；')}`);
  }

  const instance = await prisma.processInstance.create({
    data: {
      definitionId,
      definitionVersion: definition.version,
      businessKey,
      status: 'running',
      variables: JSON.stringify(variables),
      currentNodeIds: JSON.stringify([]),
      startedBy,
    },
  });

  const startNode = normalizedDefinition.nodes.find(node => node.type === 'start');
  if (!startNode) {
    throw new Error('流程定义缺少开始节点');
  }

  await advanceProcess(
    instance.id,
    definition.id,
    normalizedDefinition,
    variables,
    startedBy,
    [startNode.id],
    []
  );

  return instance;
};

export const getInstance = async (
  id: string
): Promise<ProcessInstance & { history: any[] }> => {
  const instance = await prisma.processInstance.findUnique({
    where: { id },
    include: {
      definition: true,
      histories: {
        orderBy: { timestamp: 'asc' },
      },
    },
  });

  if (!instance) {
    throw new Error('流程实例不存在');
  }

  return instance as any;
};

export const cancelInstance = async (id: string): Promise<void> => {
  const instance = await prisma.processInstance.findUnique({
    where: { id },
  });

  if (!instance) {
    throw new Error('流程实例不存在');
  }

  if (instance.status !== 'running') {
    throw new Error('流程实例未处于运行中');
  }

  await prisma.processInstance.update({
    where: { id },
    data: {
      status: 'cancelled',
      endedAt: new Date(),
    },
  });

  await prisma.task.updateMany({
    where: {
      instanceId: id,
      status: 'pending',
    },
    data: {
      status: 'cancelled',
      completedAt: new Date(),
    },
  });
};

export const continueProcess = async (
  instanceId: string,
  completedNodeId: string
): Promise<void> => {
  const instance = await prisma.processInstance.findUnique({
    where: { id: instanceId },
    include: {
      definition: true,
    },
  });

  if (!instance || instance.status !== 'running') {
    return;
  }

  const normalizedDefinition = normalizeProcessDefinition(instance.definition.definition);
  const variables =
    typeof instance.variables === 'string'
      ? JSON.parse(instance.variables || '{}')
      : instance.variables || {};
  const currentNodeIds =
    typeof instance.currentNodeIds === 'string'
      ? JSON.parse(instance.currentNodeIds || '[]')
      : instance.currentNodeIds || [];

  const remainingNodeIds = currentNodeIds.filter((nodeId: string) => nodeId !== completedNodeId);
  const nextNodeIds = resolveNextEdges(completedNodeId, normalizedDefinition, variables).map(
    edge => edge.target
  );

  await advanceProcess(
    instance.id,
    instance.definitionId,
    normalizedDefinition,
    variables,
    instance.startedBy,
    nextNodeIds,
    remainingNodeIds
  );
};

async function advanceProcess(
  instanceId: string,
  definitionId: string,
  definition: NormalizedDefinition,
  variables: Record<string, any>,
  startedBy: string,
  pendingNodeIds: string[],
  activeNodeIds: string[]
) {
  const queue = [...pendingNodeIds];
  const visited = new Set<string>();
  const currentActiveNodeIds = [...activeNodeIds];

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    const node = definition.nodes.find(item => item.id === nodeId);
    if (!node) continue;

    await prisma.processHistory.create({
      data: {
        instanceId,
        nodeId: node.id,
        nodeName: node.name,
        type: node.type,
        timestamp: new Date(),
      },
    });

    if (node.type === 'userTask') {
      const assignee = await resolveAssignee(node, startedBy);
      await prisma.task.create({
        data: {
          instanceId,
          definitionId,
          nodeId: node.id,
          nodeName: node.name,
          status: 'pending',
          assignee,
          candidateUsers: JSON.stringify([]),
          candidateGroups: JSON.stringify([]),
          variables: JSON.stringify(variables),
        },
      });
      currentActiveNodeIds.push(node.id);
      continue;
    }

    if (node.type === 'end') {
      continue;
    }

    const nextEdges = resolveNextEdges(node.id, definition, variables);
    for (const edge of nextEdges) {
      queue.push(edge.target);
    }
  }

  const uniqueActiveNodeIds = Array.from(new Set(currentActiveNodeIds));

  if (uniqueActiveNodeIds.length === 0) {
    await prisma.processInstance.update({
      where: { id: instanceId },
      data: {
        status: 'completed',
        endedAt: new Date(),
        currentNodeIds: JSON.stringify([]),
      },
    });
    return;
  }

  await prisma.processInstance.update({
    where: { id: instanceId },
    data: {
      currentNodeIds: JSON.stringify(uniqueActiveNodeIds),
    },
  });
}

async function resolveAssignee(node: NormalizedNode, startedBy: string) {
  if (node.assigneeType === 'role') {
    const role = node.assignee || node.approverRoles?.[0];
    if (!role) {
      throw new Error(`审批节点 ${node.name} 未配置角色审批人`);
    }

    const roleUser = await prisma.user.findFirst({
      where: { role },
      orderBy: { createdAt: 'asc' },
    });

    if (!roleUser) {
      throw new Error(`未找到角色 ${role} 对应的审批人`);
    }

    return roleUser.id;
  }

  if (node.assignee) {
    const directUser = await prisma.user.findFirst({
      where: {
        OR: [{ id: node.assignee }, { username: node.assignee }],
      },
    });

    return directUser?.id || node.assignee;
  }

  return startedBy;
}
