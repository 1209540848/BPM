import prisma from '../config/database.config';
import { PaginationParams, PaginationResult, Task } from '../types';
import { getWebSocketService } from './websocket.service';
import { continueProcess } from './instance.service';

export const getTasks = async (
  params: PaginationParams & { assignee?: string }
): Promise<PaginationResult<Task>> => {
  const { page = 1, pageSize = 10, status, assignee } = params;
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (status) where.status = status;
  if (assignee) where.assignee = assignee;

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

export const getMyPendingTasks = async (userId: string): Promise<Task[]> => {
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

  if (task.assignee !== userId) {
    throw new Error('无权操作此任务');
  }

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

  const mergedVariables = {
    ...(typeof task.instance.variables === 'string'
      ? JSON.parse(task.instance.variables || '{}')
      : task.instance.variables || {}),
    ...(variables || {}),
  };

  await prisma.processInstance.update({
    where: { id: task.instanceId },
    data: {
      variables: JSON.stringify(mergedVariables),
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

  await continueProcess(task.instanceId, task.nodeId);

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

  if (task.assignee !== userId) {
    throw new Error('无权操作此任务');
  }

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
      currentNodeIds: JSON.stringify([]),
    },
  });

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
