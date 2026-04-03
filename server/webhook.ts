const WEBHOOK_URL = process.env.WECHAT_WEBHOOK_URL || "";

const recentSubmits = new Map<string, number>();

function canSubmit(phone: string): boolean {
  if (recentSubmits.has(phone) && Date.now() - recentSubmits.get(phone)! < 300000) {
    return false;
  }
  recentSubmits.set(phone, Date.now());
  return true;
}

interface RegisterPayload {
  phone: string;
  wechatName?: string;
}

export async function sendRegistrationNotification({ phone, wechatName }: RegisterPayload): Promise<{ success: boolean; skipped?: boolean }> {
  if (!canSubmit(phone)) {
    return { success: true, skipped: true };
  }

  const content = [
    `## 📋 新用户测评通知`,
    ``,
    `> 有新用户完成了交易能力测评，正在查看结果`,
    ``,
    `**微信昵称：** ${wechatName || '未授权'}`,
    `**手机号：** <font color="warning">${phone}</font>`,
    `**状态：** 正在查看部分结果，尚未领取完整报告`,
    ``,
    `---`,
    `⏳ 如果该用户点击"领取完整报告"，你将收到完整画像和跟进策略`,
  ].join('\n');

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ msgtype: "markdown", markdown: { content } }),
    });
    const data = await res.json();
    console.log("Registration webhook sent:", data);
    return { success: true };
  } catch (err) {
    console.error("Failed to send registration webhook:", err);
    return { success: true };
  }
}

export async function sendContactAlertNotification({ name, url }: { name: string; url: string }): Promise<{ success: boolean }> {
  const content = [
    `## ⚠️ 企业微信顾问异常告警`,
    ``,
    `> 以下顾问的企业微信链接检测异常，可能无法正常添加`,
    ``,
    `**顾问名称：** <font color="warning">${name}</font>`,
    `**链接：** ${url}`,
    `**检测时间：** ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`,
    ``,
    `---`,
    `💡 请检查该顾问的企业微信状态，必要时在管理后台禁用该顾问`,
  ].join('\n');

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ msgtype: "markdown", markdown: { content } }),
    });
    const data = await res.json();
    console.log("Contact alert webhook sent:", data);
    return { success: true };
  } catch (err) {
    console.error("Failed to send contact alert webhook:", err);
    return { success: false };
  }
}

interface ResultWebhookPayload {
  phone: string;
  wechatName?: string;
  scores: Record<string, number>;
  traderType: { code: string; name: string; emoji: string };
  rank: { name: string; emoji: string };
  avgScore: number;
  salesStrategy: {
    attitude: string;
    opening: string;
    avoid: string;
    keyHook: string;
  };
  reportUrl?: string;
  verifyCode?: string;
}

interface OrderflowResultWebhookPayload {
  phone: string;
  wechatName?: string;
  selectedTrack: "starter" | "deep";
  scoreBand: {
    title: string;
    track: "starter" | "deep";
    summary: string;
    min?: number;
    max?: number;
  };
  dimensionScores: Record<string, number>;
  segmentTags: Array<{
    label: string;
    priority: "P0" | "P1" | "P2" | "P3";
    salesAction: string;
  }>;
  unlockRewards: Array<{
    title: string;
    description: string;
  }>;
  recommendedAction: string;
  recommendedPath: string;
  reportUrl?: string;
  verifyCode?: string;
}

const dimNames: Record<string, string> = {
  RISK: '风险管理',
  MENTAL: '交易心理',
  SYSTEM: '系统思维',
  ADAPT: '市场适应',
  EXEC: '执行力',
  EDGE: '认知格局',
  awareness: '订单流认知',
  'market-fit': '市场适配',
  'risk-control': '风控成熟度',
  execution: '执行训练度',
  'tool-readiness': '工具准备度',
  'commercial-intent': '服务意向',
};

function isOrderflowResultPayload(payload: ResultWebhookPayload | OrderflowResultWebhookPayload): payload is OrderflowResultWebhookPayload {
  return "selectedTrack" in payload;
}

async function sendLegacyResultNotification(payload: ResultWebhookPayload): Promise<{ success: boolean }> {
  const scoreEntries = Object.entries(payload.scores).sort((a, b) => b[1] - a[1]);

  const scoreLines = scoreEntries.map(([dim, score], i) => {
    const filled = Math.round(score / 10);
    const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
    const label = i === 0 ? ' 🔥最强' : (i === scoreEntries.length - 1 ? ' ⬆️突破口' : '');
    return `${dimNames[dim] || dim}　${bar} **${score}**${label}`;
  }).join('\n');

  const weakestDim = dimNames[scoreEntries[scoreEntries.length - 1][0]] || scoreEntries[scoreEntries.length - 1][0];
  const strongestDim = dimNames[scoreEntries[0][0]] || scoreEntries[0][0];

  const content = [
    `## 🎯 完整客户画像 — 请立即跟进`,
    ``,
    `### 👤 客户信息`,
    `**微信昵称：** ${payload.wechatName || '未授权'}`,
    `**手机号：** <font color="warning">${payload.phone}</font>`,
    ...(payload.verifyCode ? [
      `**身份验证码：** <font color="warning">${payload.verifyCode}</font>`,
      `> 用户添加好友后会发送此验证码，请留意匹配`,
    ] : []),
    ``,
    `### 📊 测评结果`,
    `**段位：** ${payload.rank.emoji} ${payload.rank.name}（综合 **${payload.avgScore}**/100）`,
    `**类型：** ${payload.traderType.emoji} ${payload.traderType.name}`,
    ``,
    `### 🕸️ 六维能力`,
    scoreLines,
    ``,
    `### 🎯 销售跟进策略`,
    `**沟通态度：** <font color="warning">${payload.salesStrategy.attitude}</font>`,
    ``,
    `**开场白参考：**`,
    `> ${payload.salesStrategy.opening}`,
    ``,
    `**注意避免：** ${payload.salesStrategy.avoid}`,
    ``,
    `**核心钩子：** <font color="info">${payload.salesStrategy.keyHook}</font>`,
    ``,
    `---`,
    `💡 **快速判断：** 该客户最强维度「${strongestDim}」，最弱维度「${weakestDim}」。从「${weakestDim}」切入沟通，用「${strongestDim}」给予肯定。`,
    ...(payload.reportUrl ? [
      ``,
      `📎 **完整报告链接（发给客户）：** [点击查看完整报告](${payload.reportUrl})`,
    ] : []),
  ].join('\n');

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ msgtype: "markdown", markdown: { content } }),
    });
    const data = await res.json();
    console.log("Result webhook sent:", data);
    return { success: true };
  } catch (err) {
    console.error("Failed to send result webhook:", err);
    return { success: true };
  }
}

async function sendOrderflowDiagnosticNotification(payload: OrderflowResultWebhookPayload): Promise<{ success: boolean }> {
  const scoreEntries = Object.entries(payload.dimensionScores).sort((a, b) => b[1] - a[1]);
  const scoreLines = scoreEntries.map(([dim, score], index) => {
    const filled = Math.round(score / 10);
    const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
    const label = index === 0 ? ' 🔥最强' : (index === scoreEntries.length - 1 ? ' ⬆️补强位' : '');
    return `${dimNames[dim] || dim}　${bar} **${score}**${label}`;
  }).join('\n');

  const segmentLines = payload.segmentTags.length > 0
    ? payload.segmentTags.map((tag) => `- <font color="info">${tag.priority}</font> ${tag.label}：${tag.salesAction}`).join('\n')
    : '- 暂无明确标签，先进入直播培育链路';

  const rewardLines = payload.unlockRewards.map((reward) => `- ${reward.title}：${reward.description}`).join('\n');
  const trackLabel = payload.selectedTrack === "starter" ? "浅度测评" : "深度测评";

  const content = [
    `## 🎯 订单流诊断报告 — 请按标签跟进`,
    ``,
    `### 👤 客户信息`,
    `**微信昵称：** ${payload.wechatName || '未授权'}`,
    `**手机号：** <font color="warning">${payload.phone}</font>`,
    ...(payload.verifyCode ? [
      `**身份验证码：** <font color="warning">${payload.verifyCode}</font>`,
      `> 用户添加好友后会发送此验证码，请留意匹配`,
    ] : []),
    ``,
    `### 🧭 诊断结果`,
    `**测评轨道：** ${trackLabel}`,
    `**结果分层：** <font color="info">${payload.scoreBand.title}</font>`,
    `**推荐路径：** ${payload.recommendedPath}`,
    `**建议动作：** ${payload.recommendedAction}`,
    ``,
    `### 🕸️ 六维得分`,
    scoreLines,
    ``,
    `### 🏷️ 销售标签`,
    segmentLines,
    ``,
    `### 🎁 已解锁资料`,
    rewardLines,
    ``,
    `---`,
    `💡 **备注：** ${payload.scoreBand.summary}`,
    ...(payload.reportUrl ? [
      ``,
      `📎 **完整报告链接（发给客户）：** [点击查看完整报告](${payload.reportUrl})`,
    ] : []),
  ].join('\n');

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ msgtype: "markdown", markdown: { content } }),
    });
    await res.json();
    return { success: true };
  } catch (err) {
    console.error("Failed to send orderflow result webhook:", err);
    return { success: true };
  }
}

export async function sendResultNotification(payload: ResultWebhookPayload | OrderflowResultWebhookPayload): Promise<{ success: boolean }> {
  if (isOrderflowResultPayload(payload)) {
    return sendOrderflowDiagnosticNotification(payload);
  }

  return sendLegacyResultNotification(payload);
}
