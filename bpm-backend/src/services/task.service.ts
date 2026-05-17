import prisma from '../config/database.config';
import { Task, PaginationParams, PaginationResult } from '../types';
import { getWebSocketService } from './websocket.service';
import { getNodeName, getOutgoingTargets, parseJsonArray, parseJsonObject } from './process-engine.service';
import { resolveAssignee } from './assignee-resolver.service';

export const getTasks = async (
  params: PaginationParams & { assignee?: string }
): Promise<PaginationResult<Task>> => {
  const { page = 1, pageSize = 10, status, assignee } = params;
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (status) {
    where.status = status;
  }
  if (assignee) {
    where.assignee = assignee;
  }

  const [list, total] = await Promise.all([
    prisma.task.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        instance: {
          include: {
            definition: true,
          },
        },
      },
    }),
    prisma.task.count({ where }),
  ]);

  return { list, total, page, pageSize };
};

export const getMyPendingTasks = async (
  userId: string
): Promise<Task[]> => {
  return await prisma.task.findMany({
    where: {
      assignee: userId,
      status: 'pending',
    },
    orderBy: { createdAt: 'desc' },
    include: {
      instance: {
        include: {
          definition: true,
        },
      },
    },
  });
};

export const completeTask = async (
  taskId: string,
  userId: string,
  variables?: any,
  comment?: string
): Promise<Task> => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      instance: true,
    },
  });

  if (!task) {
    throw new Error('任务不存在');
  }

  // 权限检查 1：任务是否分配给当前用户
  if (task.assignee !== userId) {
    throw new Error('无权操作此任务');
  }

  // 权限检查 2：防止申请人审批自己的申请
  if (task.instance.startedBy === userId) {
    throw new Error('申请人不能审批自己的申请');
  }

  if (task.status !== 'pending') {
    throw new Error('任务已完成或已取消');
  }

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: {
      status: 'approved',
      completedAt: new Date(),
    },
  });

  await prisma.processHistory.create({
    data: {
      instanceId: task.instanceId,
      nodeId: task.nodeId,
      nodeName: task.nodeName,
      type: 'task_complete',
      timestamp: new Date(),
      operator: userId,
      comment,
    },
  });

  await continueProcess(task.instanceId, variables);

  // 发送任务审批结果通知
  try {
    const wsService = getWebSocketService();
    wsService.sendTaskResult(task.assignee!, taskId, task.instanceId, 'approved', comment);
  } catch (error) {
    console.error('WebSocket send error:', error);
  }

  return updatedTask;
};

export const rejectTask = async (
  taskId: string,
  userId: string,
  comment?: string
): Promise<Task> => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      instance: true,
    },
  });

  if (!task) {
    throw new Error('任务不存在');
  }

  // 权限检查 1：任务是否分配给当前用户
  if (task.assignee !== userId) {
    throw new Error('无权操作此任务');
  }

  // 权限检查 2：防止申请人审批自己的申请
  if (task.instance.startedBy === userId) {
    throw new Error('申请人不能审批自己的申请');
  }

  if (task.status !== 'pending') {
    throw new Error('任务已完成或已取消');
  }

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: {
      status: 'rejected',
      completedAt: new Date(),
    },
  });

  await prisma.processHistory.create({
    data: {
      instanceId: task.instanceId,
      nodeId: task.nodeId,
      nodeName: task.nodeName,
      type: 'task_reject',
      timestamp: new Date(),
      operator: userId,
      comment,
    },
  });

  await prisma.processInstance.update({
    where: { id: task.instanceId },
    data: {
      status: 'cancelled',
      endedAt: new Date(),
    },
  });

  // 发送任务拒绝结果通知
  try {
    const wsService = getWebSocketService();
    wsService.sendTaskResult(task.assignee!, taskId, task.instanceId, 'rejected', comment);
  } catch (error) {
    console.error('WebSocket send error:', error);
  }

  return updatedTask;
};

export const delegateTask = async (
  taskId: string,
  userId: string,
  toUserId: string,
  comment?: string
): Promise<Task> => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    throw new Error('任务不存在');
  }

  if (task.assignee !== userId) {
    throw new Error('无权操作此任务');
  }

  if (task.status !== 'pending') {
    throw new Error('任务已完成或已取消');
  }

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: {
      assignee: toUserId,
      status: 'delegated',
    },
  });

  await prisma.processHistory.create({
    data: {
      instanceId: task.instanceId,
      nodeId: task.nodeId,
      nodeName: task.nodeName,
      type: 'task_delegate',
      timestamp: new Date(),
      operator: userId,
      comment,
    },
  });

  return updatedTask;
};

const continueProcess = async (instanceId: string, newVariables: Record<string, any> = {}): Promise<void> => {
  const instance = await prisma.processInstance.findUnique({
    where: { id: instanceId },
    include: {
      definition: true,
    },
  });

  if (!instance || instance.status !== 'running') {
    return;
  }

  const definitionData = typeof instance.definition.definition === 'string' 
    ? JSON.parse(instance.definition.definition) 
    : instance.definition.definition as any;
  const nodes = definitionData?.nodes || [];
  const edges = definitionData?.edges || [];
  const variables = {
    ...parseJsonObject(instance.variables),
    ...newVariables,
  };

  const currentNodeIds = typeof instance.currentNodeIds === 'string' 
    ? JSON.parse(instance.currentNodeIds) 
    : instance.currentNodeIds;
  const nextNodeIds: string[] = [];

  for (const nodeId of currentNodeIds) {
    const sourceNode = nodes.find((n: any) => n.id === nodeId);
    if (!sourceNode) continue;
    nextNodeIds.push(...getOutgoingTargets(sourceNode, edges, variables));
  }

  if (nextNodeIds.length === 0) {
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

  const waitingNodeIds: string[] = [];
  const queue = [...new Set(nextNodeIds)];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    const node = nodes.find((n: any) => n.id === nodeId);
    if (!node) {
      continue;
    }

    await prisma.processHistory.create({
      data: {
        instanceId,
        nodeId: node.id,
        nodeName: getNodeName(node),
        type: node.type,
        timestamp: new Date(),
      },
    });

    if (node.type === 'userTask') {
      const candidateUsers = node.data?.candidateUsers || node.candidateUsers || [];
      const candidateGroups = node.data?.candidateGroups || node.candidateGroups || [];
      let assignee = await resolveAssignee(node, instance.startedBy);

      // 防止申请人审批自己的申请
      if (assignee === instance.startedBy && candidateUsers.length === 0) {
        console.warn(`警告：任务 ${node.id} 的审批人是申请人本身，需要指定其他审批人`);
        // 可以选择：跳过这个任务、或者抛出错误
        // 这里暂时跳过，实际应该在流程设计时就防止这种情况
        continue;
      }

      await prisma.task.create({
        data: {
          instanceId,
          definitionId: instance.definitionId,
          nodeId: node.id,
          nodeName: getNodeName(node),
          status: 'pending',
          assignee,
          candidateUsers: JSON.stringify(candidateUsers),
          candidateGroups: JSON.stringify(candidateGroups),
          variables: JSON.stringify(variables),
        },
      });
      waitingNodeIds.push(node.id);

      // 发送任务分配通知
      try {
        const wsService = getWebSocketService();
        wsService.sendTaskAssigned(assignee, node.id, getNodeName(node), instanceId);
      } catch (error) {
        console.error('WebSocket send error:', error);
      }
    } else if (node.type === 'end') {
      await prisma.processInstance.update({
        where: { id: instanceId },
        data: {
          status: 'completed',
          endedAt: new Date(),
          currentNodeIds: JSON.stringify([]),
        },
      });
      return;
    } else {
      queue.push(...getOutgoingTargets(node, edges, variables));
    }
  }

  const pendingTasks = await prisma.task.findMany({
    where: {
      instanceId,
      status: 'pending',
    },
  });

  const pendingNodeIds = pendingTasks.map((task) => task.nodeId);
  const activeNodeIds = [...new Set([...waitingNodeIds, ...pendingNodeIds])];

  if (activeNodeIds.length === 0) {
    await prisma.processInstance.update({
      where: { id: instanceId },
      data: {
        status: 'completed',
        endedAt: new Date(),
        currentNodeIds: JSON.stringify([]),
        variables: JSON.stringify(variables),
      },
    });
    return;
  }

  await prisma.processInstance.update({
    where: { id: instanceId },
    data: {
      currentNodeIds: JSON.stringify(activeNodeIds),
      variables: JSON.stringify(variables),
    },
  });
};
