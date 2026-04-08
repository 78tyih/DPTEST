import {
  users,
  quizResults,
  userEvents,
  salesContacts,
  conversations,
  chatMessages,
  agents,
  leadSources,
  leadInvalidReasons,
  leadImportBatches,
  leads,
  leadAssignments,
  leadActions,
  leadDuplicateReviews,
  type User,
  type InsertUser,
  type SalesContact,
  type InsertSalesContact,
  type Conversation,
  type ChatMessage,
  type Agent,
  type Lead,
  type LeadImportBatch,
  type LeadInvalidReason,
} from "@shared/schema";
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
  getAgentById(id: number): Promise<Agent | undefined>;
  getLeadInvalidReasonByCode(code: string): Promise<LeadInvalidReason | undefined>;
  listLeadImportBatches(limit?: number): Promise<LeadImportBatch[]>;
  findStrongLeadDuplicate(data: { phone?: string; enterpriseWechatLink?: string }): Promise<Lead | undefined>;
  findWeakLeadDuplicateCandidates(data: { wechatName?: string }): Promise<Lead[]>;
  createLeadImportBatch(data: { operatorAgentId: number; sourceType?: string; sourceRef?: string | null; status?: string }): Promise<LeadImportBatch>;
  completeLeadImportBatch(
    id: number,
    data: {
      status: string;
      totalCount: number;
      insertedCount: number;
      strongDuplicateBlockedCount: number;
      weakDuplicateFlaggedCount: number;
      failedCount: number;
    },
  ): Promise<LeadImportBatch | undefined>;
  createLead(data: {
    importBatchId?: number | null;
    sourcePlatformId?: number | null;
    sourceActivity?: string | null;
    operatorAgentId?: number | null;
    phone?: string | null;
    wechatId?: string | null;
    wechatName?: string | null;
    wechatAvatarUrl?: string | null;
    enterpriseWechatLink?: string | null;
    qrCodeImageUrl?: string | null;
    customerScreenshotUrl?: string | null;
    status?: string;
    isSuspectedDuplicate?: boolean;
    duplicateScore?: number | null;
    duplicateReviewStatus?: string;
    syncAt?: Date | null;
  }): Promise<Lead>;
  listAllocatableSalesAgents(): Promise<Agent[]>;
  assignLeadToSales(
    leadId: number,
    salesAgentId: number,
    data?: { ruleType?: string; ruleSnapshot?: Record<string, unknown> | null },
  ): Promise<Lead | undefined>;
  getLeadQueueForSales(salesAgentId: number): Promise<Lead[]>;
  markLeadValid(leadId: number, salesAgentId: number): Promise<Lead | undefined>;
  markLeadInvalid(
    leadId: number,
    salesAgentId: number,
    data: { reasonCode: string; note?: string | null },
  ): Promise<Lead | undefined>;
  getValidLeadsForSales(salesAgentId: number): Promise<Lead[]>;
  getInvalidLeadsForSales(salesAgentId: number): Promise<Lead[]>;
  getSalesLeadStats(salesAgentId: number): Promise<{
    summary: {
      total: number;
      pending: number;
      valid: number;
      invalid: number;
      processedToday: number;
      validRate: number;
      invalidRate: number;
      avgHandleMinutes: number;
    };
    bySource: Array<{ sourcePlatform: string; count: number }>;
    byReason: Array<{ reason: string; count: number }>;
    trend: Array<{ label: string; valid: number; invalid: number }>;
    recentValid: Lead[];
    recentInvalid: Lead[];
  }>;
  getPendingDuplicateReviews(): Promise<Lead[]>;
  reviewDuplicateLead(
    leadId: number,
    data: {
      reviewedBy: number;
      reviewResult: "keep" | "merge" | "void";
      suspectedTargetLeadId?: number | null;
      reviewNote?: string | null;
    },
  ): Promise<Lead | undefined>;
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

  async getAgentById(id: number): Promise<Agent | undefined> {
    const [agent] = await db.select().from(agents).where(eq(agents.id, id));
    return agent || undefined;
  }

  async getLeadInvalidReasonByCode(code: string): Promise<LeadInvalidReason | undefined> {
    const [reason] = await db.select().from(leadInvalidReasons).where(eq(leadInvalidReasons.code, code));
    return reason || undefined;
  }

  async listLeadImportBatches(limit = 20): Promise<LeadImportBatch[]> {
    return db.select().from(leadImportBatches).orderBy(desc(leadImportBatches.startedAt)).limit(limit);
  }

  async findStrongLeadDuplicate(data: { phone?: string; enterpriseWechatLink?: string }): Promise<Lead | undefined> {
    const conditions = [];
    if (data.phone) {
      conditions.push(eq(leads.phone, data.phone));
    }
    if (data.enterpriseWechatLink) {
      conditions.push(eq(leads.enterpriseWechatLink, data.enterpriseWechatLink));
    }
    if (!conditions.length) {
      return undefined;
    }
    const [lead] = await db
      .select()
      .from(leads)
      .where(conditions.length === 1 ? conditions[0] : or(...conditions))
      .orderBy(desc(leads.createdAt))
      .limit(1);
    return lead || undefined;
  }

  async findWeakLeadDuplicateCandidates(data: { wechatName?: string }): Promise<Lead[]> {
    if (!data.wechatName) {
      return [];
    }
    return db
      .select()
      .from(leads)
      .where(eq(leads.wechatName, data.wechatName))
      .orderBy(desc(leads.createdAt))
      .limit(5);
  }

  async createLeadImportBatch(data: {
    operatorAgentId: number;
    sourceType?: string;
    sourceRef?: string | null;
    status?: string;
  }): Promise<LeadImportBatch> {
    const [batch] = await db.insert(leadImportBatches).values({
      operatorAgentId: data.operatorAgentId,
      sourceType: data.sourceType ?? "tencent_doc",
      sourceRef: data.sourceRef ?? null,
      status: data.status ?? "pending",
    }).returning();
    return batch;
  }

  async completeLeadImportBatch(
    id: number,
    data: {
      status: string;
      totalCount: number;
      insertedCount: number;
      strongDuplicateBlockedCount: number;
      weakDuplicateFlaggedCount: number;
      failedCount: number;
    },
  ): Promise<LeadImportBatch | undefined> {
    const [batch] = await db.update(leadImportBatches).set({
      status: data.status,
      totalCount: data.totalCount,
      insertedCount: data.insertedCount,
      strongDuplicateBlockedCount: data.strongDuplicateBlockedCount,
      weakDuplicateFlaggedCount: data.weakDuplicateFlaggedCount,
      failedCount: data.failedCount,
      finishedAt: new Date(),
    }).where(eq(leadImportBatches.id, id)).returning();
    return batch || undefined;
  }

  async createLead(data: {
    importBatchId?: number | null;
    sourcePlatformId?: number | null;
    sourceActivity?: string | null;
    operatorAgentId?: number | null;
    phone?: string | null;
    wechatId?: string | null;
    wechatName?: string | null;
    wechatAvatarUrl?: string | null;
    enterpriseWechatLink?: string | null;
    qrCodeImageUrl?: string | null;
    customerScreenshotUrl?: string | null;
    status?: string;
    isSuspectedDuplicate?: boolean;
    duplicateScore?: number | null;
    duplicateReviewStatus?: string;
    syncAt?: Date | null;
  }): Promise<Lead> {
    const [lead] = await db.insert(leads).values({
      importBatchId: data.importBatchId ?? null,
      sourcePlatformId: data.sourcePlatformId ?? null,
      sourceActivity: data.sourceActivity ?? null,
      operatorAgentId: data.operatorAgentId ?? null,
      phone: data.phone ?? null,
      wechatId: data.wechatId ?? null,
      wechatName: data.wechatName ?? null,
      wechatAvatarUrl: data.wechatAvatarUrl ?? null,
      enterpriseWechatLink: data.enterpriseWechatLink ?? null,
      qrCodeImageUrl: data.qrCodeImageUrl ?? null,
      customerScreenshotUrl: data.customerScreenshotUrl ?? null,
      status: data.status ?? "pending_assignment",
      isSuspectedDuplicate: data.isSuspectedDuplicate ?? false,
      duplicateScore: data.duplicateScore ?? null,
      duplicateReviewStatus: data.duplicateReviewStatus ?? "not_needed",
      syncAt: data.syncAt ?? new Date(),
    }).returning();
    return lead;
  }

  async listAllocatableSalesAgents(): Promise<Agent[]> {
    return db
      .select()
      .from(agents)
      .where(and(eq(agents.role, "sales"), eq(agents.leadEnabled, true)))
      .orderBy(agents.id);
  }

  async assignLeadToSales(
    leadId: number,
    salesAgentId: number,
    data?: { ruleType?: string; ruleSnapshot?: Record<string, unknown> | null },
  ): Promise<Lead | undefined> {
    const assignedAt = new Date();
    const [lead] = await db.update(leads).set({
      assignedSalesAgentId: salesAgentId,
      assignedAt,
      status: "pending_sales_action",
      updatedAt: assignedAt,
    }).where(eq(leads.id, leadId)).returning();
    if (!lead) {
      return undefined;
    }
    await db.insert(leadAssignments).values({
      leadId,
      salesAgentId,
      ruleType: data?.ruleType ?? "weighted_random",
      ruleSnapshot: data?.ruleSnapshot ?? null,
      assignedAt,
    });
    return lead;
  }

  async getLeadQueueForSales(salesAgentId: number): Promise<Lead[]> {
    return db
      .select()
      .from(leads)
      .where(and(eq(leads.assignedSalesAgentId, salesAgentId), eq(leads.status, "pending_sales_action")))
      .orderBy(desc(leads.createdAt));
  }

  async markLeadValid(leadId: number, salesAgentId: number): Promise<Lead | undefined> {
    const actedAt = new Date();
    const [lead] = await db.update(leads).set({
      status: "valid",
      isValid: true,
      updatedAt: actedAt,
    }).where(and(eq(leads.id, leadId), eq(leads.assignedSalesAgentId, salesAgentId))).returning();
    if (!lead) {
      return undefined;
    }
    await db.insert(leadActions).values({
      leadId,
      salesAgentId,
      actionType: "mark_valid",
      actionValue: "valid",
      metaJson: null,
      createdAt: actedAt,
    });
    return lead;
  }

  async markLeadInvalid(
    leadId: number,
    salesAgentId: number,
    data: { reasonCode: string; note?: string | null },
  ): Promise<Lead | undefined> {
    const reason = await this.getLeadInvalidReasonByCode(data.reasonCode);
    if (!reason) {
      throw new Error(`Invalid reason code: ${data.reasonCode}`);
    }
    const actedAt = new Date();
    const [lead] = await db.update(leads).set({
      status: "invalid",
      isValid: false,
      invalidReasonId: reason.id,
      invalidNote: data.note ?? null,
      updatedAt: actedAt,
    }).where(and(eq(leads.id, leadId), eq(leads.assignedSalesAgentId, salesAgentId))).returning();
    if (!lead) {
      return undefined;
    }
    await db.insert(leadActions).values({
      leadId,
      salesAgentId,
      actionType: "mark_invalid",
      actionValue: data.reasonCode,
      metaJson: data.note ? { note: data.note } : null,
      createdAt: actedAt,
    });
    return lead;
  }

  async getValidLeadsForSales(salesAgentId: number): Promise<Lead[]> {
    return db
      .select()
      .from(leads)
      .where(and(eq(leads.assignedSalesAgentId, salesAgentId), eq(leads.status, "valid")))
      .orderBy(desc(leads.updatedAt));
  }

  async getInvalidLeadsForSales(salesAgentId: number): Promise<Lead[]> {
    return db
      .select()
      .from(leads)
      .where(and(eq(leads.assignedSalesAgentId, salesAgentId), eq(leads.status, "invalid")))
      .orderBy(desc(leads.updatedAt));
  }

  async getSalesLeadStats(salesAgentId: number): Promise<{
    summary: {
      total: number;
      pending: number;
      valid: number;
      invalid: number;
      processedToday: number;
      validRate: number;
      invalidRate: number;
      avgHandleMinutes: number;
    };
    bySource: Array<{ sourcePlatform: string; count: number }>;
    byReason: Array<{ reason: string; count: number }>;
    trend: Array<{ label: string; valid: number; invalid: number }>;
    recentValid: Lead[];
    recentInvalid: Lead[];
  }> {
    const allLeads = await db
      .select({
        id: leads.id,
        status: leads.status,
        createdAt: leads.createdAt,
        updatedAt: leads.updatedAt,
        sourcePlatformId: leads.sourcePlatformId,
        invalidReasonId: leads.invalidReasonId,
      })
      .from(leads)
      .where(eq(leads.assignedSalesAgentId, salesAgentId));

    const sourceRows = await db.select().from(leadSources);
    const reasonRows = await db.select().from(leadInvalidReasons);
    const recentValid = await this.getValidLeadsForSales(salesAgentId);
    const recentInvalid = await this.getInvalidLeadsForSales(salesAgentId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let pending = 0;
    let valid = 0;
    let invalid = 0;
    let processedToday = 0;
    let handledDiffMinutes = 0;
    const bySourceMap = new Map<number, number>();
    const byReasonMap = new Map<number, number>();
    const trendMap = new Map<string, { valid: number; invalid: number }>();

    for (const row of allLeads) {
      if (row.status === "pending_sales_action") {
        pending += 1;
      } else if (row.status === "valid") {
        valid += 1;
      } else if (row.status === "invalid") {
        invalid += 1;
      }

      if (row.sourcePlatformId) {
        bySourceMap.set(row.sourcePlatformId, (bySourceMap.get(row.sourcePlatformId) ?? 0) + 1);
      }

      if (row.invalidReasonId) {
        byReasonMap.set(row.invalidReasonId, (byReasonMap.get(row.invalidReasonId) ?? 0) + 1);
      }

      if (row.status === "valid" || row.status === "invalid") {
        if (row.updatedAt && row.updatedAt >= today) {
          processedToday += 1;
        }

        const label = row.updatedAt
          ? row.updatedAt.toISOString().slice(5, 10)
          : row.createdAt.toISOString().slice(5, 10);
        const entry = trendMap.get(label) ?? { valid: 0, invalid: 0 };
        if (row.status === "valid") {
          entry.valid += 1;
        } else {
          entry.invalid += 1;
        }
        trendMap.set(label, entry);

        if (row.updatedAt && row.createdAt) {
          handledDiffMinutes += Math.max(0, Math.round((row.updatedAt.getTime() - row.createdAt.getTime()) / 60000));
        }
      }
    }

    const processed = valid + invalid;
    const total = allLeads.length;

    return {
      summary: {
        total,
        pending,
        valid,
        invalid,
        processedToday,
        validRate: processed > 0 ? Math.round((valid / processed) * 100) : 0,
        invalidRate: processed > 0 ? Math.round((invalid / processed) * 100) : 0,
        avgHandleMinutes: processed > 0 ? Math.round(handledDiffMinutes / processed) : 0,
      },
      bySource: sourceRows
        .filter((row) => bySourceMap.has(row.id))
        .map((row) => ({ sourcePlatform: row.name, count: bySourceMap.get(row.id) ?? 0 })),
      byReason: reasonRows
        .filter((row) => byReasonMap.has(row.id))
        .map((row) => ({ reason: row.name, count: byReasonMap.get(row.id) ?? 0 })),
      trend: Array.from(trendMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([label, value]) => ({ label, valid: value.valid, invalid: value.invalid })),
      recentValid: recentValid.slice(0, 5),
      recentInvalid: recentInvalid.slice(0, 5),
    };
  }

  async getPendingDuplicateReviews(): Promise<Lead[]> {
    return db
      .select()
      .from(leads)
      .where(
        and(
          eq(leads.isSuspectedDuplicate, true),
          eq(leads.duplicateReviewStatus, "pending"),
          eq(leads.status, "suspected_duplicate_pending_review"),
        ),
      )
      .orderBy(desc(leads.createdAt));
  }

  async reviewDuplicateLead(
    leadId: number,
    data: {
      reviewedBy: number;
      reviewResult: "keep" | "merge" | "void";
      suspectedTargetLeadId?: number | null;
      reviewNote?: string | null;
    },
  ): Promise<Lead | undefined> {
    const reviewedAt = new Date();
    const statusByResult = {
      keep: "pending_assignment",
      merge: "void",
      void: "void",
    } as const;
    const reviewStatusByResult = {
      keep: "approved_keep",
      merge: "approved_merge",
      void: "approved_void",
    } as const;

    await db.insert(leadDuplicateReviews).values({
      leadId,
      reviewResult: data.reviewResult,
      suspectedTargetLeadId: data.suspectedTargetLeadId ?? null,
      reviewedBy: data.reviewedBy,
      reviewNote: data.reviewNote ?? null,
      createdAt: reviewedAt,
    });

    const [lead] = await db.update(leads).set({
      status: statusByResult[data.reviewResult],
      isSuspectedDuplicate: data.reviewResult === "keep" ? false : true,
      duplicateReviewStatus: reviewStatusByResult[data.reviewResult],
      duplicateReviewedBy: data.reviewedBy,
      duplicateReviewedAt: reviewedAt,
      duplicateReviewNote: data.reviewNote ?? null,
      updatedAt: reviewedAt,
    }).where(eq(leads.id, leadId)).returning();

    return lead || undefined;
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
