import { Context, Next } from 'koa';
import {
  AppRole,
  getPermissionsByRole,
  hasAnyPermission,
  normalizeRole,
  PermissionCode,
} from '../constants/permissions';

export const requirePermission = (...requiredPermissions: PermissionCode[]) => {
  return async (ctx: Context, next: Next) => {
    const user = ctx.state.user;
    const role = normalizeRole(user?.role, user?.username);
    const permissions = getPermissionsByRole(role);

    if (!hasAnyPermission(permissions, requiredPermissions)) {
      ctx.status = 403;
      ctx.body = {
        code: 403,
        message: '没有权限访问该资源',
      };
      return;
    }

    ctx.state.role = role;
    ctx.state.permissions = permissions;
    await next();
  };
};

export const requireRole = (...requiredRoles: AppRole[]) => {
  return async (ctx: Context, next: Next) => {
    const user = ctx.state.user;
    const role = normalizeRole(user?.role, user?.username);

    if (!requiredRoles.includes(role)) {
      ctx.status = 403;
      ctx.body = {
        code: 403,
        message: '没有权限访问该资源',
      };
      return;
    }

    ctx.state.role = role;
    await next();
  };
};
