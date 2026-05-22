export const PERMISSIONS = {
  DASHBOARD_VIEW: 'oa:dashboard:view',
  PROCESS_READ: 'oa:process:read',
  PROCESS_WRITE: 'oa:process:write',
  PROCESS_PUBLISH: 'oa:process:publish',
  PROCESS_DELETE: 'oa:process:delete',
  INSTANCE_START: 'oa:instance:start',
  INSTANCE_READ: 'oa:instance:read',
  INSTANCE_CANCEL: 'oa:instance:cancel',
  TASK_READ: 'oa:task:read',
  TASK_APPROVE: 'oa:task:approve',
  TASK_DELEGATE: 'oa:task:delegate',
  DEMO_REBUILD: 'oa:demo:rebuild',
  DEMO_VERIFY: 'oa:demo:verify',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export type AppRole = 'admin' | 'applicant' | 'approver';

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

export const ROLE_PERMISSIONS: Record<AppRole, PermissionCode[]> = {
  admin: ALL_PERMISSIONS,
  applicant: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.PROCESS_READ,
    PERMISSIONS.INSTANCE_START,
    PERMISSIONS.INSTANCE_READ,
  ],
  approver: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.PROCESS_READ,
    PERMISSIONS.INSTANCE_READ,
    PERMISSIONS.TASK_READ,
    PERMISSIONS.TASK_APPROVE,
    PERMISSIONS.TASK_DELEGATE,
  ],
};

export const normalizeRole = (role?: string | null, username?: string | null): AppRole => {
  if (role === 'admin' || username === 'admin_demo') {
    return 'admin';
  }

  if (role === 'applicant' || username === 'user_apply') {
    return 'applicant';
  }

  if (role === 'approver' || username?.startsWith('user_approver_')) {
    return 'approver';
  }

  return 'applicant';
};

export const getPermissionsByRole = (role: AppRole): PermissionCode[] => {
  return ROLE_PERMISSIONS[role] || [];
};

export const hasAnyPermission = (
  permissions: PermissionCode[],
  requiredPermissions: PermissionCode[]
): boolean => {
  return requiredPermissions.some((permission) => permissions.includes(permission));
};
