import prisma from '../config/database.config';
import { ProcessDefinition, PaginationParams, PaginationResult } from '../types';
import {
  buildDefinitionPayload,
  normalizeProcessDefinition,
  validateProcessDefinition,
} from '../utils/process-definition.util';

export const getDefinitions = async (
  params: PaginationParams
): Promise<PaginationResult<ProcessDefinition>> => {
  const { page = 1, pageSize = 10, status } = params;
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (status) {
    where.status = status;
  }

  const [list, total] = await Promise.all([
    prisma.processDefinition.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.processDefinition.count({ where }),
  ]);

  return { list, total, page, pageSize };
};

export const createDefinition = async (
  data: {
    name: string;
    description?: string;
    definition: any;
  },
  createdBy: string
): Promise<ProcessDefinition> => {
  const normalized = normalizeProcessDefinition(data.definition);

  return await prisma.processDefinition.create({
    data: {
      name: data.name,
      description: data.description,
      definition: JSON.stringify(buildDefinitionPayload(normalized)),
      createdBy,
      version: 1,
      status: 'draft',
    },
  });
};

export const updateDefinition = async (
  id: string,
  data: {
    name?: string;
    description?: string;
    definition?: any;
  }
): Promise<ProcessDefinition> => {
  const updateData: any = {
    updatedAt: new Date(),
  };
  
  if (data.name !== undefined) {
    updateData.name = data.name;
  }
  if (data.description !== undefined) {
    updateData.description = data.description;
  }
  if (data.definition !== undefined) {
    const normalized = normalizeProcessDefinition(data.definition);
    updateData.definition = JSON.stringify(buildDefinitionPayload(normalized));
  }
  
  return await prisma.processDefinition.update({
    where: { id },
    data: updateData,
  });
};

export const publishDefinition = async (
  id: string
): Promise<ProcessDefinition> => {
  const current = await prisma.processDefinition.findUnique({
    where: { id },
  });

  if (!current) {
    throw new Error('流程定义不存在');
  }

  const normalized = normalizeProcessDefinition(current.definition);
  const errors = validateProcessDefinition(normalized);
  if (errors.length > 0) {
    throw new Error(`流程发布校验失败：${errors.join('；')}`);
  }

  return await prisma.processDefinition.update({
    where: { id },
    data: { status: 'published', updatedAt: new Date() },
  });
};

export const deleteDefinition = async (id: string): Promise<void> => {
  await prisma.processDefinition.delete({
    where: { id },
  });
};

export const getDefinitionById = async (
  id: string
): Promise<ProcessDefinition | null> => {
  return await prisma.processDefinition.findUnique({
    where: { id },
  });
};
