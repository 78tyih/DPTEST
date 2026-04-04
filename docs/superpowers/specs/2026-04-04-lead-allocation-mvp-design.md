# 客资录入与分配系统 MVP 设计

日期：2026-04-04

项目：`DPTEST`

## 1. 目标

在现有 `DPTEST` 项目内新增一个“客资录入与分配”子系统，先解决以下问题：

- 运营继续使用腾讯文档录入客资，但同步后进入本地主库统一管理
- 销售在手机端快速标记 `已加好友 / 未加好友`
- 系统自动统计有效数、无效数、无效原因，不再要求销售每周手工汇总
- 为后续接入 `DB test`、客服 Agent 协同、完整 CRM 打数据底座

## 2. 范围

### 2.1 MVP 包含

- 腾讯文档手动同步导入
- 强重复拦截
- 弱重复提醒并允许强行录入
- 疑似重复冻结，等待管理员审核
- 自动分配给销售
- 销售端按钮模式与滑动模式
- 销售标记 `有效 / 无效`
- 无效原因结构化记录
- 运营同步结果查看
- 管理员重复审核、分配规则、统计看板

### 2.2 MVP 不包含

- 发资料、做问卷、进直播间、咨询课程、有意向等跟进动作
- DB test 画像接入
- 客服 Agent 协同工作台
- 成交、复购、课程 CRM

## 3. 核心业务规则

- 有效客资定义：销售确认 `已成功加上好友`
- 无效客资定义：未加上好友，且必须选择无效原因
- 强重复：`手机号` 或 `企微引流链接` 完全一致，禁止录入
- 弱重复：`微信名`、`截图` 相似，提示疑似重复，允许强行录入
- 强行录入后的疑似重复客资先冻结，不进入销售池
- 管理员审核通过后，疑似重复客资才允许分配
- 销售处理完成后，卡片从主队列移出
- 销售端支持两种操作模式：
  - 按钮模式
  - 滑动模式

## 4. 在 DPTEST 中的落地原则

本项目不新开仓库、不新建独立服务，直接扩展现有 `DPTEST` 单体应用。

复用现有基础设施：

- 前端路由：`client/src/App.tsx`
- 后端路由：`server/routes.ts`
- 数据访问层：`server/storage.ts`
- 数据模型：`shared/schema.ts`
- 本地部署：`LOCAL_DEPLOY.md` 与 `docker-compose.yaml`
- 认证与 session：现有 `/api/agent/*` 内部账号体系

推荐方案：

- 复用现有 `agents` 作为内部账号基础
- 在 `agents` 上补充客资模块所需字段，而不是新建第二套内部账号表
- 客资模块新增独立数据表，不改动测评、聊天、结果页主业务链

这样做的原因：

- 最短路径可以在两周内跑出可用 MVP
- 不引入第二套后台认证体系
- 后续接客服 Agent、运营、销售协同不会割裂

## 5. 数据模型

### 5.1 扩展现有表

#### `agents`

新增字段：

- `role`：`admin` / `operator` / `sales`
- `lead_enabled`
- `lead_allocation_weight`
- `lead_daily_quota`
- `lead_preferred_mode`：`button` / `swipe`
- `updated_at`

说明：

- 现有 `sera / deven / anna` 继续沿用
- 后续运营账号如 `xiaoming / andy / yuanyuan` 也走同一套内部账号体系

### 5.2 新增表

#### `lead_sources`

来源平台字典：

- `zhihu`
- `xiaohongshu`
- `bilibili`
- `douyin`
- `other`

字段：

- `id`
- `code`
- `name`
- `sort_order`
- `is_active`

#### `lead_invalid_reasons`

无效原因字典：

- 搜不到
- 已被其他销售添加
- 已是学员/重复添加
- 账号异常
- 拒绝添加
- 信息错误
- 无回应
- 其他

字段：

- `id`
- `code`
- `name`
- `sort_order`
- `is_active`

#### `lead_import_batches`

记录每次运营导入批次。

字段：

- `id`
- `operator_agent_id`
- `source_type`
- `source_ref`
- `status`
- `total_count`
- `inserted_count`
- `strong_duplicate_blocked_count`
- `weak_duplicate_flagged_count`
- `failed_count`
- `started_at`
- `finished_at`

#### `leads`

客资主表。

字段：

- `id`
- `import_batch_id`
- `source_platform_id`
- `source_activity`
- `operator_agent_id`
- `phone`
- `wechat_id`
- `wechat_name`
- `wechat_avatar_url`
- `enterprise_wechat_link`
- `qr_code_image_url`
- `customer_screenshot_url`
- `assigned_sales_agent_id`
- `assigned_at`
- `status`
- `is_valid`
- `invalid_reason_id`
- `invalid_note`
- `is_suspected_duplicate`
- `duplicate_score`
- `duplicate_review_status`
- `duplicate_reviewed_by`
- `duplicate_reviewed_at`
- `duplicate_review_note`
- `sync_at`
- `created_at`
- `updated_at`

索引：

- `phone`
- `enterprise_wechat_link`
- `assigned_sales_agent_id + status`
- `source_platform_id + created_at`

#### `lead_assignments`

记录每次分配。

字段：

- `id`
- `lead_id`
- `sales_agent_id`
- `rule_type`
- `rule_snapshot`
- `assigned_at`

#### `lead_actions`

记录销售动作。

字段：

- `id`
- `lead_id`
- `sales_agent_id`
- `action_type`
- `action_value`
- `meta_json`
- `created_at`

MVP 动作类型：

- `mark_valid`
- `mark_invalid`
- `set_invalid_reason`
- `undo_last_action`

#### `lead_duplicate_reviews`

记录管理员审核结果。

字段：

- `id`
- `lead_id`
- `review_result`：`keep` / `merge` / `void`
- `suspected_target_lead_id`
- `reviewed_by`
- `review_note`
- `created_at`

## 6. 状态机

### 6.1 lead 状态

- `pending_sync`
- `pending_assignment`
- `pending_sales_action`
- `valid`
- `invalid`
- `suspected_duplicate_pending_review`
- `void`

### 6.2 重复审核状态

- `not_needed`
- `pending`
- `approved_keep`
- `approved_merge`
- `approved_void`

### 6.3 状态流转

1. 运营导入前数据在腾讯文档内，不入库
2. 运营点击同步，系统校验并写入批次
3. 强重复直接拦截，不写入 `leads`
4. 弱重复写入 `leads`，状态为 `suspected_duplicate_pending_review`
5. 正常客资进入 `pending_assignment`
6. 分配后进入 `pending_sales_action`
7. 销售点 `已加好友` 后进入 `valid`
8. 销售点 `未加好友` 并选原因后进入 `invalid`
9. 管理员可将疑似重复审核为 `keep / merge / void`

## 7. 路由与页面落点

### 7.1 前端页面

新增以下页面：

- `client/src/pages/lead-mobile.tsx`
- `client/src/pages/lead-valid.tsx`
- `client/src/pages/lead-invalid.tsx`
- `client/src/pages/lead-stats.tsx`
- `client/src/pages/lead-ops-import.tsx`
- `client/src/pages/lead-admin.tsx`

在 `client/src/App.tsx` 新增路由：

- `/lead/mobile`
- `/lead/valid`
- `/lead/invalid`
- `/lead/stats`
- `/lead/ops/import`
- `/lead/admin`

### 7.2 后端 API

在 `server/routes.ts` 新增 lead 模块路由：

- `POST /api/lead/import/preview`
- `POST /api/lead/import/commit`
- `GET /api/lead/import/batches`
- `GET /api/lead/queue`
- `POST /api/lead/:id/mark-valid`
- `POST /api/lead/:id/mark-invalid`
- `GET /api/lead/valid`
- `GET /api/lead/invalid`
- `GET /api/lead/stats/me`
- `GET /api/lead/admin/overview`
- `GET /api/lead/admin/duplicates`
- `POST /api/lead/admin/duplicates/:id/review`
- `GET /api/lead/admin/rules`
- `POST /api/lead/admin/rules`
- `GET /api/lead/admin/stats`

### 7.3 数据访问层

在 `server/storage.ts` 新增 lead 领域方法：

- 导入批次创建与查询
- 强重复检测
- 弱重复检测
- 客资写入
- 自动分配
- 销售待处理队列
- 有效/无效标记
- 统计聚合
- 重复审核

## 8. 交互设计

### 8.1 销售端

默认入口：`/lead/mobile`

展示：

- 来源平台
- 录入时间
- 录入运营
- 手机号
- 微信名
- 引流链接标识
- 截图缩略图

操作：

- `已加好友`
- `未加好友`
- `查看详情`
- `跳过`
- `撤销上一步`

模式切换：

- 按钮模式
- 滑动模式

滑动定义：

- 右滑：`已加好友`
- 左滑：`未加好友`
- 上滑：`查看详情`

### 8.2 运营端

入口：`/lead/ops/import`

功能：

- 导入预检
- 导入提交
- 查看本次导入结果
- 查看各平台导入量

### 8.3 管理员端

入口：`/lead/admin`

功能：

- 客资总览
- 疑似重复审核
- 销售权重与配额
- 各平台/各销售统计
- 操作日志

## 9. 本地部署方案

MVP 优先本地部署运行，沿用现有 Docker 方式。

### 9.1 运行方式

- 使用现有 `docker-compose.yaml`
- 继续使用 PostgreSQL，不引入 SQLite
- 通过新增环境变量控制 lead 模块开关与上传目录

建议新增环境变量：

- `LEAD_MODULE_ENABLED=true`
- `LEAD_UPLOAD_DIR=/app/uploads/leads`

### 9.2 文件存储

MVP 阶段可使用本地磁盘存储：

- 客户截图
- 二维码截图

但实现上应抽象一层 storage adapter，为后续切云存储保留接口。

## 10. 非目标与技术边界

- 不在 MVP 内接腾讯文档 API 自动轮询
- 不在 MVP 内做 OCR 识别与截图向量比对
- 不在 MVP 内重做现有聊天后台
- 不在 MVP 内合并到完整 CRM 模块

## 11. 验收标准

- 运营能完成一次导入并看到导入结果
- 强重复会被拦截
- 弱重复会进入审核池，不进入销售池
- 销售手机端能完成有效/无效标记
- 无效原因可统计
- 管理员能审核疑似重复
- 看板能看到按销售和来源平台聚合的数据

## 12. 实施顺序

### 第一阶段：数据库与后端基础

- 扩展 `agents`
- 新增 lead 模块数据表
- 完成导入、去重、分配、标记、统计 API

### 第二阶段：销售端 H5

- 待处理队列
- 有效列表
- 无效列表
- 我的统计
- 按钮/滑动模式切换

### 第三阶段：运营与管理员后台

- 导入页
- 审核页
- 统计页
- 规则页

### 第四阶段：联调与试运行

- 试导入真实样本
- 验证统计口径
- 修正误触、文案和边界条件

## 13. 第一轮 To Do

- 确认使用 `DPTEST` 作为主工程
- 确认内部账号沿用 `agents`
- 确认 lead 模块页面路由
- 设计并落地数据库迁移
- 补充 lead 模块 storage 方法
- 新增 lead API
- 新增销售端页面
- 新增运营导入页
- 新增管理员审核页
- 完成本地联调
- 选 1 位运营 + 2 位销售试跑

