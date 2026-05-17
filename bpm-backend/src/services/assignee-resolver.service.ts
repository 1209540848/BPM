import prisma from '../config/database.config';

export type AssigneeType = 'user' | 'role';

export const resolveAssignee = async (
  node: any,
  fallbackUserId: string
): Promise<string> => {
  const assigneeType: AssigneeType = node?.data?.assigneeType || node?.assigneeType || 'user';
  const rawAssignee = node?.data?.assignee || node?.assignee;

  if (!rawAssignee) {
    return fallbackUserId;
  }

  if (assigneeType === 'role') {
    const roleUser = await prisma.user.findFirst({
      where: { role: rawAssignee },
      orderBy: { createdAt: 'asc' },
    });

    return roleUser?.username || fallbackUserId;
  }

  return rawAssignee;
};
