import { Context, Next } from 'koa';
import { verifyToken } from '../utils/jwt.util';

export const authMiddleware = async (ctx: Context, next: Next) => {
  const authHeader = ctx.headers.authorization;

  if (!authHeader) {
    ctx.status = 401;
    ctx.body = {
      code: 401,
      message: '未授权，请先登录',
    };
    return;
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    ctx.state.user = verifyToken(token);
    await next();
  } catch (error) {
    ctx.status = 401;
    ctx.body = {
      code: 401,
      message: 'Token 无效或已过期',
    };
  }
};
