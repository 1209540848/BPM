const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const templateFields = [
  {
    match: '请假',
    fields: [
      { key: 'leaveType', label: '请假类型', type: 'select', required: true, placeholder: '请选择请假类型', options: [{ label: '年假', value: 'annual' }, { label: '病假', value: 'sick' }, { label: '事假', value: 'personal' }] },
      { key: 'startDate', label: '开始日期', type: 'date', required: true, placeholder: '请选择开始日期' },
      { key: 'endDate', label: '结束日期', type: 'date', required: true, placeholder: '请选择结束日期' },
      { key: 'days', label: '请假天数', type: 'number', required: true, placeholder: '请输入请假天数' },
      { key: 'reason', label: '请假原因', type: 'textarea', required: true, placeholder: '请输入请假原因' },
    ],
  },
  {
    match: '报销',
    fields: [
      { key: 'expenseType', label: '报销类型', type: 'select', required: true, placeholder: '请选择报销类型', options: [{ label: '交通', value: 'traffic' }, { label: '餐饮', value: 'meal' }, { label: '办公用品', value: 'office' }, { label: '其他', value: 'other' }] },
      { key: 'amount', label: '报销金额', type: 'number', required: true, placeholder: '请输入报销金额' },
      { key: 'expenseDate', label: '发生日期', type: 'date', required: true, placeholder: '请选择发生日期' },
      { key: 'invoiceNo', label: '发票编号', type: 'input', required: false, placeholder: '请输入发票编号' },
      { key: 'reason', label: '报销说明', type: 'textarea', required: true, placeholder: '请输入报销说明' },
    ],
  },
  {
    match: '采购',
    fields: [
      { key: 'item', label: '采购物品', type: 'input', required: true, placeholder: '请输入采购物品' },
      { key: 'category', label: '采购类别', type: 'select', required: true, placeholder: '请选择采购类别', options: [{ label: '办公用品', value: 'office' }, { label: '设备', value: 'device' }, { label: '服务', value: 'service' }] },
      { key: 'quantity', label: '采购数量', type: 'number', required: true, placeholder: '请输入采购数量' },
      { key: 'amount', label: '预算金额', type: 'number', required: true, placeholder: '请输入预算金额' },
      { key: 'reason', label: '采购原因', type: 'textarea', required: true, placeholder: '请输入采购原因' },
    ],
  },
  {
    match: '出差',
    fields: [
      { key: 'destination', label: '出差地点', type: 'input', required: true, placeholder: '请输入出差地点' },
      { key: 'startDate', label: '开始日期', type: 'date', required: true, placeholder: '请选择开始日期' },
      { key: 'endDate', label: '结束日期', type: 'date', required: true, placeholder: '请选择结束日期' },
      { key: 'days', label: '出差天数', type: 'number', required: true, placeholder: '请输入出差天数' },
      { key: 'reason', label: '出差事由', type: 'textarea', required: true, placeholder: '请输入出差事由' },
    ],
  },
  {
    match: '用章',
    fields: [
      { key: 'sealType', label: '印章类型', type: 'select', required: true, placeholder: '请选择印章类型', options: [{ label: '公章', value: 'company' }, { label: '合同章', value: 'contract' }, { label: '财务章', value: 'finance' }] },
      { key: 'documentName', label: '文件名称', type: 'input', required: true, placeholder: '请输入文件名称' },
      { key: 'copies', label: '用章份数', type: 'number', required: true, placeholder: '请输入用章份数' },
      { key: 'useDate', label: '用章日期', type: 'date', required: true, placeholder: '请选择用章日期' },
      { key: 'reason', label: '用章事由', type: 'textarea', required: true, placeholder: '请输入用章事由' },
    ],
  },
];

async function main() {
  const definitions = await prisma.processDefinition.findMany({
    where: {
      status: 'published',
      OR: templateFields.map((item) => ({ name: { contains: item.match } })),
    },
    orderBy: { createdAt: 'desc' },
  });

  const updated = [];

  for (const definition of definitions) {
    const template = templateFields.find((item) => definition.name.includes(item.match));
    if (!template) continue;

    const definitionData = JSON.parse(definition.definition || '{}');
    definitionData.formFields = template.fields;

    await prisma.processDefinition.update({
      where: { id: definition.id },
      data: {
        definition: JSON.stringify(definitionData),
        updatedAt: new Date(),
      },
    });

    updated.push({
      id: definition.id,
      name: definition.name,
      status: definition.status,
      fields: template.fields.map((field) => field.key),
    });
  }

  console.log(JSON.stringify(updated, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
