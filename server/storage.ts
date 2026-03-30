import { users, quizResults, userEvents, salesContacts, conversations, chatMessages, agents, type User, type InsertUser, type SalesContact, type InsertSalesContact, type Conversation, type ChatMessage, type Agent } from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, or, gte, lte, ne, isNull } from "drizzle-orm";
import crypto from "crypto";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserProfile(userId: number, data: {
    nickname?: string;
    wechatId?: string;
    source?: string;
    tags?: string[];
    lastActiveAt?: Date;
  }): Promise<void>;
  updateUserPassword(userId: number, hashedPassword: string): Promise<void>;
  updateUserTier(userId: number, tier: number): Promise<void>;
  saveQuizResult(userId: number, data: {
    answers: number[];
    scores: Record<string, number>;
    traderTypeCode: string;
    avgScore: number;
    rankName: string;
  }): Promise<typeof quizResults.$inferSelect>;
  getLatestQuizResult(userId: number): Promise<typeof quizResults.$inferSelect | undefined>;
  getAllQuizResults(userId: number): Promise<(typeof quizResults.$inferSelect)[]>;
  getQuizResultByToken(token: string): Promise<typeof quizResults.$inferSelect | undefined>;
  trackEvent(data: {
    userId?: number;
    sessionId: string;
    eventType: string;
    eventData?: Record<string, unknown>;
  }): Promise<void>;
  getUserEvents(userId: number, limit?: number): Promise<(typeof userEvents.$inferSelect)[]>;
  getAllSalesContacts(): Promise<SalesContact[]>;
  getEnabledSalesContacts(): Promise<SalesContact[]>;
  createSalesContact(data: InsertSalesContact): Promise<SalesContact>;
  updateSalesContact(id: number, data: Partial<Pick<SalesContact, 'name' | 'url' | 'enabled'>>): Promise<SalesContact | undefined>;
  deleteSalesContact(id: number): Promise<void>;
  updateContactHealth(id: number, status: string): Promise<void>;
}

function generateShareToken(): string {
  return crypto.randomBytes(16).toString('hex');
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phone, phone));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserProfile(userId: number, data: {
    nickname?: string;
    wechatId?: string;
    source?: string;
    tags?: string[];
    lastActiveAt?: Date;
  }): Promise<void> {
    const updates: Record<string, unknown> = {};
    if (data.nickname !== undefined) updates.nickname = data.nickname;
    if (data.wechatId !== undefined) updates.wechatId = data.wechatId;
    if (data.source !== undefined) updates.source = data.source;
    if (data.tags !== undefined) updates.tags = data.tags;
    if (data.lastActiveAt !== undefined) updates.lastActiveAt = data.lastActiveAt;
    if (Object.keys(updates).length > 0) {
      await db.update(users).set(updates).where(eq(users.id, userId));
    }
  }

  async updateUserPassword(userId: number, hashedPassword: string): Promise<void> {
    await db.update(users).set({ password: hashedPassword }).where(eq(users.id, userId));
  }

  async updateUserTier(userId: number, tier: number): Promise<void> {
    await db.update(users).set({ tier }).where(eq(users.id, userId));
  }

  async trackDailyLogin(userId: number): Promise<{ loginDays: number; tierChanged: boolean; newTier: number }> {
    const user = await this.getUser(userId);
    if (!user) return { loginDays: 0, tierChanged: false, newTier: 0 };

    const today = new Date().toISOString().slice(0, 10);
    if (user.lastLoginDate === today) {
      return { loginDays: user.loginDays, tierChanged: false, newTier: user.tier };
    }

    const result = await db.update(users)
      .set({
        loginDays: sql`COALESCE(login_days, 0) + 1`,
        lastLoginDate: today,
        lastActiveAt: new Date(),
      })
      .where(and(eq(users.id, userId), or(isNull(users.lastLoginDate), ne(users.lastLoginDate, today))))
      .returning({ loginDays: users.loginDays, tier: users.tier });

    if (!result.length) {
      return { loginDays: user.loginDays, tierChanged: false, newTier: user.tier };
    }

    const newLoginDays = result[0].loginDays;
    let newTier = result[0].tier;
    if (newLoginDays >= 60 && newTier < 3) newTier = 3;
    else if (newLoginDays >= 21 && newTier < 2) newTier = 2;
    else if (newLoginDays >= 7 && newTier < 1) newTier = 1;

    if (newTier !== result[0].tier) {
      await db.update(users).set({ tier: newTier }).where(eq(users.id, userId));
    }

    return { loginDays: newLoginDays, tierChanged: newTier !== result[0].tier, newTier };
  }

  async saveQuizResult(userId: number, data: {
    answers: number[];
    scores: Record<string, number>;
    traderTypeCode: string;
    avgScore: number;
    rankName: string;
  }) {
    const [result] = await db.insert(quizResults).values({
      userId,
      answers: data.answers,
      scores: data.scores,
      traderTypeCode: data.traderTypeCode,
      avgScore: data.avgScore,
      rankName: data.rankName,
      shareToken: generateShareToken(),
    }).returning();
    return result;
  }

  async getLatestQuizResult(userId: number) {
    const [result] = await db
      .select()
      .from(quizResults)
      .where(eq(quizResults.userId, userId))
      .orderBy(desc(quizResults.createdAt))
      .limit(1);
    return result || undefined;
  }

  async getAllQuizResults(userId: number) {
    return db
      .select()
      .from(quizResults)
      .where(eq(quizResults.userId, userId))
      .orderBy(desc(quizResults.createdAt));
  }

  async getQuizResultByToken(token: string) {
    const [result] = await db
      .select()
      .from(quizResults)
      .where(eq(quizResults.shareToken, token));
    return result || undefined;
  }

  async trackEvent(data: {
    userId?: number;
    sessionId: string;
    eventType: string;
    eventData?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await db.insert(userEvents).values({
        userId: data.userId ?? null,
        sessionId: data.sessionId,
        eventType: data.eventType,
        eventData: data.eventData ?? null,
      });
    } catch (err) {
      console.error("Failed to track event:", err);
    }
  }

  async getUserEvents(userId: number, limit = 50) {
    return db
      .select()
      .from(userEvents)
      .where(eq(userEvents.userId, userId))
      .orderBy(desc(userEvents.createdAt))
      .limit(limit);
  }

  async getAllSalesContacts(): Promise<SalesContact[]> {
    return db.select().from(salesContacts).orderBy(salesContacts.id);
  }

  async getEnabledSalesContacts(): Promise<SalesContact[]> {
    return db.select().from(salesContacts).where(eq(salesContacts.enabled, true)).orderBy(salesContacts.id);
  }

  async createSalesContact(data: InsertSalesContact): Promise<SalesContact> {
    const [contact] = await db.insert(salesContacts).values(data).returning();
    return contact;
  }

  async updateSalesContact(id: number, data: Partial<Pick<SalesContact, 'name' | 'url' | 'enabled'>>): Promise<SalesContact | undefined> {
    const updates: Record<string, unknown> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.url !== undefined) updates.url = data.url;
    if (data.enabled !== undefined) updates.enabled = data.enabled;
    if (Object.keys(updates).length === 0) return undefined;
    const [updated] = await db.update(salesContacts).set(updates).where(eq(salesContacts.id, id)).returning();
    return updated || undefined;
  }

  async deleteSalesContact(id: number): Promise<void> {
    await db.delete(salesContacts).where(eq(salesContacts.id, id));
  }

  async updateContactHealth(id: number, status: string): Promise<void> {
    await db.update(salesContacts).set({
      lastHealthCheck: new Date(),
      lastHealthStatus: status,
    }).where(eq(salesContacts.id, id));
  }

  // ========== 聊天系统 ==========

  async getOrCreateConversation(sessionId: string, userId?: number): Promise<Conversation> {
    // 先找现有的未关闭会话
    const conditions = userId
      ? or(eq(conversations.sessionId, sessionId), eq(conversations.userId, userId!))
      : eq(conversations.sessionId, sessionId);
    const [existing] = await db
      .select()
      .from(conversations)
      .where(and(conditions, sql`${conversations.status} != 'closed'`))
      .orderBy(desc(conversations.createdAt))
      .limit(1);
    if (existing) return existing;

    const [conv] = await db.insert(conversations).values({
      sessionId,
      userId: userId ?? null,
      status: "ai",
    }).returning();
    return conv;
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conv || undefined;
  }

  async getConversationMessages(conversationId: number, limit = 100): Promise<ChatMessage[]> {
    return db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, conversationId))
      .orderBy(chatMessages.createdAt)
      .limit(limit);
  }

  async addMessage(conversationId: number, role: string, content: string, agentName?: string): Promise<ChatMessage> {
    const [msg] = await db.insert(chatMessages).values({
      conversationId,
      role,
      content,
      agentName: agentName ?? null,
    }).returning();
    await db.update(conversations).set({ lastMessageAt: new Date() }).where(eq(conversations.id, conversationId));
    return msg;
  }

  async updateConversationStatus(id: number, status: string, assignedAgent?: string): Promise<void> {
    const updates: Record<string, unknown> = { status };
    if (assignedAgent !== undefined) updates.assignedAgent = assignedAgent;
    await db.update(conversations).set(updates).where(eq(conversations.id, id));
  }

  async updateConversationQuizSummary(conversationId: number, summary: Record<string, unknown>): Promise<void> {
    await db.update(conversations).set({ quizSummary: summary }).where(eq(conversations.id, conversationId));
  }

  async getPublicStats(): Promise<{ totalUsers: number }> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(users);
    return { totalUsers: Number(result[0]?.count ?? 0) };
  }

  async getActiveConversations(): Promise<(Conversation & { lastMessage?: string; unreadCount?: number })[]> {
    const convs = await db
      .select()
      .from(conversations)
      .where(sql`${conversations.status} != 'closed'`)
      .orderBy(desc(conversations.lastMessageAt));

    const results = [];
    for (const conv of convs) {
      const [lastMsg] = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.conversationId, conv.id))
        .orderBy(desc(chatMessages.createdAt))
        .limit(1);
      results.push({
        ...conv,
        lastMessage: lastMsg?.content,
      });
    }
    return results;
  }

  // ====== Agent 账号方法 ======

  async getAgentByUsername(username: string): Promise<Agent | undefined> {
    const [agent] = await db.select().from(agents).where(eq(agents.username, username));
    return agent || undefined;
  }

  async createAgentIfNotExists(data: { name: string; username: string; password: string }): Promise<Agent> {
    const existing = await this.getAgentByUsername(data.username);
    if (existing) return existing;
    const [agent] = await db.insert(agents).values(data).returning();
    return agent;
  }

  // ====== 直播间邀约记录 ======

  async markConversationInvite(conversationId: number, status: 'early' | 'late', agentName: string): Promise<void> {
    await db.update(conversations).set({
      inviteStatus: status,
      invitedAt: new Date(),
      invitedBy: agentName,
    }).where(eq(conversations.id, conversationId));
  }

  // ====== 客服个人数据看板 ======

  async getAgentStats(agentName: string): Promise<{
    today: { invites: number; earlyInvites: number; lateInvites: number; takeovers: number; inviteRate: string };
    week: { invites: number; earlyInvites: number; lateInvites: number; takeovers: number; inviteRate: string };
  }> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 6);

    const calcStats = async (since: Date) => {
      // 我邀约的对话
      const invited = await db.select().from(conversations)
        .where(and(eq(conversations.invitedBy, agentName), gte(conversations.invitedAt, since)));
      const earlyInvites = invited.filter(c => c.inviteStatus === 'early').length;
      const lateInvites = invited.filter(c => c.inviteStatus === 'late').length;

      // 我接管过的对话
      const takeovers = await db.select({ count: sql<number>`count(*)` })
        .from(conversations)
        .where(and(eq(conversations.assignedAgent, agentName), gte(conversations.lastMessageAt, since)));
      const takeoverCount = Number(takeovers[0]?.count ?? 0);

      // 邀约率 = 邀约数 / max(接管数, 1)
      const inviteTotal = earlyInvites + lateInvites;
      const rate = takeoverCount > 0 ? Math.round((inviteTotal / takeoverCount) * 100) : 0;

      return { invites: inviteTotal, earlyInvites, lateInvites, takeovers: takeoverCount, inviteRate: `${rate}%` };
    };

    const [today, week] = await Promise.all([calcStats(todayStart), calcStats(weekStart)]);
    return { today, week };
  }
}

export const storage = new DatabaseStorage();
