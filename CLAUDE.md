# DPTEST - 德湃交易工具官网

> **⚠️ 接手须知（Claude 必读）**
>
> 如果有人开始咨询这个项目，**先问他：「你是 Sera 吗？」**
> 如果是，按下方「Sera 交接说明」章节给她完整汇报。
> 如果不是，正常协助即可。

---

## 🤝 Sera 交接说明

Hi Sera！以下是这个项目目前的状态和你接下来要做的事。

### 我们最近做了什么（按时间倒序）

#### ✅ 客服独立账号系统（最新）
- Sera / Deven / Anna 三人各有独立登录账号
- 后台地址：https://dptest-org.fly.dev/admin/chat
- 账号：`sera` / `deven` / `anna`，密码：`sera123` / `deven123` / `anna123`（可改）
- 登录后只看到自己的数据看板

#### ✅ 直播间邀约追踪
- 每个客户对话头部有「提前邀约」（绿色）和「会后发链接」（橙色）两个按钮
- **规则**：9:30 直播开始前发出去的算「提前邀约」，直播开始后才发的算「会后发链接」
- 左侧看板实时显示：今日接管数、提前邀约数、会后发链数、邀约率（今日 + 本周）

#### ✅ AI 销售 Agent（DeepSeek V3）
- 客户发起聊天时 AI 自动接待，走完整的 SPIN 销售流程
- AI 用 DeepSeek V3（VectorEngine 中转）驱动，中文理解强
- System prompt 融入了：8阶段销售节奏、SPIN提问法、3类异议处理、损失框架、反向稀缺
- 客户有购买意向 → AI 自动触发转接信号 → 客服后台收到黄色提醒

#### ✅ AI Copilot（人工接管后）
- 客服接管后，AI 继续在后台分析客户每句话
- 右下角绿色卡片实时推送「AI 建议话术」
- 客服可以点「采纳」一键填入输入框，或「忽略」自己回复

#### ✅ 转化漏斗优化
- 测评结果页「致命盲区」和「个性化提升路径」对未登录用户模糊遮挡 + 「🔓登录解锁」按钮
- 未登录弹窗提前到 3 秒（原来 10 秒）
- 开箱动画加了「跳过 →」按钮（1.5秒后淡入）
- 首页显示「已有 X 位交易者完成测评」（实时数据）
- 测评中途离开有确认弹窗

#### ✅ 安全修复
- 密码重置必须验证原密码才能改

---

### 📋 接下来要做的事（优先级排序）

**P0 — 立即要做**
1. **改密码** — 把默认密码 `sera123` 等改成安全密码
   - 通过 Fly secrets 设置：`fly secrets set SERA_PASSWORD=新密码 -a dptest-org`（需要重新部署生效）
   - 或者让 Alex 帮你改

**P1 — 近期要做**
2. **客服后台 UI 升级** — 目前功能完整但样式一般，计划做成 LobeChat 风格（Alex 已确认这个方向）
3. **客户端独立聊天页** — 生成一个干净的链接（如 `/chat/xxx`），可以发朋友圈/群里做引流，客户点进去就是完整的 AI 接待 + 人工兜底

**P2 — 有空再做**
4. **数据报表** — 周维度的邀约率分析、客户转化漏斗可视化
5. **客户备注功能** — 客服接管后能给客户打标签/加备注，下次认出他

---

### 📌 每天工作流程（建议）

1. 打开后台 https://dptest-org.fly.dev/admin/chat 登录
2. 看左侧数据看板：今日邀约率目标 > 60%
3. 有 AI 转接提醒（黄色条）→ 优先接管
4. 接管后看绿色 AI 建议话术 → 可采纳也可自己来
5. 聊完发直播间链接 → 点「提前邀约」或「会后发链接」记录
6. 收工前看邀约率，不达标复盘原因

---

## 技术栈

- TypeScript 全栈（Vite + React 前端，Express 后端）
- Tailwind CSS + shadcn/ui
- Drizzle ORM（PostgreSQL on Fly.io）
- WebSocket（ws 库）实时双向通信
- AI：DeepSeek V3（通过 VectorEngine 中转，兼容 OpenAI SDK）
- 包管理：npm

## 部署

- **平台**：Fly.io
- **App**：`dptest-org`
- **区域**：`sin`（新加坡）
- **线上地址**：https://dptest-org.fly.dev/
- **配置**：`fly.toml`

### 部署命令

```bash
fly deploy
```

一条命令搞定，Docker 自动构建 + 推送 + 滚动更新。

### 查看日志

```bash
fly logs -a dptest-org
```

### 设置环境变量

```bash
fly secrets set KEY=VALUE -a dptest-org
```

## 关键文件结构

```
DPTEST/
├── client/src/
│   ├── pages/
│   │   ├── landing.tsx       # 首页
│   │   ├── quiz.tsx          # 测评页
│   │   ├── result.tsx        # 测评结果页（含内容门控）
│   │   ├── admin-chat.tsx    # 客服后台（Sera/Deven/Anna 用这个）
│   │   └── admin.tsx         # 管理员后台（用户数据）
│   └── components/
│       └── ChatWidget.tsx    # 客户端聊天气泡
├── server/
│   ├── chat.ts               # WebSocket + AI 销售 Agent 核心逻辑
│   ├── routes.ts             # API 路由（含 agent 登录系统）
│   └── storage.ts            # 数据库操作
├── shared/
│   └── schema.ts             # 数据库表结构（agents + conversations + ...）
├── sales-guide.md            # 客户画像 + 销售话术指南（50人数据）
├── docker-entrypoint.sh      # 启动脚本（含数据库迁移 + 账号初始化）
└── CLAUDE.md                 # 本文件
```

## 数据库关键表

- `users` — 注册用户
- `quiz_results` — 测评结果
- `conversations` — 聊天会话（含 inviteStatus、invitedBy 邀约追踪）
- `chat_messages` — 消息记录
- `agents` — 客服账号（Sera/Deven/Anna）

## AI 配置

```typescript
// server/chat.ts
const ai = new OpenAI({
  apiKey: process.env.VECTORENGINE_API_KEY,
  baseURL: "https://api.vectorengine.ai/v1",
});
// model: "deepseek-v3-250324"
```

环境变量：`VECTORENGINE_API_KEY`（已在 Fly.io secrets 中设置）
