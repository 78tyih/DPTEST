import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, loginSchema, insertEventSchema, insertSalesContactSchema } from "@shared/schema";
import { sendRegistrationNotification, sendResultNotification, sendContactAlertNotification } from "./webhook";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool, db } from "./db";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getAdminStats, getExternalStats } from "./stats";

let salesCounter = 0;

const contactHealthCache: Map<string, { alive: boolean; checkedAt: number }> = new Map();
const HEALTH_CACHE_TTL = 5 * 60 * 1000;
const HEALTH_MONITOR_INTERVAL = 30 * 60 * 1000;

const BLOCKED_KEYWORDS = [
  "已停用", "无法访问", "已暂停", "异常", "已失效",
  "不存在", "已离职", "已过期", "已关闭", "无法添加",
  "帐号已", "账号已", "联系方式已", "页面不存在",
  "系统错误", "请求失败", "暂时无法",
];
const HEALTHY_KEYWORD = "添加我为微信好友";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

async function checkContactAlive(url: string, skipCache = false): Promise<boolean> {
  if (!skipCache) {
    const cached = contactHealthCache.get(url);
    if (cached && Date.now() - cached.checkedAt < HEALTH_CACHE_TTL) {
      return cached.alive;
    }
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.38" },
    });
    clearTimeout(timeout);
    const text = await res.text();
    const hasBlockedKeyword = BLOCKED_KEYWORDS.some(kw => text.includes(kw));
    const hasHealthyKeyword = text.includes(HEALTHY_KEYWORD);
    const alive = res.status < 400 && !hasBlockedKeyword && hasHealthyKeyword;
    contactHealthCache.set(url, { alive, checkedAt: Date.now() });
    const reason = hasBlockedKeyword ? "BLOCKED_KEYWORD" : !hasHealthyKeyword ? "MISSING_HEALTHY_KEYWORD" : "OK";
    console.log(`[wechat-health] ${url} → ${alive ? "OK" : "DEAD"} (status=${res.status}, reason=${reason})`);
    return alive;
  } catch (err) {
    contactHealthCache.set(url, { alive: false, checkedAt: Date.now() });
    console.log(`[wechat-health] ${url} → ERROR (${(err as Error).message})`);
    return false;
  }
}

async function getAliveContacts(): Promise<{ contacts: { name: string; url: string }[]; allDead: boolean }> {
  const allContacts = await storage.getEnabledSalesContacts();
  if (allContacts.length === 0) {
    return { contacts: [{ name: "Deven", url: "https://work.weixin.qq.com/ca/cawcde66939ac2ab81" }], allDead: true };
  }
  const results = await Promise.all(
    allContacts.map(async (c) => ({
      ...c,
      alive: await checkContactAlive(c.url),
    }))
  );
  const alive = results.filter(r => r.alive);
  if (alive.length > 0) return { contacts: alive, allDead: false };
  return { contacts: [allContacts[0]], allDead: true };
}

function requireAdmin(req: any, res: any, next: any) {
  if (!(req.session as any).isAdmin) {
    return res.status(401).json({ message: "未授权" });
  }
  next();
}

function requireAgent(req: any, res: any, next: any) {
  if (!(req.session as any).agentName) {
    return res.status(401).json({ message: "未登录" });
  }
  next();
}

async function runHealthMonitor() {
  console.log("[health-monitor] Running scheduled health check...");
  try {
    const contacts = await storage.getEnabledSalesContacts();
    for (const contact of contacts) {
      const alive = await checkContactAlive(contact.url, true);
      const newStatus = alive ? "ok" : "dead";
      const oldStatus = contact.lastHealthStatus;
      await storage.updateContactHealth(contact.id, newStatus);
      if (oldStatus === "ok" && newStatus === "dead") {
        console.log(`[health-monitor] ALERT: ${contact.name} went from OK to DEAD`);
        sendContactAlertNotification({ name: contact.name, url: contact.url }).catch(console.error);
      }
    }
    console.log(`[health-monitor] Checked ${contacts.length} contacts`);
  } catch (err) {
    console.error("[health-monitor] Error:", err);
  }
}

const DEFAULT_CONTACTS = [
  { name: "默认顾问", url: "https://work.weixin.qq.com/ca/cawcde75d99eb3fce4" },
  { name: "Deven", url: "https://work.weixin.qq.com/ca/cawcde66939ac2ab81" },
  { name: "Anna", url: "https://work.weixin.qq.com/ca/cawcde2d7a8f8a7ac3" },
];

async function seedDefaultContacts() {
  try {
    const existing = await storage.getAllSalesContacts();
    if (existing.length === 0) {
      console.log("[seed] No sales contacts found, inserting defaults...");
      for (const c of DEFAULT_CONTACTS) {
        await storage.createSalesContact(c);
      }
      console.log(`[seed] Inserted ${DEFAULT_CONTACTS.length} default contacts`);
    }
  } catch (err) {
    console.error("[seed] Error seeding contacts:", err);
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const PgStore = connectPgSimple(session);

  app.use(
    session({
      store: new PgStore({ pool }),
      secret: process.env.SESSION_SECRET || "survey-session-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      },
    })
  );

  app.post("/api/register", async (req, res) => {
    try {
      const parsed = insertUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }

      const existing = await storage.getUserByPhone(parsed.data.phone);
      if (existing) {
        return res.status(409).json({ message: "该手机号已注册" });
      }

      const hashedPassword = await bcrypt.hash(parsed.data.password, 10);
      const user = await storage.createUser({ ...parsed.data, password: hashedPassword });
      (req.session as any).userId = user.id;
      if (req.body.rememberMe !== false) {
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
      }

      storage.trackEvent({
        userId: user.id,
        sessionId: req.body.sessionId || "server",
        eventType: "user_register",
        eventData: { phone: user.phone, source: req.body.source },
      });

      if (req.body.source) {
        storage.updateUserProfile(user.id, { source: req.body.source });
      }

      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "注册失败，请重试" });
        }
        res.json({ id: user.id, phone: user.phone });
      });
    } catch (err) {
      console.error("Register error:", err);
      res.status(500).json({ message: "注册失败，请稍后重试" });
    }
  });

  app.post("/api/login", async (req, res) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }

      const user = await storage.getUserByPhone(parsed.data.phone);
      if (!user) {
        return res.status(401).json({ message: "手机号或密码错误" });
      }

      const validPassword = await bcrypt.compare(parsed.data.password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "手机号或密码错误" });
      }

      (req.session as any).userId = user.id;
      if (req.body.rememberMe) {
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
      }

      storage.trackEvent({
        userId: user.id,
        sessionId: req.body.sessionId || "server",
        eventType: "user_login",
      });

      const loginResult = await storage.trackDailyLogin(user.id);

      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "登录失败，请重试" });
        }
        res.json({
          id: user.id,
          phone: user.phone,
          tier: loginResult.newTier,
          loginDays: loginResult.loginDays,
          tierChanged: loginResult.tierChanged,
        });
      });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ message: "登录失败，请稍后重试" });
    }
  });

  app.post("/api/reset-password", async (req, res) => {
    try {
      const { phone, oldPassword, newPassword } = req.body;
      if (!phone || !newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: "请输入手机号和新密码（至少6位）" });
      }

      const user = await storage.getUserByPhone(phone);
      if (!user) {
        // 不泄露用户是否存在
        return res.status(400).json({ message: "手机号或原密码错误" });
      }

      // 必须验证原密码
      if (!oldPassword) {
        return res.status(400).json({ message: "请输入原密码" });
      }
      const valid = await bcrypt.compare(oldPassword, user.password);
      if (!valid) {
        return res.status(400).json({ message: "原密码错误" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUserPassword(user.id, hashedPassword);

      res.json({ ok: true });
    } catch (err) {
      console.error("Reset password error:", err);
      res.status(500).json({ message: "重置失败，请稍后重试" });
    }
  });

  // 公开接口：用户总数（社会证明）
  app.get("/api/public-stats", async (_req, res) => {
    try {
      const stats = await storage.getPublicStats();
      res.json(stats);
    } catch { res.json({ totalUsers: 0 }); }
  });

  app.get("/api/me", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "未登录" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "用户不存在" });
      }

      const loginResult = await storage.trackDailyLogin(userId);
      const quizResult = await storage.getLatestQuizResult(userId);

      res.json({
        id: user.id,
        phone: user.phone,
        tier: loginResult.newTier,
        loginDays: loginResult.loginDays,
        tierChanged: loginResult.tierChanged,
        hasQuizResult: !!quizResult,
        traderTypeCode: quizResult?.traderTypeCode || null,
        avgScore: quizResult?.avgScore || null,
        rankName: quizResult?.rankName || null,
        quizCompletedAt: quizResult?.createdAt || null,
      });
    } catch (err) {
      console.error("Get user error:", err);
      res.status(500).json({ message: "获取用户信息失败" });
    }
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  });

  app.post("/api/quiz-result", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "未登录" });
      }

      const { answers, scores, traderTypeCode, avgScore, rankName } = req.body;

      if (!Array.isArray(answers) || answers.length !== 12) {
        return res.status(400).json({ message: "answers 必须是12个选项的数组" });
      }
      if (!scores || typeof scores !== 'object') {
        return res.status(400).json({ message: "scores 必须是对象" });
      }
      if (typeof traderTypeCode !== 'string' || traderTypeCode.length < 2) {
        return res.status(400).json({ message: "traderTypeCode 无效" });
      }
      if (typeof avgScore !== 'number' || avgScore < 0 || avgScore > 100) {
        return res.status(400).json({ message: "avgScore 必须是0-100的数字" });
      }
      if (typeof rankName !== 'string' || rankName.length < 1) {
        return res.status(400).json({ message: "rankName 无效" });
      }

      const existing = await storage.getLatestQuizResult(userId);
      if (existing && existing.traderTypeCode === traderTypeCode && existing.avgScore === avgScore) {
        const createdAt = new Date(existing.createdAt!).getTime();
        if (Date.now() - createdAt < 60000) {
          return res.json({ success: true, id: existing.id, shareToken: existing.shareToken });
        }
      }

      const result = await storage.saveQuizResult(userId, {
        answers,
        scores,
        traderTypeCode,
        avgScore,
        rankName,
      });

      storage.trackEvent({
        userId,
        sessionId: req.body.sessionId || "server",
        eventType: "quiz_complete",
        eventData: { traderTypeCode, avgScore, rankName },
      });

      res.json({ success: true, id: result.id, shareToken: result.shareToken });
    } catch (err) {
      console.error("Save quiz result error:", err);
      res.status(500).json({ message: "保存测评结果失败" });
    }
  });

  app.get("/api/quiz-result", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "未登录" });
      }

      const result = await storage.getLatestQuizResult(userId);
      res.json(result || null);
    } catch (err) {
      console.error("Get quiz result error:", err);
      res.status(500).json({ message: "获取测评结果失败" });
    }
  });

  app.get("/api/quiz-results/history", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "未登录" });
      }

      const results = await storage.getAllQuizResults(userId);
      res.json(results);
    } catch (err) {
      console.error("Get quiz history error:", err);
      res.status(500).json({ message: "获取测评历史失败" });
    }
  });

  app.get("/api/report/:token", async (req, res) => {
    try {
      const { token } = req.params;
      if (!token || token.length < 8) {
        return res.status(400).json({ message: "无效的报告链接" });
      }

      const result = await storage.getQuizResultByToken(token);
      if (!result) {
        return res.status(404).json({ message: "报告不存在或链接已失效" });
      }

      const sessionId = (req.query.sid as string) || "server";
      storage.trackEvent({
        userId: result.userId,
        sessionId,
        eventType: "report_view",
        eventData: { token, traderTypeCode: result.traderTypeCode },
      });

      const user = await storage.getUser(result.userId);
      res.json({
        scores: result.scores,
        traderTypeCode: result.traderTypeCode,
        avgScore: result.avgScore,
        rankName: result.rankName,
        createdAt: result.createdAt,
        tier: user?.tier ?? 0,
      });
    } catch (err) {
      console.error("Get report error:", err);
      res.status(500).json({ message: "获取报告失败" });
    }
  });

  app.post("/api/events", async (req, res) => {
    try {
      const parsed = insertEventSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid event data" });
      }

      const userId = parsed.data.userId || (req.session as any)?.userId || undefined;

      storage.trackEvent({
        userId,
        sessionId: parsed.data.sessionId,
        eventType: parsed.data.eventType,
        eventData: parsed.data.eventData as Record<string, unknown>,
      });

      res.json({ ok: true });
    } catch (err) {
      console.error("Track event error:", err);
      res.json({ ok: true });
    }
  });

  app.patch("/api/user/profile", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "未登录" });
      }

      const { nickname, wechatId, source, tags } = req.body;
      await storage.updateUserProfile(userId, {
        nickname,
        wechatId,
        source,
        tags,
        lastActiveAt: new Date(),
      });

      res.json({ ok: true });
    } catch (err) {
      console.error("Update profile error:", err);
      res.status(500).json({ message: "更新失败" });
    }
  });

  app.post("/api/webhook/register", async (req, res) => {
    try {
      const { phone, wechatName } = req.body;
      if (!phone) {
        return res.status(400).json({ message: "缺少手机号" });
      }
      const result = await sendRegistrationNotification({ phone, wechatName });
      res.json({ success: true, skipped: result.skipped });
    } catch (err) {
      console.error("Register webhook error:", err);
      res.json({ success: true, webhookError: true });
    }
  });

  app.post("/api/webhook/result", async (req, res) => {
    try {
      const { phone, wechatName, scores, traderType, rank, avgScore, salesStrategy, verifyCode } = req.body;
      if (!phone || !traderType) {
        return res.status(400).json({ message: "缺少必要字段" });
      }

      const userId = (req.session as any)?.userId;
      let reportUrl: string | undefined;
      if (userId) {
        const quizResult = await storage.getLatestQuizResult(userId);
        if (quizResult?.shareToken) {
          const baseUrl = process.env.BASE_URL
            || `${req.get('x-forwarded-proto') || req.protocol}://${req.get('host') || 'localhost'}`;
          reportUrl = `${baseUrl}/report/${quizResult.shareToken}`;
        }
      }

      sendResultNotification({ phone, wechatName, scores, traderType, rank, avgScore, salesStrategy, reportUrl, verifyCode });
      res.json({ success: true });
    } catch (err) {
      console.error("Result webhook error:", err);
      res.json({ success: true, webhookError: true });
    }
  });

  app.patch("/api/user/tier", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "未登录" });
      }
      const { tier } = req.body;
      if (typeof tier !== "number" || tier < 0 || tier > 3) {
        return res.status(400).json({ message: "无效的阶级值" });
      }
      await storage.updateUserTier(userId, tier);
      res.json({ ok: true, tier });
    } catch (err) {
      console.error("Update tier error:", err);
      res.status(500).json({ message: "更新失败" });
    }
  });

  // 企业微信跳转已暂停 —— 多个企业微信因跳转被封号
  app.get("/api/wechat-contact", async (_req, res) => {
    res.json({ disabled: true, message: "企业微信顾问服务暂停中" });
  });

  app.post("/api/wechat-contact/switch", async (_req, res) => {
    res.json({ disabled: true, message: "企业微信顾问服务暂停中" });
  });

  // ===== 客服 Agent 独立登录系统 =====

  app.post("/api/agent/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "请输入账号和密码" });
    const agent = await storage.getAgentByUsername(username);
    if (!agent) return res.status(401).json({ message: "账号不存在" });
    const valid = await bcrypt.compare(password, agent.password);
    if (!valid) return res.status(401).json({ message: "密码错误" });
    (req.session as any).agentId = agent.id;
    (req.session as any).agentName = agent.name;
    req.session.save((err) => {
      if (err) return res.status(500).json({ message: "登录失败" });
      res.json({ ok: true, name: agent.name });
    });
  });

  app.get("/api/agent/session", (req, res) => {
    const agentName = (req.session as any).agentName;
    res.json({ agentName: agentName || null });
  });

  app.post("/api/agent/logout", (req, res) => {
    (req.session as any).agentName = null;
    (req.session as any).agentId = null;
    req.session.save(() => res.json({ ok: true }));
  });

  app.get("/api/agent/conversations", requireAgent, async (_req, res) => {
    try {
      const convs = await storage.getActiveConversations();
      res.json(convs);
    } catch (err) {
      console.error("[agent] get conversations error:", err);
      res.status(500).json({ message: "获取会话失败" });
    }
  });

  app.patch("/api/agent/conversations/:id/invite", requireAgent, async (req, res) => {
    const convId = parseInt(req.params.id);
    const { status } = req.body as { status: 'early' | 'late' };
    const agentName = (req.session as any).agentName as string;
    if (!['early', 'late'].includes(status)) return res.status(400).json({ message: "无效的邀约类型" });
    try {
      await storage.markConversationInvite(convId, status, agentName);
      res.json({ ok: true });
    } catch (err) {
      console.error("[agent] mark invite error:", err);
      res.status(500).json({ message: "记录失败" });
    }
  });

  app.get("/api/agent/dashboard", requireAgent, async (req, res) => {
    const agentName = (req.session as any).agentName as string;
    try {
      const stats = await storage.getAgentStats(agentName);
      res.json(stats);
    } catch (err) {
      console.error("[agent] dashboard error:", err);
      res.status(500).json({ message: "获取数据失败" });
    }
  });

  // ===== Admin 登录 =====

  app.post("/api/admin/login", (req, res) => {
    const { password } = req.body;
    if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ message: "密码错误" });
    }
    (req.session as any).isAdmin = true;
    req.session.save((err) => {
      if (err) {
        console.error("Admin session save error:", err);
        return res.status(500).json({ message: "登录失败" });
      }
      res.json({ ok: true });
    });
  });

  app.get("/api/admin/session", (req, res) => {
    res.json({ isAdmin: !!(req.session as any).isAdmin });
  });

  app.get("/api/admin/contacts", requireAdmin, async (_req, res) => {
    try {
      const contacts = await storage.getAllSalesContacts();
      res.json(contacts);
    } catch (err) {
      console.error("[admin] get contacts error:", err);
      res.status(500).json({ message: "获取失败" });
    }
  });

  app.post("/api/admin/contacts", requireAdmin, async (req, res) => {
    try {
      const parsed = insertSalesContactSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }
      const contact = await storage.createSalesContact(parsed.data);
      res.json(contact);
    } catch (err) {
      console.error("[admin] create contact error:", err);
      res.status(500).json({ message: "添加失败" });
    }
  });

  app.patch("/api/admin/contacts/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "无效ID" });
      const { name, url, enabled } = req.body;
      const updated = await storage.updateSalesContact(id, { name, url, enabled });
      if (!updated) return res.status(404).json({ message: "顾问不存在" });
      res.json(updated);
    } catch (err) {
      console.error("[admin] update contact error:", err);
      res.status(500).json({ message: "更新失败" });
    }
  });

  app.delete("/api/admin/contacts/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "无效ID" });
      await storage.deleteSalesContact(id);
      res.json({ ok: true });
    } catch (err) {
      console.error("[admin] delete contact error:", err);
      res.status(500).json({ message: "删除失败" });
    }
  });

  app.post("/api/admin/contacts/:id/health-check", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "无效ID" });
      const contacts = await storage.getAllSalesContacts();
      const contact = contacts.find(c => c.id === id);
      if (!contact) return res.status(404).json({ message: "顾问不存在" });
      const alive = await checkContactAlive(contact.url, true);
      const status = alive ? "ok" : "dead";
      await storage.updateContactHealth(id, status);
      res.json({ id, status, checkedAt: new Date().toISOString() });
    } catch (err) {
      console.error("[admin] health check error:", err);
      res.status(500).json({ message: "检测失败" });
    }
  });

  app.post("/api/admin/contacts/health-check-all", requireAdmin, async (_req, res) => {
    try {
      const contacts = await storage.getEnabledSalesContacts();
      const results = [];
      for (const contact of contacts) {
        const alive = await checkContactAlive(contact.url, true);
        const status = alive ? "ok" : "dead";
        await storage.updateContactHealth(contact.id, status);
        results.push({ id: contact.id, name: contact.name, status });
      }
      res.json(results);
    } catch (err) {
      console.error("[admin] health check all error:", err);
      res.status(500).json({ message: "检测失败" });
    }
  });

  app.get("/api/admin/users", requireAdmin, async (_req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT
          u.id,
          u.phone,
          u.nickname,
          u.wechat_id,
          u.source,
          u.tags,
          u.tier,
          u.login_days,
          u.last_login_date,
          u.last_active_at,
          u.created_at,
          q.trader_type_code,
          q.avg_score,
          q.rank_name,
          q.scores,
          q.created_at AS quiz_completed_at
        FROM users u
        LEFT JOIN LATERAL (
          SELECT * FROM quiz_results WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1
        ) q ON true
        ORDER BY u.created_at DESC
      `);
      res.json(result.rows || result || []);
    } catch (err) {
      console.error("[admin] users error:", err);
      res.status(500).json({ message: "获取用户列表失败" });
    }
  });

  // 更新客户标签/备注
  app.patch("/api/admin/users/:id/tags", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { tags } = req.body;
      await db.execute(sql`UPDATE users SET tags = ${JSON.stringify(tags)}::jsonb WHERE id = ${userId}`);
      res.json({ ok: true });
    } catch (err) {
      console.error("[admin] update tags error:", err);
      res.status(500).json({ message: "更新失败" });
    }
  });

  app.get("/api/admin/stats", requireAdmin, async (_req, res) => {
    try {
      res.json(await getAdminStats());
    } catch (err) {
      console.error("[admin] stats error:", err);
      res.status(500).json({ message: "获取统计失败" });
    }
  });

  const EXTERNAL_API_KEY = process.env.EXTERNAL_API_KEY;

  function requireApiKey(req: any, res: any, next: any) {
    const key = req.headers["x-api-key"];
    if (!EXTERNAL_API_KEY || key !== EXTERNAL_API_KEY) {
      return res.status(401).json({ message: "Invalid API key" });
    }
    next();
  }

  app.get("/api/external/stats", requireApiKey, async (_req, res) => {
    try {
      res.json(await getExternalStats());
    } catch (err) {
      console.error("[external] stats error:", err);
      res.status(500).json({ message: "获取统计失败" });
    }
  });

  let liveStatusCache: { isLive: boolean; title: string; checkedAt: number } = { isLive: false, title: "", checkedAt: 0 };
  const LIVE_CACHE_TTL = 60 * 1000;

  app.get("/api/live-status", async (_req, res) => {
    try {
      if (Date.now() - liveStatusCache.checkedAt < LIVE_CACHE_TTL) {
        return res.json({ isLive: liveStatusCache.isLive, title: liveStatusCache.title });
      }
      const response = await fetch("https://api.live.bilibili.com/room/v1/Room/get_info?room_id=1874453448", {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (response.ok) {
        const data = await response.json() as any;
        const isLive = data?.data?.live_status === 1;
        const title = data?.data?.title || "";
        liveStatusCache = { isLive, title, checkedAt: Date.now() };
        return res.json({ isLive, title });
      }
      res.json({ isLive: false, title: "" });
    } catch (err) {
      console.error("[live-status] error:", err);
      res.json({ isLive: liveStatusCache.isLive, title: liveStatusCache.title });
    }
  });

  seedDefaultContacts();
  // 企业微信健康检查已暂停 —— 跳转功能关闭期间无需检测
  // setInterval(runHealthMonitor, HEALTH_MONITOR_INTERVAL);
  // setTimeout(runHealthMonitor, 10000);

  // ========== 聊天系统 API ==========

  // 获取/创建会话（客户端用）
  app.post("/api/chat/conversation", async (req, res) => {
    try {
      const sess = req.session as any;
      const sessionId = sess?.id || req.body?.sessionId || "anon-" + Date.now();
      const userId = sess?.userId ? parseInt(sess.userId) : undefined;
      const conv = await storage.getOrCreateConversation(sessionId, userId);

      // 如果客户有测评结果，附加到会话
      if (userId) {
        const quiz = await storage.getLatestQuizResult(userId);
        if (quiz && !conv.quizSummary) {
          await storage.updateConversationQuizSummary(conv.id, {
            traderType: quiz.traderTypeCode,
            avgScore: quiz.avgScore,
            rankName: quiz.rankName,
            scores: quiz.scores,
          });
        }
      }

      res.json(conv);
    } catch (err) {
      console.error("[chat] create conversation error:", err);
      res.status(500).json({ message: "创建会话失败" });
    }
  });

  // 获取会话消息历史
  app.get("/api/chat/conversation/:id/messages", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "无效ID" });
      const messages = await storage.getConversationMessages(id);
      res.json(messages);
    } catch (err) {
      console.error("[chat] get messages error:", err);
      res.status(500).json({ message: "获取消息失败" });
    }
  });

  // 管理后台：获取所有活跃会话
  app.get("/api/admin/conversations", requireAdmin, async (_req, res) => {
    try {
      const convs = await storage.getActiveConversations();
      res.json(convs);
    } catch (err) {
      console.error("[admin] get conversations error:", err);
      res.status(500).json({ message: "获取会话失败" });
    }
  });

  return httpServer;
}
