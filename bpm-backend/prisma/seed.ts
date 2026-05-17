import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/password.util';

const prisma = new PrismaClient();

const purchaseApprovalDefinition = {
  formFields: [
    { key: 'item', label: '采购物品', type: 'input', required: true, placeholder: '请输入采购物品' },
    { key: 'amount', label: '采购金额', type: 'number', required: true, placeholder: '请输入采购金额' },
    { key: 'supplier', label: '供应商', type: 'input', required: false, placeholder: '请输入供应商' },
    { key: 'reason', label: '采购原因', type: 'textarea', required: true, placeholder: '请输入采购原因' },
  ],
  nodes: [
    { id: 'start', type: 'start', label: '提交采购申请' },
    { id: 'manager_review', type: 'userTask', label: '部门经理审批', data: { assignee: 'manager' } },
    { id: 'amount_gateway', type: 'exclusiveGateway', label: '金额判断' },
    { id: 'finance_review', type: 'userTask', label: '财务审批', data: { assignee: 'finance' } },
    { id: 'director_review', type: 'userTask', label: '总监审批', data: { assignee: 'director' } },
    { id: 'end', type: 'end', label: '采购审批完成' },
  ],
  edges: [
    { source: 'start', target: 'manager_review' },
    { source: 'manager_review', target: 'amount_gateway' },
    { source: 'amount_gateway', target: 'finance_review', condition: 'amount < 5000', label: '小额采购' },
    { source: 'amount_gateway', target: 'director_review', condition: 'amount >= 5000', label: '大额采购' },
    { source: 'finance_review', target: 'end' },
    { source: 'director_review', target: 'finance_review' },
  ],
};

const users = [
  { username: 'applicant', email: 'applicant@example.com', fullName: '采购申请人', role: 'user' },
  { username: 'manager', email: 'manager@example.com', fullName: '部门经理', role: 'manager' },
  { username: 'finance', email: 'finance@example.com', fullName: '财务审批人', role: 'finance' },
  { username: 'director', email: 'director@example.com', fullName: '业务总监', role: 'director' },
  { username: 'admin', email: 'admin@example.com', fullName: '系统管理员', role: 'admin' },
];

async function main() {
  const password = await hashPassword('123456');

  for (const user of users) {
    await prisma.user.upsert({
      where: { username: user.username },
      update: { email: user.email, fullName: user.fullName, role: user.role },
      create: { ...user, password },
    });
  }

  const definition = await prisma.processDefinition.upsert({
    where: { id: 'demo-purchase-approval' },
    update: {
      name: '采购申请审批流程',
      description: '小额采购走部门经理和财务；大额采购追加总监审批。',
      status: 'published',
      definition: JSON.stringify(purchaseApprovalDefinition),
      updatedAt: new Date(),
    },
    create: {
      id: 'demo-purchase-approval',
      name: '采购申请审批流程',
      description: '小额采购走部门经理和财务；大额采购追加总监审批。',
      version: 1,
      status: 'published',
      definition: JSON.stringify(purchaseApprovalDefinition),
      createdBy: 'admin',
    },
  });

  const existingDemoInstances = await prisma.processInstance.count({
    where: { definitionId: definition.id },
  });

  if (existingDemoInstances === 0) {
    await prisma.processInstance.create({
      data: {
        definitionId: definition.id,
        definitionVersion: definition.version,
        businessKey: 'PO-LOW-2026-001',
        status: 'running',
        variables: JSON.stringify({ amount: 3200, item: '研发测试服务器配件', department: '研发部' }),
        currentNodeIds: JSON.stringify(['manager_review']),
        startedBy: 'applicant',
        histories: {
          create: [
            { nodeId: 'start', nodeName: '提交采购申请', type: 'start' },
            { nodeId: 'manager_review', nodeName: '部门经理审批', type: 'userTask' },
          ],
        },
        tasks: {
          create: {
            definitionId: definition.id,
            nodeId: 'manager_review',
            nodeName: '部门经理审批',
            status: 'pending',
            assignee: 'manager',
            candidateUsers: JSON.stringify([]),
            candidateGroups: JSON.stringify(['department_manager']),
            variables: JSON.stringify({ amount: 3200, item: '研发测试服务器配件', department: '研发部' }),
          },
        },
      },
    });

    await prisma.processInstance.create({
      data: {
        definitionId: definition.id,
        definitionVersion: definition.version,
        businessKey: 'PO-HIGH-2026-001',
        status: 'running',
        variables: JSON.stringify({ amount: 12800, item: '设计部门工作站', department: '设计部' }),
        currentNodeIds: JSON.stringify(['manager_review']),
        startedBy: 'applicant',
        histories: {
          create: [
            { nodeId: 'start', nodeName: '提交采购申请', type: 'start' },
            { nodeId: 'manager_review', nodeName: '部门经理审批', type: 'userTask' },
          ],
        },
        tasks: {
          create: {
            definitionId: definition.id,
            nodeId: 'manager_review',
            nodeName: '部门经理审批',
            status: 'pending',
            assignee: 'manager',
            candidateUsers: JSON.stringify([]),
            candidateGroups: JSON.stringify(['department_manager']),
            variables: JSON.stringify({ amount: 12800, item: '设计部门工作站', department: '设计部' }),
          },
        },
      },
    });
  }

  console.log('Seed completed. Demo accounts password: 123456');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
