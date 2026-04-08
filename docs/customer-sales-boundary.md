# 客户侧 / 销售侧 / 管理侧边界

本文档用于约束 `DPTEST` 后续迭代中的信息分层，避免客户页混入销售语义、内部策略或后台标签。

## 结论

项目必须按三层边界管理：

1. 客户侧
2. 销售侧
3. 管理侧

任何字段、模块、接口、文案，在进入页面前必须先判断归属层级。

---

## 一、客户侧

客户侧页面包括但不限于：

- `client/src/pages/landing.tsx`
- `client/src/pages/home.tsx`
- `client/src/pages/quiz.tsx`
- `client/src/pages/loading.tsx`
- `client/src/pages/result.tsx`
- `client/src/pages/report.tsx`

客户侧允许展示：

- 测评结果
- 六维分数和雷达图
- 交易人格说明
- 排名/段位
- 个性化成长建议
- 学习路径
- 直播、案例、课程、工具等公开资源入口
- 登录、注册、咨询顾问、领取完整报告等 CTA

客户侧禁止展示：

- 销售标签
- 成交优先级，例如 `P0 / P1 / P2`
- 高意向/高风险/待培育等内部分类
- 跟进建议
- 开场白建议
- 异议处理建议
- 内部备注
- lead 分配状态
- 重复审核状态
- 运营导入批次
- 客户列表、销售队列、管理员统计

客户侧禁止下发到浏览器的数据：

- 内部销售策略
- 内部标签规则
- lead 分配规则
- 内部评分阈值
- 任何仅用于销售/运营跟进的数据映射

说明：

- 本次已将内部销售策略从前端移出，改为仅保留在 `server/internal-sales-strategy.ts`

---

## 二、销售侧

销售侧页面包括但不限于：

- `client/src/pages/admin-chat.tsx`
- `client/src/pages/lead-mobile.tsx`
- `client/src/pages/lead-valid.tsx`
- `client/src/pages/lead-invalid.tsx`
- `client/src/pages/lead-stats.tsx`

销售侧允许展示：

- 客户基础识别信息
- 已分配 lead 队列
- 有效/无效状态
- 跟进动作
- 内部销售标签
- 优先级
- 跟进建议
- 风险提醒
- 验证码、加好友匹配信息
- AI 辅助建议

销售侧禁止直接暴露给客户：

- 销售后台入口
- 内部跟进策略
- 顾问工作台数据
- lead 处理动作日志

销售侧数据来源主要包括：

- `/api/lead/queue`
- `/api/lead/valid`
- `/api/lead/invalid`
- `/api/lead/stats/me`
- 聊天后台相关接口
- webhook 内部通知内容

---

## 三、管理侧

管理侧页面和接口包括但不限于：

- `client/src/pages/admin.tsx`
- `client/src/pages/lead-admin.tsx`
- `client/src/pages/lead-ops-import.tsx`
- `/api/admin/*`
- `/api/lead/admin/*`
- `/api/lead/import/*`

管理侧允许展示：

- 用户标签编辑
- 线索导入预检和提交
- 批次统计
- 重复审核
- lead 规则配置
- 联系人健康检查
- 用户列表与后台统计
- 运营质量数据

管理侧禁止直接透传给客户侧：

- 管理员编辑标签
- 运营导入状态
- 重复冲突记录
- 规则配置
- 联系人健康检查结果

---

## 四、表字段边界

### 1. `users`

客户可见：

- `nickname`
- `tier`
- `loginDays`

仅内部可用：

- `phone`
- `wechatId`
- `source`
- `tags`
- `lastActiveAt`

规则：

- `users.tags` 默认视为内部字段
- 只有在明确拆出客户可理解的公开字段后，才允许映射到客户页

### 2. `quiz_results`

客户可见：

- `scores`
- `traderTypeCode`
- `avgScore`
- `rankName`
- `shareToken` 对应生成后的分享页

客户不可见：

- 原始答题明细如果没有明确展示目的，不默认暴露

### 3. `leads`

全部视为销售/管理侧数据，不属于客户侧数据模型。

尤其禁止上客户页的字段：

- `assignedSalesAgentId`
- `status`
- `isValid`
- `invalidReasonId`
- `invalidNote`
- `isSuspectedDuplicate`
- `duplicateScore`
- `duplicateReviewStatus`
- `duplicateReviewNote`

### 4. `conversations`

客户可见：

- 会话本身的聊天内容，仅限客户与当前会话上下文

内部字段：

- `assignedAgent`
- `inviteStatus`
- `invitedAt`
- `invitedBy`
- `quizSummary`

---

## 五、接口边界

### 客户接口

仅允许返回客户可理解的信息：

- `/api/me`
- `/api/quiz-result`
- `/api/report/:token`

客户接口返回体中禁止出现：

- `salesStrategy`
- `lead`
- `admin`
- `priority`
- `internalTag`
- `duplicateReview`

### 销售/管理接口

需要登录和角色隔离：

- `/api/lead/*`
- `/api/admin/*`
- `/api/admin/conversations`

规则：

- 带有 lead / admin / duplicate / import / rule 语义的接口，默认不是客户接口

---

## 六、文案边界

### 客户文案应该是

- 解释型
- 鼓励型
- 学习型
- 路径型
- 结果反馈型

例如：

- 你的核心优势
- 当前突破口
- 个性化提升路径
- 推荐学习资源
- 下一步建议

### 销售文案应该是

- 跟进型
- 判断型
- 优先级型
- 风险控制型

例如：

- 高意向
- 先培育
- 高风险
- 优先跟进
- 不建议直接成交

规则：

- 只要一段文案是在指导销售如何处理客户，就不能给客户看

---

## 七、开发规则

后续新增页面、卡片、接口时，必须先回答这三个问题：

1. 这是给谁看的
2. 这段信息是否会影响销售判断
3. 这段信息是否会让客户感到被分类、被评估、被销售

如果第 2 或第 3 个问题答案是“会”，默认不进入客户侧。

新增规则：

- 内部策略数据只放 `server/`
- 客户页禁止 import 销售策略、lead 规则、内部标签映射
- 客户接口禁止返回内部销售语义字段
- 共享 schema 不等于共享可见性，数据库字段存在不代表客户可见

---

## 八、当前建议

当前建议继续做两件事：

1. 上线后重新检查客户诊断结果页，确认“销售标签”卡片已不再出现
2. 如果该区域需要保留视觉结构，替换为客户语义模块，例如：
   - 当前阶段建议
   - 优先提升方向
   - 推荐学习动作

推荐替换，不推荐留空，但绝不允许继续使用销售语义模块占位。
