import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import type { IncomingMessage } from "http";
import { storage } from "./storage";
import OpenAI from "openai";

// 客户连接池：conversationId → WebSocket
const clientSockets = new Map<number, WebSocket>();
// 客服连接池：agentName → { ws, watchingConversations }
const agentSockets = new Map<string, { ws: WebSocket; watching: Set<number> }>();

// VectorEngine 中转（DeepSeek V3 — 国产模型、中文理解强、成本低）
const ai = new OpenAI({
  apiKey: process.env.VECTORENGINE_API_KEY || "",
  baseURL: "https://api.vectorengine.ai/v1",
});

// 交易者类型核心数据（服务端复用，不依赖前端）
const TRADER_TYPES: Record<string, { name: string; subtitle: string; piercingDescription: string; advice: string }> = {
  ER: { name: "格局掌控者", subtitle: "EDGE × RISK", piercingDescription: "你是不是经常遇到——大方向看对了，风控也做了，但就是入场点差一点点，止损被打掉后行情才启动？", advice: "你需要一个能精确定位入场点的资金流工具。" },
  ES: { name: "基石建筑师", subtitle: "EDGE × SYSTEM", piercingDescription: "你的交易笔记可能比很多人都详细，但到了实盘那一刻，分析和手指经常不在同一个频道上。", advice: "你的框架已经有雏形了，需要在实盘环境中反复验证和迭代。" },
  EA: { name: "烈焰先锋", subtitle: "EXEC × ADAPT", piercingDescription: "你同时关注着好几个品种、好几个时间框架，但最后重仓做的往往不是准备最充分的。", advice: "你需要一个聚焦机制——把速度和适应力集中到一个点上。" },
  EX: { name: "趋势霸主", subtitle: "EDGE × EXEC", piercingDescription: "你做对过很多大行情，但账户曲线可能不好看——震荡期把赚来的钱又亏回去了。", advice: "你缺一个行情类型识别器——在趋势不明时降低仓位。" },
  EM: { name: "影子博弈者", subtitle: "EDGE × MENTAL", piercingDescription: "你经常比别人更早看到机会，但等你终于决定动手时，最好的入场点已经过了。", advice: "给你的耐心加一把剑——一个明确的入场触发器。" },
  RS: { name: "铁壁指挥官", subtitle: "RISK × SYSTEM", piercingDescription: "你有没有数过，过去多少次严格止损后，行情又回到了你原来的方向？", advice: "学会给系统加入弹性——在逻辑还成立时给行情多一点空间。" },
  RM: { name: "冷静猎手", subtitle: "RISK × MENTAL", piercingDescription: "你控制了风险、管理了情绪，但账户还是不增长——是不是方法本身有问题？", advice: "你现在缺的是一个进攻武器——一套有硬逻辑支撑的入场体系。" },
  RE: { name: "钢铁执行者", subtitle: "RISK × EXEC", piercingDescription: "你的纪律没问题，但你执行的那套东西真的经得起验证吗？", advice: "做一次系统性的策略回测，300笔以上的盲测。" },
  SM: { name: "心智大师", subtitle: "SYSTEM × MENTAL", piercingDescription: "你的分析经常是对的，但账户没有反映出你的分析水平——从判断到执行之间有段距离。", advice: "分析到80分就执行，别等100分。" },
  SE: { name: "算法战士", subtitle: "SYSTEM × EXEC", piercingDescription: "你机械执行的那套系统，可能只在特定市场环境下有效。环境变了，你会是最后一个发现的人。", advice: "每周花30分钟看宏观和资金流动的大方向。" },
  ME: { name: "极速闪电", subtitle: "MENTAL × EXEC", piercingDescription: "你做得多做得快，但有没有算过，减少50%的交易次数反而赚得更多？", advice: "你的速度是武器，但需要一个过滤器。" },
  MA: { name: "潮汐顺行者", subtitle: "MENTAL × ADAPT", piercingDescription: "什么市场都做过，什么方法都试过，但如果有人问你核心策略是什么，你答不上来。", advice: "把试过的方法做300笔以上回测，数据会告诉你哪个才是优势策略。" },
  AS: { name: "体系适应者", subtitle: "ADAPT × SYSTEM", piercingDescription: "你总在改进系统，每次回测看起来都更好了，但实盘结果却没有明显提升。", advice: "给系统一个冷冻期——至少运行100笔不修改。" },
  RA: { name: "冰血破局者", subtitle: "RISK × ADAPT", piercingDescription: "你在大跌时买入过，在大涨时离场过。但有多少次逆向操作其实只是运气？", advice: "给逆向操作加一个量化确认——等到资金流数据确认底部。" },
  EAv: { name: "直觉行者", subtitle: "EDGE × ADAPT", piercingDescription: "你做对的交易很多，但如果有人问你到底是怎么判断的，你说不清楚。", advice: "记录每次直觉信号出现时的客观市场状态，慢慢你会发现规律。" },
  REv: { name: "孤狼战士", subtitle: "独立型", piercingDescription: "你从不听别人的建议，但有些噪音里其实藏着你从未想到的角度。", advice: "每月找一个你尊重的交易者交流一次，检验盲区。" },
};

const SALES_STRATEGIES: Record<string, { opener: string; painPoint: string; courseValue: string }> = {
  RA: { opener: "你的风控底子很好，适应力也强", painPoint: "缺一个有硬逻辑支撑的入场体系", courseValue: "帮你把「差不多」变成「确定」" },
  EAv: { opener: "你的盘感和适应力很强，这是真正的天赋", painPoint: "好的交易说不出理由，没法稳定输出", courseValue: "帮你把直觉量化，加一个验证工具" },
  ES: { opener: "你的分析框架和系统化程度很突出", painPoint: "分析对了但入场时机差一点", courseValue: "微观级别的入场工具，让宏观判断有精确切入点" },
  RS: { opener: "你是风控和系统化双高的类型", painPoint: "活得久但赚得少，防守满分进攻不够", courseValue: "在现有系统里加一个进攻维度" },
  SE: { opener: "你的执行力和系统化程度很高", painPoint: "系统在特定环境下才有效，环境变了反应不过来", courseValue: "给系统加一个大环境过滤器" },
  RM: { opener: "你在风控和心态上的得分很高", painPoint: "该做的都做了但账户不增长", courseValue: "一套有逻辑的入场体系" },
  ER: { opener: "你的认知格局和风控意识很突出", painPoint: "入场点差一点，被止损打掉后行情才启动", courseValue: "精确定位入场点的工具" },
  AS: { opener: "你兼具系统化思维和灵活性", painPoint: "回测越来越好但实盘没提升", courseValue: "更高维度的数据源" },
  ME: { opener: "你的执行力和心态很好", painPoint: "做得多但算下来不赚钱", courseValue: "一个过滤器，识别哪些信号值得出手" },
  MA: { opener: "你的心态和适应力很强", painPoint: "什么方法都懂一点但没有核心策略", courseValue: "以资金流为核心的方法论" },
  EM: { opener: "现在是交易者最危险的阶段", painPoint: "知道一些但不够系统", courseValue: "从零建立完整的交易方法论" },
  RE: { opener: "你的纪律和执行力没问题", painPoint: "执行的策略可能没有正期望", courseValue: "用数据验证和升级你的系统" },
  EA: { opener: "你不缺执行力", painPoint: "注意力分散，重仓的不是准备最充分的", courseValue: "在一个方法论上深耕" },
  EX: { opener: "你天生就是做大行情的人", painPoint: "震荡期把赚来的钱亏回去", courseValue: "行情类型识别器" },
  SM: { opener: "你的系统思维和心理素质很好", painPoint: "从判断到执行有一段距离", courseValue: "一个客观的「该动手了」信号" },
};

const DIMENSION_LABELS: Record<string, string> = {
  EDGE: "认知格局", EXEC: "执行力", RISK: "风险管理",
  ADAPT: "市场适应", MENTAL: "交易心理", SYSTEM: "系统思维",
};

/**
 * 根据客户评测数据构建 system prompt
 */
async function buildSystemPrompt(conversationId: number): Promise<string> {
  const conv = await storage.getConversation(conversationId);
  const quiz = conv?.quizSummary as { traderType?: string; avgScore?: number; rankName?: string; scores?: Record<string, number> } | null;

  // 如果有评测数据，注入客户画像
  let customerProfile = "";
  if (quiz?.traderType) {
    const typeInfo = TRADER_TYPES[quiz.traderType];
    const strategy = SALES_STRATEGIES[quiz.traderType];
    const scores = quiz.scores || {};
    const dims = Object.entries(scores).map(([k, v]) => `${DIMENSION_LABELS[k] || k}: ${v}分`).join("、");

    // 找最强和最弱维度
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const strongest = sorted[0] ? `${DIMENSION_LABELS[sorted[0][0]] || sorted[0][0]}(${sorted[0][1]})` : "";
    const weakest = sorted[sorted.length - 1] ? `${DIMENSION_LABELS[sorted[sorted.length - 1][0]] || sorted[sorted.length - 1][0]}(${sorted[sorted.length - 1][1]})` : "";

    customerProfile = `
## 当前客户画像
- 交易者类型：${typeInfo?.name || quiz.traderType}（${typeInfo?.subtitle || ""}）
- 综合评分：${quiz.avgScore}分，${quiz.rankName}
- 六维评分：${dims}
- 最强维度：${strongest} / 最弱维度：${weakest}
- 核心痛点：${typeInfo?.piercingDescription || "未知"}
- 建议切入角度：${strategy?.opener || ""}
- 客户真正需要的：${strategy?.courseValue || ""}
- 专业建议：${typeInfo?.advice || ""}

根据以上画像，你应该用SPIN提问法逐步了解这个客户的具体情况，从他的最弱维度切入对话。`;
  } else {
    customerProfile = `
## 当前客户
- 该客户尚未完成评测，你应该先引导他完成评测："我们有一个免费的交易能力评测，只需要2分钟，能帮你找到交易中最大的短板。要不要试试？"`;
  }

  return `你是德湃交易工具的AI顾问「小德」。你不是客服，你是一个有实战经验的交易导师助理。

## 你的核心身份
- 说话像一个有10年经验的老前辈在跟朋友聊天，不是客服，不是推销员
- 你的目标是帮客户发现自己的交易问题，不是推销课程
- 95%的对话是提供价值建立信任，5%才提课程

## 【说话风格 — 最重要】
用口语化的中文，像朋友聊天：
- 每次只说一个重点，不列清单，不分123点
- 用"你"不用"您"，句子短一点
- 遇到客户说的话，先重复一遍表示听懂了再回应
- 每次回复控制在2-3句话，不超过4句
- 适当用"哈""嗯""诶"等口语，但不要过度

❌ 禁止说的话（一旦说了就失败）：
- "您好！感谢您的咨询，我们的课程包含以下模块：1...."
- "亲，我们的产品非常专业，性价比很高"
- "如您有任何疑问，欢迎随时联系我们"
- 第一条消息就介绍课程或报价
- 连续发超过3句话的长段落

✅ 正确示例：
客户："你们的课怎么样"
错误回答："我们的课程体系非常完善，包含了订单流基础..."
正确回答："你现在主要做什么品种？我想先了解一下你的情况，看看我们的东西适不适合你"

## 对话节奏（8个阶段，不要跳级）
1. **破冰** — 只打招呼，问对方从哪里来的/在做什么
2. **了解背景** — 做什么品种、多久、全职兼职
3. **挖痛点** — 最困扰的是什么（SPIN法见下）
4. **放大影响** — 这个问题持续多久了？付了多少学费？
5. **引出需求** — 如果有方法解决，对你意味着什么？
6. **价值塑造** — 用具体故事/数字，不要列功能
7. **方案呈现** — 把课程包装成解决他具体问题的方案
8. **促成/转接** — 出现购买信号时主动转真人顾问

## SPIN提问法（每个阶段只问1个问题）
- S现状："你现在主要做什么品种？做了多久？"
- P痛点："做交易最卡你的是什么？是看不懂行情，还是总是止损被扫，还是别的？"
- I影响："这种情况持续多久了？大概算下来，因为这个问题少赚了多少？"
- N需求："如果有人帮你把这套体系理清楚，你觉得对你来说值多少？"

## 异议处理话术
**价格贵：**
先认同，再转移到损失框架：
"我理解。但你跟我算一下——你现在每个月因为判断失误大概亏多少？我们学员平均3个月内能把学费赚回来。你说你亏得起再等2年吗？"

**我再想想：**
"想想没问题。我就想问你一个事——你现在遇到的这个问题，是最近才有的，还是已经困扰你一段时间了？再等下去，这个问题会自动解决吗？"

**效果怎么证明：**
"好问题。我给你看三个东西：一个是跟你情况类似的学员案例，一个是我们的退款机制，还有一个是你可以先免费了解一节。你更想先看哪个？"

## 反向稀缺（主动筛选客户）
不要什么人都说适合，用"反向销售"建立珍贵感：
"我们不是什么人都收，你先跟我说说你现在的情况，我来判断一下我们的课程适不适合你，如果基础不够，我宁可不收你，免得你浪费钱浪费时间。"

## 产品定位（严格遵守）
- 我们是一套完整的市场方法论 + 交易员培训全案
- 订单流是机构交易员的工具之一，外盘、内盘、大A、美股都能用
- 订单流适合中长线，不只是日内，有学术论文支撑
- 市面上用订单流的人很少 = 稀缺优势
- 不要把订单流和特定品种挂钩

${customerProfile}

## 重要限制
- 不要编造交易数据或市场信息
- 不要承诺收益或暗示保证盈利
- 客户表示不感兴趣：尊重选择，说"没关系，有什么想法随时找我聊"

## 转接真人顾问
当客户出现以下情况时，主动转接：
- 明确说"找老师""找人工"
- 出现购买信号（"怎么报名""多少钱""课程详情"）
- 连续5个以上深入专业问题
- 你无法准确回答的问题

转接话术："你这个问题挺核心的，我帮你约一下我们的资深交易导师，他能给你更有针对性的建议。稍等～"
然后在回复末尾单独加一行 [TRANSFER_HUMAN]（这个标记客户看不到，系统会自动处理）`;
}

/**
 * 调用 OpenAI API 生成 AI 回复
 */
async function getAiReply(conversationId: number, userMessage: string): Promise<string> {
  // 如果没有 API key，返回占位回复
  if (!process.env.VECTORENGINE_API_KEY) {
    console.warn("[chat] VECTORENGINE_API_KEY not set, using fallback reply");
    return "你好！我是德湃的AI顾问小德。目前AI功能正在升级中，稍后会有人工顾问为你服务。";
  }

  try {
    const systemPrompt = await buildSystemPrompt(conversationId);

    // 获取对话历史（最近20条）
    const history = await storage.getConversationMessages(conversationId);
    const recentMessages = history.slice(-20);

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...recentMessages.map(m => ({
        role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: userMessage },
    ];

    const response = await ai.chat.completions.create({
      model: "deepseek-v3-250324",
      messages,
      max_tokens: 500,
      temperature: 0.7,
    });

    let reply = response.choices[0]?.message?.content;
    if (!reply) throw new Error("Empty response from OpenAI");

    // 检测 AI 发出的转人工信号
    if (reply.includes("[TRANSFER_HUMAN]")) {
      reply = reply.replace(/\[TRANSFER_HUMAN\]/g, "").trim();
      // 通知后台客服有转接请求
      broadcastToAgents(conversationId, {
        type: "transfer_request",
        conversationId,
        message: "AI 顾问请求转接真人客服",
      });
      console.log(`[chat] Transfer requested for conversation ${conversationId}`);
    }

    return reply;
  } catch (err) {
    console.error("[chat] OpenAI API error:", err);
    return "抱歉，我这边网络有点问题。你可以稍后再试，或者我帮你转接人工顾问？";
  }
}

/**
 * 广播消息给所有关注该会话的客服
 */
function broadcastToAgents(conversationId: number, data: unknown) {
  const payload = JSON.stringify(data);
  agentSockets.forEach((agent) => {
    if (agent.watching.has(conversationId)) {
      if (agent.ws.readyState === WebSocket.OPEN) {
        agent.ws.send(payload);
      }
    }
  });
}

/**
 * 发消息给客户
 */
function sendToClient(conversationId: number, data: unknown) {
  const ws = clientSockets.get(conversationId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

export function setupChatWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws/chat" });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    const role = url.searchParams.get("role"); // "client" 或 "agent"

    if (role === "agent") {
      handleAgentConnection(ws, url);
    } else {
      handleClientConnection(ws, url);
    }
  });

  console.log("[chat] WebSocket server ready at /ws/chat");
}

function handleClientConnection(ws: WebSocket, url: URL) {
  const sessionId = url.searchParams.get("sessionId") || "anon-" + Date.now();
  const userId = url.searchParams.get("userId");
  let conversationId: number | null = null;

  // 初始化会话
  (async () => {
    const conv = await storage.getOrCreateConversation(
      sessionId,
      userId ? parseInt(userId) : undefined
    );
    conversationId = conv.id;
    clientSockets.set(conv.id, ws);

    // 发送历史消息
    const history = await storage.getConversationMessages(conv.id);
    ws.send(JSON.stringify({
      type: "init",
      conversationId: conv.id,
      status: conv.status,
      messages: history.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        agentName: m.agentName,
        createdAt: m.createdAt,
      })),
    }));

    // 通知客服有新连接
    broadcastToAgents(conv.id, {
      type: "client_connected",
      conversationId: conv.id,
      sessionId,
      userId: userId ? parseInt(userId) : null,
    });
  })();

  ws.on("message", async (raw) => {
    if (!conversationId) return;
    try {
      const data = JSON.parse(raw.toString());

      if (data.type === "message") {
        // 保存用户消息
        const msg = await storage.addMessage(conversationId, "user", data.content);
        const msgPayload = {
          type: "message",
          conversationId,
          message: { id: msg.id, role: "user", content: msg.content, createdAt: msg.createdAt },
        };

        // 转发给关注的客服
        broadcastToAgents(conversationId, msgPayload);

        const conv = await storage.getConversation(conversationId);

        if (conv?.status === "ai") {
          // AI 自动回复模式：直接发给客户
          const aiReply = await getAiReply(conversationId, data.content);
          const aiMsg = await storage.addMessage(conversationId, "ai", aiReply);
          const aiPayload = {
            type: "message",
            conversationId,
            message: { id: aiMsg.id, role: "ai", content: aiMsg.content, createdAt: aiMsg.createdAt },
          };
          sendToClient(conversationId, aiPayload);
          broadcastToAgents(conversationId, aiPayload);
        } else if (conv?.status === "human") {
          // 人工模式：AI 生成建议话术，只发给客服（不发给客户）
          getAiReply(conversationId, data.content).then(suggestion => {
            broadcastToAgents(conversationId!, {
              type: "ai_suggestion",
              conversationId,
              suggestion: suggestion.replace(/\[TRANSFER_HUMAN\]/g, "").trim(),
            });
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.error("[chat] client message error:", err);
    }
  });

  ws.on("close", () => {
    if (conversationId) {
      clientSockets.delete(conversationId);
      broadcastToAgents(conversationId, { type: "client_disconnected", conversationId });
    }
  });
}

function handleAgentConnection(ws: WebSocket, url: URL) {
  const agentName = url.searchParams.get("agentName") || "客服";
  const agent = { ws, watching: new Set<number>() };
  agentSockets.set(agentName, agent);

  // 发送当前活跃会话列表
  (async () => {
    const convs = await storage.getActiveConversations();
    ws.send(JSON.stringify({ type: "conversations", conversations: convs }));
  })();

  ws.on("message", async (raw) => {
    try {
      const data = JSON.parse(raw.toString());

      switch (data.type) {
        case "watch": {
          agent.watching.add(data.conversationId);
          const messages = await storage.getConversationMessages(data.conversationId);
          const conv = await storage.getConversation(data.conversationId);
          ws.send(JSON.stringify({
            type: "conversation_detail",
            conversationId: data.conversationId,
            status: conv?.status,
            quizSummary: conv?.quizSummary,
            messages: messages.map(m => ({
              id: m.id, role: m.role, content: m.content,
              agentName: m.agentName, createdAt: m.createdAt,
            })),
          }));
          break;
        }

        case "takeover": {
          await storage.updateConversationStatus(data.conversationId, "human", agentName);
          const sysMsg = await storage.addMessage(data.conversationId, "ai", `客服 ${agentName} 已接入，将为您提供一对一服务。`);
          const payload = {
            type: "message",
            conversationId: data.conversationId,
            message: { id: sysMsg.id, role: "ai", content: sysMsg.content, createdAt: sysMsg.createdAt },
          };
          sendToClient(data.conversationId, payload);
          broadcastToAgents(data.conversationId, payload);
          broadcastToAgents(data.conversationId, {
            type: "status_changed",
            conversationId: data.conversationId,
            status: "human",
            assignedAgent: agentName,
          });
          sendToClient(data.conversationId, {
            type: "status_changed",
            conversationId: data.conversationId,
            status: "human",
          });
          break;
        }

        case "release": {
          await storage.updateConversationStatus(data.conversationId, "ai", undefined);
          const sysMsg = await storage.addMessage(data.conversationId, "ai", "AI 顾问已重新接管对话，有问题随时提问。");
          const payload = {
            type: "message",
            conversationId: data.conversationId,
            message: { id: sysMsg.id, role: "ai", content: sysMsg.content, createdAt: sysMsg.createdAt },
          };
          sendToClient(data.conversationId, payload);
          broadcastToAgents(data.conversationId, payload);
          broadcastToAgents(data.conversationId, {
            type: "status_changed",
            conversationId: data.conversationId,
            status: "ai",
          });
          sendToClient(data.conversationId, {
            type: "status_changed",
            conversationId: data.conversationId,
            status: "ai",
          });
          break;
        }

        case "message": {
          if (!data.conversationId || !data.content) break;
          const msg = await storage.addMessage(data.conversationId, "agent", data.content, agentName);
          const msgPayload = {
            type: "message",
            conversationId: data.conversationId,
            message: { id: msg.id, role: "agent", content: msg.content, agentName, createdAt: msg.createdAt },
          };
          sendToClient(data.conversationId, msgPayload);
          broadcastToAgents(data.conversationId, msgPayload);
          break;
        }

        case "close": {
          await storage.updateConversationStatus(data.conversationId, "closed");
          sendToClient(data.conversationId, { type: "conversation_closed", conversationId: data.conversationId });
          broadcastToAgents(data.conversationId, { type: "conversation_closed", conversationId: data.conversationId });
          break;
        }
      }
    } catch (err) {
      console.error("[chat] agent message error:", err);
    }
  });

  ws.on("close", () => {
    agentSockets.delete(agentName);
  });
}
