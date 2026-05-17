# BPM 项目调试过程总结

## 概述

本文档记录了项目启动和调试过程中遇到的所有问题、排查方法和解决方案。

---

## Bug 1：注册界面显示网络错误

### 问题描述
- **现象**：用户在注册页面填写信息后点击"注册"按钮，显示"网络错误"
- **错误信息**：`Network Error`
- **影响范围**：注册功能完全不可用

### 根本原因
**CORS 跨域问题**

前端（`http://localhost:5173`）直接请求后端（`http://localhost:3000`），浏览器的同源策略拦截了这个请求。

```
浏览器安全规则：
- 同源 = 协议 + 域名 + 端口 都相同
- 5173 ≠ 3000 → 跨域 → 被拦截
```

### 排查过程

#### 第 1 步：查看浏览器控制台
- 打开 F12 → Console 标签
- 看到 `Network Error` 错误
- 但没有具体的错误信息

#### 第 2 步：查看 Network 标签
- 打开 F12 → Network 标签
- 清空记录
- 点击注册按钮
- 看到请求被浏览器拦截，没有发送到服务器

#### 第 3 步：分析 Axios 配置
- 打开 `src/api/request.ts`
- 看到 `baseURL: 'http://localhost:3000/api/v1'`
- 这是**硬编码的后端地址**，浏览器会直接请求这个地址
- 导致跨域

### 解决方案

#### 方案 1：添加 Vite 代理（✅ 采用）

**修改 `vite.config.ts`**：
```typescript
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',  // 代理目标
        changeOrigin: true,                // 伪装成同源请求
      },
    },
  },
})
```

**修改 `src/api/request.ts`**：
```typescript
baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1'
// 改为相对路径，走 Vite 代理
```

**原理**：
```
浏览器 → Vite(5173) → 后端(3000)
         同源          服务器端转发
```

#### 方案 2：后端添加 CORS 头（不采用）
```typescript
app.use(cors());  // 允许所有跨域请求
```
- 缺点：安全性差，生产环境不推荐

### 学到的知识点

1. **Vite 代理的作用**
   - 开发环境下，Vite 充当"中间人"
   - 浏览器只跟 Vite 通信（同源）
   - Vite 在服务器端转发请求到后端

2. **相对路径 vs 绝对路径**
   - 相对路径 `/api/v1` → 走代理
   - 绝对路径 `http://localhost:3000/api/v1` → 直接请求，跨域

3. **CORS 的本质**
   - 浏览器的安全机制
   - 防止恶意网站盗取用户数据
   - 开发环境用代理，生产环境用同源部署

---

## Bug 2：后端端口 3000 已被占用

### 问题描述
- **现象**：启动后端时报错 `EADDRINUSE: address already in use :::3000`
- **错误信息**：
  ```
  Error: listen EADDRINUSE: address already in use :::3000
  ```
- **影响范围**：后端无法启动

### 根本原因
**端口被其他进程占用**

之前启动的后端进程没有正确关闭，仍然占用着 3000 端口。

### 排查过程

#### 第 1 步：确认错误信息
- 看到 `EADDRINUSE` 错误
- 这是 Node.js 的标准错误，表示端口被占用

#### 第 2 步：查看占用端口的进程
```bash
netstat -ano | findstr :3000
```

输出：
```
TCP    [::1]:3000    [::]:0    LISTENING    260852
```

- PID 260852 占用了 3000 端口

#### 第 3 步：杀死进程
```bash
taskkill /PID 260852 /F
```

输出：
```
成功: 已终止 PID 为 260852 的进程。
```

### 解决方案

#### 方案 1：杀死占用进程（✅ 采用）
```bash
# 查看占用进程
netstat -ano | findstr :3000

# 杀死进程
taskkill /PID <PID> /F

# 重新启动后端
npm run dev
```

#### 方案 2：改用其他端口（备选）
```bash
# 修改 .env
PORT=3001

# 修改 vite.config.ts 的代理
proxy: {
  '/api': {
    target: 'http://localhost:3001',
  },
}
```

### 学到的知识点

1. **Windows 端口查看命令**
   ```bash
   netstat -ano | findstr :PORT_NUMBER
   ```

2. **Windows 进程杀死命令**
   ```bash
   taskkill /PID <PID> /F
   ```

3. **开发技巧**
   - 开发时经常需要重启服务
   - 有时候进程没有正确关闭
   - 需要手动清理占用的端口

---

## Bug 3：WebSocket 关闭码无效

### 问题描述
- **现象**：后端启动后立即崩溃
- **错误信息**：
  ```
  TypeError: First argument must be a valid error code number
  at Sender.close (D:\...\ws\lib\sender.js:187:13)
  ```
- **影响范围**：后端无法正常运行

### 根本原因
**WebSocket 关闭码不符合规范**

在 `websocket.service.ts` 里使用了无效的关闭码：
```typescript
ws.close(401, 'Unauthorized');  // ❌ 401 不是有效的 WebSocket 关闭码
```

WebSocket 关闭码必须在 1000-4999 范围内。

### 排查过程

#### 第 1 步：查看错误堆栈
```
TypeError: First argument must be a valid error code number
  at Sender.close (D:\...\ws\lib\sender.js:187:13)
  at WebSocket.close (D:\...\ws\lib\websocket.js:316:18)
  at WebSocketServer.<anonymous> (D:\...\websocket.service.ts:53:12)
```

- 错误发生在 `websocket.service.ts` 第 53 行
- 调用了 `ws.close()` 方法

#### 第 2 步：查看 WebSocket 文档
- WebSocket 关闭码规范：1000-4999
- 1000：正常关闭
- 1001：端点离线
- 1008：策略违反（用于认证失败）
- 1011：服务器错误

#### 第 3 步：定位问题代码
```typescript
// 第 31 行
ws.close(401, 'Unauthorized');  // ❌ 错误

// 第 53 行
ws.close(401, 'Invalid token');  // ❌ 错误
```

### 解决方案

**修改 `bpm-backend/src/services/websocket.service.ts`**：

```typescript
// 第 31 行：改为 1008（策略违反）
ws.close(1008, 'Unauthorized');

// 第 53 行：改为 1008（策略违反）
ws.close(1008, 'Invalid token');
```

**WebSocket 关闭码对照表**：
| 码 | 含义 | 用途 |
|---|---|---|
| 1000 | 正常关闭 | 正常断开连接 |
| 1001 | 端点离线 | 服务器关闭 |
| 1002 | 协议错误 | 协议违反 |
| 1008 | 策略违反 | 认证失败、权限不足 |
| 1011 | 服务器错误 | 内部错误 |

### 学到的知识点

1. **WebSocket 关闭码规范**
   - 必须在 1000-4999 范围内
   - 不能使用 HTTP 状态码（401、403 等）

2. **错误堆栈追踪**
   - 从错误信息找到出错的文件和行号
   - 逐层查看调用栈

3. **第三方库的规范**
   - 使用第三方库时要了解其 API 规范
   - 不能随意使用其他协议的状态码

---

## Bug 4：登录返回 500 错误

### 问题描述
- **现象**：登录时返回 500 错误，浏览器显示"服务器错误"
- **错误信息**：`POST /api/v1/auth/login 500 (Internal Server Error)`
- **影响范围**：登录功能不可用

### 根本原因
**数据库中没有用户**

后端查询数据库时找不到用户，抛出错误"用户名或密码错误"。但这个错误没有被正确处理，导致返回 500。

### 排查过程

#### 第 1 步：查看浏览器 Network
- 打开 F12 → Network 标签
- 看到 `/api/v1/auth/login` 返回 500
- 响应体是错误信息

#### 第 2 步：查看后端日志
```
prisma:query SELECT `main`.`users`.`id`, ... FROM `main`.`users` WHERE ...
Error: Error: 用户名或密码错误
    at Object.login (D:\...\auth.service.ts:49:11)
POST /api/v1/auth/login - 500 - 437ms
```

- 后端查询了数据库
- 抛出了"用户名或密码错误"异常
- 被错误中间件捕获，返回 500

#### 第 3 步：分析错误处理
- 查看 `error.middleware.ts`
- 看到所有异常都返回 500
- 没有区分业务异常和系统异常

#### 第 4 步：确认根本原因
- 数据库中确实没有用户
- 需要先注册一个账号

### 解决方案

**注册一个账号**：
1. 访问 http://localhost:5173/register
2. 填写注册信息
3. 点击注册
4. 注册成功后用这个账号登录

**改进错误处理**（可选）：
```typescript
// 修改 error.middleware.ts
export const errorMiddleware = async (ctx: Context, next: Next) => {
  try {
    await next();
  } catch (error: any) {
    // 区分业务异常和系统异常
    if (error.message === '用户名或密码错误') {
      ctx.status = 401;
      ctx.body = {
        code: 401,
        message: error.message,
      };
    } else {
      ctx.status = 500;
      ctx.body = {
        code: 500,
        message: '服务器内部错误',
      };
    }
  }
};
```

### 学到的知识点

1. **错误排查的思路**
   - 先看浏览器错误
   - 再看后端日志
   - 最后看数据库状态

2. **业务异常 vs 系统异常**
   - 业务异常：用户不存在、密码错误（应该返回 4xx）
   - 系统异常：数据库连接失败、内存溢出（应该返回 5xx）

3. **错误处理的重要性**
   - 不同的异常应该返回不同的状态码
   - 帮助前端和用户理解问题

---

## Bug 5：申请人可以审批自己的申请

### 问题描述
- **现象**：用户发起一个申请后，自己也能在任务列表中看到这个任务，并且能审批
- **问题**：这违反了审批流程的基本原则
- **影响范围**：权限控制失效

### 根本原因
**权限检查不完整**

在 `task.service.ts` 的 `completeTask` 函数中，只检查了任务是否分配给当前用户，没有检查用户是否是申请人。

```typescript
// 只有这一个检查
if (task.assignee !== userId) {
  throw new Error('无权操作此任务');
}

// 缺少这个检查
if (task.instance.startedBy === userId) {
  throw new Error('申请人不能审批自己的申请');
}
```

### 排查过程

#### 第 1 步：发现问题
- 用户反馈：自己发起的申请自己也能审批
- 这不符合常理

#### 第 2 步：查看任务分配逻辑
- 打开 `task.service.ts` 的 `continueProcess` 函数
- 看到创建任务时：
  ```typescript
  const assignee = node.data?.assignee || instance.startedBy;
  ```
- 如果没有指定审批人，就默认分配给申请人

#### 第 3 步：查看权限检查
- 打开 `completeTask` 函数
- 只有一个权限检查：`if (task.assignee !== userId)`
- 没有检查申请人

### 解决方案

#### 方案 1：创建任务时防止（✅ 采用）
```typescript
// 防止申请人审批自己的申请
if (assignee === instance.startedBy && candidateUsers.length === 0) {
  console.warn(`警告：任务 ${node.id} 的审批人是申请人本身`);
  continue;  // 跳过这个任务
}
```

#### 方案 2：审批时防止（✅ 采用）
```typescript
// 权限检查 2：防止申请人审批自己的申请
if (task.instance.startedBy === userId) {
  throw new Error('申请人不能审批自己的申请');
}
```

### 学到的知识点

1. **权限检查的多层防护**
   - 第 1 层：创建任务时检查
   - 第 2 层：审批时检查
   - 多层防护确保安全

2. **业务规则的实现**
   - 不能只依赖前端验证
   - 后端必须严格检查
   - 防止用户绕过前端限制

3. **权限控制的完整性**
   - 检查用户身份
   - 检查用户角色
   - 检查用户与资源的关系

---

## 总结表格

| Bug | 问题 | 原因 | 解决方案 | 学到的知识 |
|---|---|---|---|---|
| 1 | 注册网络错误 | CORS 跨域 | Vite 代理 + 相对路径 | 同源策略、代理原理 |
| 2 | 端口被占用 | 进程未关闭 | 杀死进程 | 端口查看、进程管理 |
| 3 | WebSocket 崩溃 | 关闭码无效 | 改为 1008 | WebSocket 规范 |
| 4 | 登录 500 错误 | 数据库无用户 | 先注册账号 | 错误排查、错误处理 |
| 5 | 申请人能审批 | 权限检查不完整 | 多层权限检查 | 权限控制、业务规则 |

---

## 调试技巧总结

### 1. 浏览器调试
```
F12 → Console：查看 JavaScript 错误
F12 → Network：查看 HTTP 请求和响应
F12 → Application：查看 localStorage、cookies
```

### 2. 后端日志
```
npm run dev 时的终端输出
Prisma 的 SQL 查询日志
错误堆栈追踪
```

### 3. 系统命令
```bash
# Windows 查看端口
netstat -ano | findstr :PORT

# Windows 杀死进程
taskkill /PID <PID> /F

# 查看进程
tasklist | findstr node
```

### 4. 代码审查
```
查看错误堆栈，定位出错文件和行号
查看相关的业务逻辑代码
查看数据库状态
查看配置文件
```

### 5. 问题排查流程
```
1. 重现问题
2. 查看错误信息
3. 查看浏览器控制台
4. 查看后端日志
5. 查看数据库
6. 查看代码逻辑
7. 修改代码
8. 重新测试
```

---

## 预防措施

### 1. 开发环境配置
- ✅ 配置 Vite 代理
- ✅ 配置环境变量
- ✅ 配置 TypeScript 类型检查

### 2. 代码规范
- ✅ 添加类型定义
- ✅ 添加错误处理
- ✅ 添加权限检查

### 3. 测试
- ✅ 手动测试各个功能
- ✅ 测试边界情况
- ✅ 测试权限控制

### 4. 文档
- ✅ 记录 API 接口
- ✅ 记录数据库模型
- ✅ 记录配置说明

---

**通过这次调试过程，我们学到了很多关于全栈开发、错误排查和系统设计的知识。希望这份总结对你有帮助！**
