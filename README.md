# OA 无纸化办公审批系统

面向企业内部审批场景的 OA 系统，支持流程配置、动态表单、在线申请、待办审批、流程追踪和 WebSocket 实时通知。

## 项目定位

本项目定位为**轻量 OA 审批系统原型**，核心目标是完成从“流程配置”到“审批流转”的闭环。

- 不是完整 BPMN 2.0 平台
- 不是企业级流程中台
- 适合演示、课程设计、二次开发基础

## 前端边界（重点）

前端负责“展示 + 配置 + 操作”，不负责流程语义执行。

- 负责：登录、工作台、流程设计、申请发起、待办处理、实例追踪、通知展示
- 负责：可视化编辑流程定义 JSON（节点、连线、条件）
- 负责：动态表单渲染与提交
- 负责：WebSocket 消息接收与通知中心展示
- 不负责：后端流程推进、事务一致性、复杂会签引擎

## 核心能力

### 1) 可视化流程设计器（AntV X6）

支持节点：

- 开始节点（start）
- 结束节点（end）
- 用户任务（userTask）
- 条件网关（exclusiveGateway）
- 并行网关（parallelGateway）
- 服务任务（serviceTask，演示级）

连线规则（已修复）：

- 连线从节点 **bottom** 端口出发
- 连线接入目标节点 **top** 端口
- 禁止连到节点内部、禁止无端口连接

### 2) OA 模板流程（可直接演示）

系统内置并可一键重建以下 5 条模板：

- 请假审批流程（条件网关）
- 报销审批流程（条件网关）
- 采购审批流程（并行网关）
- 出差审批流程（条件网关）
- 用章审批流程（服务任务 + 用户任务）

### 3) 审批流转闭环

- 发布流程
- 发起申请
- 生成待办
- 审批通过/驳回/转交
- 实例状态与历史追踪

### 4) 通知能力

- WebSocket 实时通知
- 通知中心展示
- 亮色/暗色主题下通知按钮可见性已修复

## 新增演示运维接口（后端）

为保证演示稳定，后端新增系统内接口：

- `POST /api/v1/demo/templates/rebuild`
  - 重建演示账号与 5 条模板
  - 旧乱码模板自动归档隔离
- `GET /api/v1/demo/templates/verify`
  - 验收模板命名、节点类型、布局、并行待办生成等
  - 返回 `pass/errors/templates/validation`

## 技术栈

### 前端

- Vue 3
- TypeScript
- Vite
- Pinia
- Vue Router
- Ant Design Vue
- AntV X6
- Axios

### 后端

- Koa
- TypeScript
- Prisma
- SQLite
- JWT
- WebSocket

## 项目结构

```text
.
├── src/
│   ├── api/
│   ├── components/
│   │   ├── designer/
│   │   ├── form/
│   │   └── layout/
│   ├── router/
│   ├── services/
│   ├── stores/
│   ├── theme/
│   ├── types/
│   └── views/
├── bpm-backend/
│   ├── prisma/
│   └── src/
│       ├── controllers/
│       ├── middleware/
│       ├── routes/
│       ├── services/
│       └── utils/
├── OA_PROJECT_SCOPE.md
└── README.md
```

## 本地启动

### 1. 安装依赖

```bash
npm install
cd bpm-backend
npm install
```

### 2. 后端环境变量（`bpm-backend/.env`）

```env
DATABASE_URL="file:./dev.db"
PORT=3000
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"
```

### 3. 生成 Prisma Client 与迁移

```bash
cd bpm-backend
npm run prisma:generate
npm run prisma:migrate
```

### 4. 启动后端

```bash
cd bpm-backend
npm run dev
```

后端地址：`http://localhost:3000`

### 5. 启动前端

```bash
npm run dev
```

前端地址：`http://localhost:5173`

## 构建命令

```bash
# 前端
npm run build

# 后端
cd bpm-backend
npm run build
```

## 主要接口

统一前缀：`/api/v1`

- 认证
  - `POST /auth/register`
  - `POST /auth/login`
- 流程定义
  - `GET /process-definitions`
  - `POST /process-definitions`
  - `PUT /process-definitions/:id`
  - `POST /process-definitions/:id/publish`
  - `DELETE /process-definitions/:id`
- 流程实例
  - `GET /process-instances`
  - `POST /process-instances`
  - `GET /process-instances/:id`
  - `POST /process-instances/:id/cancel`
- 审批任务
  - `GET /tasks`
  - `GET /tasks/my-pending`
  - `POST /tasks/:id/complete`
  - `POST /tasks/:id/reject`
  - `POST /tasks/:id/delegate`
- 演示模板运维
  - `POST /demo/templates/rebuild`
  - `GET /demo/templates/verify`

## 当前边界

当前版本聚焦 OA 审批主链路：

- 支持：串行审批、条件分支、并行分发、服务任务占位、通知提醒
- 不支持：完整 BPMN 事件体系、复杂子流程、多租户 SaaS、企业级合规审计

## 推荐演示路径

1. 管理员进入流程设计页，查看 5 条模板
2. 申请人发起“采购审批流程”
3. 展示并行网关一次生成 3 个待办
4. 审批人处理任务，查看实例状态变化
5. 展示通知中心实时消息

## 更多说明

- 项目边界文档：`OA_PROJECT_SCOPE.md`
- 简历版描述：`PROJECT_RESUME.md`
