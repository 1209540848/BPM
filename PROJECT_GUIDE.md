# BPM 系统快速梳理指南

## 一、项目是什么

这是一个**企业级业务流程管理系统**，用来**自动化处理审批流程**。

**类比**：公司请假审批
- 传统方式：员工找老板签字 → 老板找 HR 签字 → 完成
- 系统方式：员工在系统填表 → 系统自动发给老板 → 老板审批 → 系统自动发给 HR → HR 审批 → 完成

---

## 二、核心概念

### 1. 流程定义（ProcessDefinition）
**是什么**：一个审批流程的模板，定义了整个流程的结构。

**包含内容**：
- 节点（开始、审批、结束等）
- 连线（节点之间的流向）
- 条件（什么情况下走哪条路）

**例子**：
```
开始 → 员工填表 → 直属上司审批 → HR 审批 → 结束
```

**状态**：
- `draft`（草稿）：还在编辑中
- `published`（已发布）：可以用来发起申请
- `archived`（已归档）：不再使用

---

### 2. 流程实例（ProcessInstance）
**是什么**：一个具体的申请，是流程定义的一个执行过程。

**例子**：
- 流程定义：请假审批流程
- 流程实例：张三的请假申请、李四的请假申请（两个不同的实例）

**包含内容**：
- 申请人（谁发起的）
- 当前状态（running/completed/cancelled）
- 当前在哪个节点
- 申请的数据（请假天数、原因等）

**生命周期**：
```
running（进行中）
  ↓
completed（完成）或 cancelled（取消）
```

---

### 3. 任务（Task）
**是什么**：分配给某个人的一个审批工作。

**例子**：
- 流程实例：张三的请假申请
- 任务 1：分配给王经理（直属上司）审批
- 任务 2：分配给李 HR（HR）审批

**包含内容**：
- 分配给谁（assignee）
- 当前状态（pending/approved/rejected）
- 审批意见（comment）

**状态**：
- `pending`（待审批）：还没审批
- `approved`（已同意）：审批通过
- `rejected`（已拒绝）：审批拒绝

---

## 三、用户操作流程

### 场景：张三请假

#### 第 1 步：管理员设计流程
1. 打开 `/designer` 页面
2. 拖拽节点：开始 → 员工填表 → 直属上司审批 → HR 审批 → 结束
3. 配置每个节点的审批人
4. 点"发布"，流程变成 `published` 状态

#### 第 2 步：张三发起申请
1. 打开 `/apply` 页面
2. 选择"请假流程"
3. 填表：请假天数 5 天、原因"回家探亲"
4. 点"提交"
5. 系统创建一个 `ProcessInstance`，状态 `running`
6. 系统自动创建第一个 `Task`，分配给王经理

#### 第 3 步：王经理审批
1. 打开 `/tasks` 页面，看到"张三的请假申请"
2. 点开任务，看到申请信息
3. 选择"同意"，填写意见"同意"
4. 点"提交"
5. 系统标记这个 `Task` 为 `approved`
6. 系统自动创建下一个 `Task`，分配给李 HR

#### 第 4 步：李 HR 审批
1. 打开 `/tasks` 页面，看到"张三的请假申请"
2. 点开任务，看到申请信息和王经理的审批意见
3. 选择"同意"
4. 点"提交"
5. 系统标记这个 `Task` 为 `approved`
6. 流程到达"结束"节点，`ProcessInstance` 状态变成 `completed`

#### 第 5 步：张三查看结果
1. 打开 `/instances` 页面
2. 看到自己的申请状态是"已完成"
3. 点开查看完整的审批历史

---

## 四、技术架构

### 前端（Vue 3 + TypeScript）

**主要页面**：
```
/login              登录页面
/register           注册页面
/dashboard          数据看板（统计信息）
/designer           流程设计器（拖拽设计流程）
/apply              发起申请（填表）
/instances          我的申请（查看申请列表）
/instances/:id      申请详情（查看申请进度）
/tasks              任务中心（待审批任务）
/tasks/:id          任务详情（审批）
/my-applications    我发起的申请
```

**核心组件**：
- `ProcessDesigner.vue`：流程设计器（基于 AntV X6）
- `NotificationCenter.vue`：实时通知（WebSocket）
- `VirtualList.vue`：虚拟列表（大数据量优化）

**状态管理（Pinia）**：
- `auth.ts`：用户认证状态
- `process.ts`：流程定义状态
- `instance.ts`：流程实例状态
- `notification.ts`：通知状态
- `theme.ts`：主题状态

**API 请求**：
- `src/api/index.ts`：API 接口定义
- `src/api/request.ts`：Axios 二次封装（Token 注入、错误处理、重试机制）

---

### 后端（Koa + Prisma + SQLite）

**主要 API**：
```
POST   /api/v1/auth/register              注册
POST   /api/v1/auth/login                 登录

GET    /api/v1/process-definitions       流程定义列表
POST   /api/v1/process-definitions       创建流程定义
PUT    /api/v1/process-definitions/:id   更新流程定义
POST   /api/v1/process-definitions/:id/publish  发布流程

POST   /api/v1/process-instances         发起流程
GET    /api/v1/process-instances         实例列表
GET    /api/v1/process-instances/:id     实例详情

GET    /api/v1/tasks/my-pending          我的待办任务
POST   /api/v1/tasks/:id/complete        完成任务（审批通过）
POST   /api/v1/tasks/:id/reject          拒绝任务（审批拒绝）
POST   /api/v1/tasks/:id/delegate        委派任务
```

**核心服务**：
- `auth.service.ts`：用户认证（注册、登录、密码加密）
- `process.service.ts`：流程定义管理
- `instance.service.ts`：流程实例管理
- `task.service.ts`：任务管理（分配、审批、权限检查）
- `websocket.service.ts`：实时通知

**数据库表**：
```
users                  用户表
process_definitions    流程定义表
process_instances      流程实例表
process_histories      审批历史表
tasks                  任务表
```

---

## 五、流程执行引擎（核心逻辑）

**文件**：`src/engine/index.ts`

**核心类**：`BpmEngine`

**主要方法**：

### 1. startProcess（启动流程）
```typescript
const instance = BpmEngine.startProcess(definition, businessKey, variables);
```
- 创建一个新的流程实例
- 从"开始"节点开始执行
- 自动创建第一个任务

### 2. completeTask（完成任务）
```typescript
BpmEngine.completeTask(instance, definition, task, variables, comment);
```
- 标记任务为已完成
- 计算下一个节点
- 自动创建下一个任务
- 如果到达"结束"节点，流程完成

### 3. rejectTask（拒绝任务）
```typescript
BpmEngine.rejectTask(instance, definition, task, comment);
```
- 标记任务为已拒绝
- 退回到上一个节点
- 重新创建上一个节点的任务

### 4. getNextNodes（计算后继节点）
```typescript
const nextNodeIds = BpmEngine.getNextNodes(definition, node, variables);
```
- 根据当前节点和流程变量
- 计算下一个应该执行的节点
- 支持条件判断（比如：请假天数 > 3 天走不同的路径）

---

## 六、权限控制

### 当前实现的权限

1. **认证权限**
   - 需要登录才能访问系统
   - 所有 API 都需要 JWT Token

2. **任务权限**
   - 只有被分配的审批人才能审批任务
   - 代码检查：`if (task.assignee !== userId) throw Error('无权操作')`

3. **申请人限制**（新加的）
   - 申请人不能审批自己的申请
   - 代码检查：`if (task.instance.startedBy === userId) throw Error('申请人不能审批自己的申请')`

### 缺少的权限

- ❌ 流程设计权限：任何用户都能设计流程（应该只有管理员）
- ❌ 角色权限：没有 admin/user/manager 等角色区分
- ❌ 组织架构：没有部门、岗位、上下级关系
- ❌ 按角色指定审批人：只能指定具体的人，不能指定"直属上司"或"部门经理"

---

## 七、数据流向图

```
┌─────────────────────────────────────────────────────────────┐
│                        浏览器（前端）                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ 流程设计器   │  │ 发起申请     │  │ 任务审批         │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                    │            │
│  ┌──────▼─────────────────▼────────────────────▼──────────┐ │
│  │         Pinia Store（状态管理）                        │ │
│  │  auth / process / instance / notification / theme     │ │
│  └──────┬──────────────────────────────────────────────┬──┘ │
│         │ Axios + WebSocket                            │    │
└─────────┼────────────────────────────────────────────┼─────┘
          │ HTTP :3000 / WS                            │
┌─────────▼────────────────────────────────────────────▼─────┐
│                    Koa 后端服务                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Auth Service │  │ Process Svc  │  │ Task Service     │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                    │            │
│  ┌──────▼─────────────────▼────────────────────▼──────────┐ │
│  │         BpmEngine（流程执行引擎）                      │ │
│  │  startProcess / completeTask / rejectTask             │ │
│  └──────┬──────────────────────────────────────────────┬──┘ │
│         │ Prisma ORM                                   │    │
└─────────┼────────────────────────────────────────────┼─────┘
          │ SQL                                        │
┌─────────▼────────────────────────────────────────────▼─────┐
│                    SQLite 数据库                            │
│  users / process_definitions / process_instances / tasks   │
└──────────────────────────────────────────────────────────┘
```

---

## 八、快速开始

### 启动项目

**终端 1 - 启动后端**：
```bash
cd bpm-backend
npm install
npm run dev
# 输出：Server is running on port 3000
```

**终端 2 - 启动前端**：
```bash
npm install
npm run dev
# 输出：VITE v7.3.1 ready in 123 ms
# 访问：http://localhost:5173
```

### 测试流程

1. **注册账号**：http://localhost:5173/register
   - 用户名：admin
   - 邮箱：admin@example.com
   - 密码：123456

2. **登录**：http://localhost:5173/login

3. **设计流程**：/designer
   - 拖拽节点创建流程
   - 点"发布"

4. **发起申请**：/apply
   - 选择流程
   - 填表
   - 提交

5. **审批任务**：/tasks
   - 看到待审批任务
   - 点开审批

6. **查看进度**：/instances
   - 看到申请状态

---

## 九、常见问题

### Q1：为什么我发起的申请自己也能审批？
**A**：这是权限 bug，已修复。现在申请人不能审批自己的申请。

### Q2：怎么指定审批人？
**A**：在流程设计器里，点击审批节点，在右侧配置面板里指定审批人。

### Q3：流程卡住了怎么办？
**A**：可能是审批人配置有问题。检查：
- 审批人是否存在
- 审批人是否是申请人自己
- 流程定义是否发布了

### Q4：怎么看审批历史？
**A**：在 /instances 页面，点开一个申请，可以看到完整的审批历史。

### Q5：支持并行审批吗？
**A**：代码里有支持，但前端还没实现。需要在流程设计器里添加"并行网关"节点。

---

## 十、项目文件结构

```
vue-bpm-yuan-main/
├── src/                          前端源码
│   ├── api/                      API 接口
│   │   ├── index.ts             接口定义
│   │   └── request.ts           Axios 封装
│   ├── components/               组件
│   │   ├── designer/            流程设计器
│   │   ├── layout/              布局
│   │   └── ...
│   ├── engine/                  流程引擎
│   │   ├── index.ts            核心引擎
│   │   └── approvalPath.ts      审批路径计算
│   ├── stores/                  Pinia 状态管理
│   │   ├── auth.ts
│   │   ├── process.ts
│   │   ├── instance.ts
│   │   └── ...
│   ├── views/                   页面
│   │   ├── LoginView.vue
│   │   ├── DesignerView.vue
│   │   ├── ApplyView.vue
│   │   ├── TasksView.vue
│   │   └── ...
│   ├── router/                  路由
│   │   └── index.ts
│   └── main.ts                  入口
│
├── bpm-backend/                 后端源码
│   ├── src/
│   │   ├── controllers/         控制器
│   │   ├── services/            业务逻辑
│   │   ├── middleware/          中间件
│   │   ├── routes/              路由
│   │   ├── utils/               工具函数
│   │   └── app.ts              应用入口
│   ├── prisma/                  数据库
│   │   ├── schema.prisma       数据模型
│   │   └── dev.db              SQLite 数据库文件
│   └── package.json
│
├── vite.config.ts               Vite 配置
├── package.json                 前端依赖
└── README.md                    项目说明
```

---

## 十一、下一步改进方向

1. **添加角色权限管理**
   - admin / manager / user 角色
   - 只有 admin 能设计流程

2. **添加组织架构**
   - 部门管理
   - 岗位管理
   - 上下级关系

3. **支持按角色指定审批人**
   - 按角色指定（比如"部门经理"）
   - 按部门指定（比如"销售部"）
   - 自动查找审批人

4. **完善流程设计器**
   - 支持并行网关
   - 支持条件分支
   - 支持子流程

5. **添加更多功能**
   - 流程监控和统计
   - 审批超时提醒
   - 流程版本管理
   - 流程模板库

---

**希望这份指南能帮助你快速理解项目！有任何问题随时问。**
