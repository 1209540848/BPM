import { Context } from 'koa';
import * as demoTemplateService from '../services/demo-template.service';
import { successResponse } from '../utils/response.util';

export const rebuildDemoTemplates = async (ctx: Context) => {
  const result = await demoTemplateService.rebuildDemoTemplates();
  successResponse(ctx, result, '演示模板重建成功');
};

export const verifyDemoTemplates = async (ctx: Context) => {
  const result = await demoTemplateService.verifyDemoTemplates();
  successResponse(ctx, result, result.pass ? '演示模板验收通过' : '演示模板验收失败');
};
