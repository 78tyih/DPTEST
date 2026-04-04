# Lead Allocation MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `DPTEST` 内落地客资录入与分配 MVP，完成导入、去重、分配、销售标记、管理员审核和基础统计。

**Architecture:** 继续使用现有 `React + Express + Drizzle + PostgreSQL` 单体架构，在 `agents` 体系上扩展角色和客资能力。客资模块新增独立数据表、API 和页面，不改动现有测评、聊天和报告主链路。

**Tech Stack:** React 18, TypeScript, Wouter, TanStack Query, Express 5, Drizzle ORM, PostgreSQL, Docker Compose

---

## 实施前提

- 当前仓库没有现成自动化测试框架。
- MVP 第一轮以 `npm run check`、本地 Docker 联调、`curl/fetch` API smoke test 为主要验收方式。
- 如需补自动化测试，只为客资模块增加最小必要脚本，不重构全仓测试体系。

## 文件结构

### 需要修改

- `shared/schema.ts`
- `server/storage.ts`
- `server/routes.ts`
- `client/src/App.tsx`
- `client/src/pages/admin-chat.tsx`（只在需要复用 agent 入口时小改）
- `docker-entrypoint.sh`
- `docker-compose.yaml`
- `LOCAL_DEPLOY.md`

### 需要新增

- `client/src/pages/lead-mobile.tsx`
- `client/src/pages/lead-valid.tsx`
- `client/src/pages/lead-invalid.tsx`
- `client/src/pages/lead-stats.tsx`
- `client/src/pages/lead-ops-import.tsx`
- `client/src/pages/lead-admin.tsx`
- `client/src/components/lead/LeadCard.tsx`
- `client/src/components/lead/InvalidReasonSheet.tsx`
- `client/src/components/lead/ModeToggle.tsx`
- `client/src/components/lead/LeadQueueHeader.tsx`
- `client/src/lib/lead.ts`
- `script/test-lead-api.ts`

---

### Task 1: 扩展数据模型

**Files:**
- Modify: `shared/schema.ts`
- Modify: `docker-entrypoint.sh`
- Test: `npm run check`

- [ ] **Step 1: 在 `agents` 表上补充 lead 模块字段**

新增字段：
- `role`
- `leadEnabled`
- `leadAllocationWeight`
- `leadDailyQuota`
- `leadPreferredMode`
- `updatedAt`

- [ ] **Step 2: 新增 lead 模块数据表**

在 `shared/schema.ts` 中添加：
- `leadSources`
- `leadInvalidReasons`
- `leadImportBatches`
- `leads`
- `leadAssignments`
- `leadActions`
- `leadDuplicateReviews`

- [ ] **Step 3: 为新表补充类型和插入 schema**

至少补：
- `Lead`
- `LeadImportBatch`
- `LeadAction`
- `LeadInvalidReason`

- [ ] **Step 4: 更新本地初始化逻辑**

在 `docker-entrypoint.sh` 中补：
- 新字段兼容初始化
- 默认来源平台种子
- 默认无效原因种子

- [ ] **Step 5: 运行类型检查**

Run: `cd /Users/a1234/DPTEST && npm run check`  
Expected: `TypeScript` 无报错

- [ ] **Step 6: Commit**

```bash
git add shared/schema.ts docker-entrypoint.sh
git commit -m "feat: add lead module schema"
```

---

### Task 2: 扩展 storage 层

**Files:**
- Modify: `server/storage.ts`
- Test: `npm run check`

- [ ] **Step 1: 扩展 `IStorage` 接口**

新增方法分类：
- 导入批次
- 强重复检测
- 弱重复检测
- 客资创建
- 分配队列
- 销售标记
- 管理员审核
- 聚合统计

- [ ] **Step 2: 实现强重复检测**

规则：
- `phone` 完全相同
- `enterpriseWechatLink` 完全相同

返回：
- 是否命中
- 命中的历史 lead id

- [ ] **Step 3: 实现弱重复检测**

第一轮简单规则：
- `wechatName` 相同
- `customerScreenshotUrl` 非空时允许挂上疑似标记，不做图像识别

- [ ] **Step 4: 实现批次写入与 lead 创建**

要求：
- 可记录每次导入结果
- 可为疑似重复 lead 写入冻结状态

- [ ] **Step 5: 实现加权分配**

依据：
- `agents.role = sales`
- `leadEnabled = true`
- `leadAllocationWeight`
- `leadDailyQuota`

- [ ] **Step 6: 实现销售标记和统计**

新增方法：
- `getLeadQueueForSales`
- `markLeadValid`
- `markLeadInvalid`
- `getValidLeadsForSales`
- `getInvalidLeadsForSales`
- `getSalesLeadStats`

- [ ] **Step 7: 实现管理员审核**

新增方法：
- `getPendingDuplicateReviews`
- `reviewDuplicateLead`

- [ ] **Step 8: 运行类型检查**

Run: `cd /Users/a1234/DPTEST && npm run check`  
Expected: 无类型错误

- [ ] **Step 9: Commit**

```bash
git add server/storage.ts
git commit -m "feat: add lead storage operations"
```

---

### Task 3: 增加 lead 模块 API

**Files:**
- Modify: `server/routes.ts`
- Create: `script/test-lead-api.ts`
- Test: `script/test-lead-api.ts`

- [ ] **Step 1: 添加 lead 权限辅助函数**

新增中间件：
- `requireLeadOperator`
- `requireLeadSales`
- `requireLeadAdmin`

说明：
- 基于现有 agent session
- 从 `agentId` 读取角色，而不是只靠 `agentName`

- [ ] **Step 2: 实现导入 API**

新增：
- `POST /api/lead/import/preview`
- `POST /api/lead/import/commit`
- `GET /api/lead/import/batches`

第一轮输入方式：
- 先接受 JSON 数组，不直接做腾讯文档抓取
- 后续再接“腾讯文档导出内容粘贴/上传”

- [ ] **Step 3: 实现销售 API**

新增：
- `GET /api/lead/queue`
- `POST /api/lead/:id/mark-valid`
- `POST /api/lead/:id/mark-invalid`
- `GET /api/lead/valid`
- `GET /api/lead/invalid`
- `GET /api/lead/stats/me`

- [ ] **Step 4: 实现管理员 API**

新增：
- `GET /api/lead/admin/overview`
- `GET /api/lead/admin/duplicates`
- `POST /api/lead/admin/duplicates/:id/review`
- `GET /api/lead/admin/stats`

- [ ] **Step 5: 写一个最小 smoke 脚本**

在 `script/test-lead-api.ts` 中验证：
- 登录 agent
- 导入一批 leads
- 获取销售队列
- 标记有效/无效

- [ ] **Step 6: 运行 smoke test**

Run:
```bash
cd /Users/a1234/DPTEST
tsx script/test-lead-api.ts
```

Expected:
- 返回 200
- 能看到导入和标记结果

- [ ] **Step 7: Commit**

```bash
git add server/routes.ts script/test-lead-api.ts
git commit -m "feat: add lead module api"
```

---

### Task 4: 接销售端手机页面

**Files:**
- Create: `client/src/pages/lead-mobile.tsx`
- Create: `client/src/pages/lead-valid.tsx`
- Create: `client/src/pages/lead-invalid.tsx`
- Create: `client/src/pages/lead-stats.tsx`
- Create: `client/src/components/lead/LeadCard.tsx`
- Create: `client/src/components/lead/InvalidReasonSheet.tsx`
- Create: `client/src/components/lead/ModeToggle.tsx`
- Create: `client/src/components/lead/LeadQueueHeader.tsx`
- Create: `client/src/lib/lead.ts`
- Modify: `client/src/App.tsx`
- Test: 手机浏览器手动验证

- [ ] **Step 1: 建立 lead API 客户端**

在 `client/src/lib/lead.ts` 中封装：
- 获取队列
- 标记有效
- 标记无效
- 获取有效列表
- 获取无效列表
- 获取我的统计

- [ ] **Step 2: 实现 `LeadCard`**

卡片展示：
- 来源平台
- 录入时间
- 录入运营
- 手机号
- 微信名
- 截图占位

- [ ] **Step 3: 实现按钮模式**

按钮：
- `已加好友`
- `未加好友`
- `查看详情`

- [ ] **Step 4: 实现无效原因面板**

`InvalidReasonSheet` 负责：
- 展示无效原因列表
- 必填原因
- 支持 `其他` 备注

- [ ] **Step 5: 实现模式切换**

`ModeToggle` 负责：
- 按钮模式
- 滑动模式
- 读取并保存偏好

第一轮滑动实现要求：
- 右滑有效
- 左滑无效
- 不做复杂动画优化

- [ ] **Step 6: 新增四个页面**

- `/lead/mobile`
- `/lead/valid`
- `/lead/invalid`
- `/lead/stats`

- [ ] **Step 7: 在 `App.tsx` 挂路由**

要求：
- 不破坏现有业务路由
- 与 `admin-chat` 并存

- [ ] **Step 8: 本地手机手动验证**

验证项：
- 队列能加载
- 标记后卡片移出
- 有效/无效列表可见
- 统计页数据变化正确

- [ ] **Step 9: Commit**

```bash
git add client/src/App.tsx client/src/pages client/src/components/lead client/src/lib/lead.ts
git commit -m "feat: add lead sales mobile pages"
```

---

### Task 5: 接运营导入页

**Files:**
- Create: `client/src/pages/lead-ops-import.tsx`
- Modify: `client/src/App.tsx`
- Test: 浏览器手动验证

- [ ] **Step 1: 实现导入输入方式**

第一轮支持：
- 粘贴 JSON
- 或 textarea 粘贴结构化数据

暂不做：
- 腾讯文档自动抓取

- [ ] **Step 2: 实现预检结果区**

显示：
- 新增数
- 强重复拦截数
- 弱重复数
- 失败数

- [ ] **Step 3: 实现正式导入**

点击确认后调用 `commit` API，生成导入批次。

- [ ] **Step 4: 挂运营路由**

新增：
- `/lead/ops/import`

- [ ] **Step 5: 手动验证**

验证：
- 一批样本中强重复被拦截
- 弱重复进入冻结态
- 正常 lead 进入待分配

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/lead-ops-import.tsx client/src/App.tsx
git commit -m "feat: add lead operator import page"
```

---

### Task 6: 接管理员页

**Files:**
- Create: `client/src/pages/lead-admin.tsx`
- Modify: `client/src/App.tsx`
- Test: 浏览器手动验证

- [ ] **Step 1: 实现疑似重复审核区**

操作：
- `保留`
- `合并`
- `作废`

- [ ] **Step 2: 实现统计概览**

展示：
- 总导入
- 待处理
- 有效
- 无效
- 各来源平台分布
- 各销售有效率

- [ ] **Step 3: 实现分配规则区**

允许管理员调整：
- 销售启停
- 权重
- 日配额

- [ ] **Step 4: 挂管理员路由**

新增：
- `/lead/admin`

- [ ] **Step 5: 手动验证**

验证：
- 审核后 lead 状态正确变化
- 审核通过后 lead 可进入销售池
- 权重和开关修改后影响后续分配

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/lead-admin.tsx client/src/App.tsx
git commit -m "feat: add lead admin page"
```

---

### Task 7: 本地部署与初始化

**Files:**
- Modify: `docker-compose.yaml`
- Modify: `LOCAL_DEPLOY.md`
- Test: Docker 本地启动

- [ ] **Step 1: 增加 lead 模块环境变量**

新增：
- `LEAD_MODULE_ENABLED`
- `LEAD_UPLOAD_DIR`

- [ ] **Step 2: 更新本地部署文档**

补充：
- lead 模块开关
- 导入样例
- 首次初始化说明

- [ ] **Step 3: 本地重建**

Run:
```bash
cd /Users/a1234/DPTEST
docker compose up -d --build
```

Expected:
- `db` healthy
- `app` started

- [ ] **Step 4: Smoke 验证**

验证：
- `http://localhost:5000/lead/mobile`
- `http://localhost:5000/lead/ops/import`
- `http://localhost:5000/lead/admin`

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yaml LOCAL_DEPLOY.md
git commit -m "chore: update local deploy for lead module"
```

---

### Task 8: 试运行与验收

**Files:**
- Modify: `docs/superpowers/specs/2026-04-04-lead-allocation-mvp-design.md`
- Test: 真实样本演练

- [ ] **Step 1: 准备试跑样本**

准备三类数据：
- 正常 lead
- 强重复 lead
- 弱重复 lead

- [ ] **Step 2: 运营试跑**

至少 1 位运营执行：
- 导入
- 查看结果

- [ ] **Step 3: 销售试跑**

至少 2 位销售执行：
- 标记有效
- 标记无效
- 查看统计

- [ ] **Step 4: 记录问题清单**

至少记录：
- 误触
- 文案歧义
- 无效原因缺项
- 队列切换体验

- [ ] **Step 5: 更新 spec**

把试跑后确认的口径回写到 spec。

- [ ] **Step 6: Commit**

```bash
git add docs/superpowers/specs/2026-04-04-lead-allocation-mvp-design.md
git commit -m "docs: refine lead module spec after pilot"
```

---

## 推荐执行顺序

1. Task 1
2. Task 2
3. Task 3
4. Task 4
5. Task 5
6. Task 6
7. Task 7
8. Task 8

## 预计节奏

- 第 1-2 天：Task 1-3
- 第 3-5 天：Task 4-6
- 第 6 天：Task 7
- 第 7 天：Task 8

## 当前开工点

如果现在直接开始实施，第一步就是：

- 扩展 `shared/schema.ts`
- 扩展 `docker-entrypoint.sh`
- 让 `agents` 和 lead 相关表先落库

