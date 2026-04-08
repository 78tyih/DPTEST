import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, serial, integer, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  password: text("password").notNull(),
  nickname: varchar("nickname", { length: 50 }),
  wechatId: varchar("wechat_id", { length: 100 }),
  source: varchar("source", { length: 50 }),
  tags: jsonb("tags"),
  tier: integer("tier").default(0).notNull(),
  loginDays: integer("login_days").default(0).notNull(),
  lastLoginDate: varchar("last_login_date", { length: 10 }),
  lastActiveAt: timestamp("last_active_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const quizResults = pgTable("quiz_results", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  answers: jsonb("answers").notNull(),
  scores: jsonb("scores").notNull(),
  traderTypeCode: varchar("trader_type_code", { length: 10 }).notNull(),
  avgScore: integer("avg_score").notNull(),
  rankName: varchar("rank_name", { length: 50 }).notNull(),
  shareToken: varchar("share_token", { length: 32 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userEvents = pgTable("user_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  sessionId: varchar("session_id", { length: 64 }).notNull(),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  eventData: jsonb("event_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const salesContacts = pgTable("sales_contacts", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  url: text("url").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  lastHealthCheck: timestamp("last_health_check"),
  lastHealthStatus: varchar("last_health_status", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ========== 聊天系统 ==========

export const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  password: text("password").notNull(),
  role: varchar("role", { length: 20 }).default("sales").notNull(),
  leadEnabled: boolean("lead_enabled").default(true).notNull(),
  leadAllocationWeight: integer("lead_allocation_weight").default(1).notNull(),
  leadDailyQuota: integer("lead_daily_quota").default(50).notNull(),
  leadPreferredMode: varchar("lead_preferred_mode", { length: 20 }).default("button").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const leadSources = pgTable("lead_sources", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const leadInvalidReasons = pgTable("lead_invalid_reasons", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const leadImportBatches = pgTable("lead_import_batches", {
  id: serial("id").primaryKey(),
  operatorAgentId: integer("operator_agent_id").notNull(),
  sourceType: varchar("source_type", { length: 50 }).default("tencent_doc").notNull(),
  sourceRef: text("source_ref"),
  status: varchar("status", { length: 30 }).default("pending").notNull(),
  totalCount: integer("total_count").default(0).notNull(),
  insertedCount: integer("inserted_count").default(0).notNull(),
  strongDuplicateBlockedCount: integer("strong_duplicate_blocked_count").default(0).notNull(),
  weakDuplicateFlaggedCount: integer("weak_duplicate_flagged_count").default(0).notNull(),
  failedCount: integer("failed_count").default(0).notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  finishedAt: timestamp("finished_at"),
});

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  importBatchId: integer("import_batch_id"),
  sourcePlatformId: integer("source_platform_id"),
  sourceActivity: varchar("source_activity", { length: 255 }),
  operatorAgentId: integer("operator_agent_id"),
  phone: varchar("phone", { length: 20 }),
  wechatId: varchar("wechat_id", { length: 100 }),
  wechatName: varchar("wechat_name", { length: 100 }),
  wechatAvatarUrl: text("wechat_avatar_url"),
  enterpriseWechatLink: text("enterprise_wechat_link"),
  qrCodeImageUrl: text("qr_code_image_url"),
  customerScreenshotUrl: text("customer_screenshot_url"),
  assignedSalesAgentId: integer("assigned_sales_agent_id"),
  assignedAt: timestamp("assigned_at"),
  status: varchar("status", { length: 50 }).default("pending_assignment").notNull(),
  isValid: boolean("is_valid"),
  invalidReasonId: integer("invalid_reason_id"),
  invalidNote: text("invalid_note"),
  isSuspectedDuplicate: boolean("is_suspected_duplicate").default(false).notNull(),
  duplicateScore: integer("duplicate_score"),
  duplicateReviewStatus: varchar("duplicate_review_status", { length: 50 }).default("not_needed").notNull(),
  duplicateReviewedBy: integer("duplicate_reviewed_by"),
  duplicateReviewedAt: timestamp("duplicate_reviewed_at"),
  duplicateReviewNote: text("duplicate_review_note"),
  syncAt: timestamp("sync_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const leadAssignments = pgTable("lead_assignments", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull(),
  salesAgentId: integer("sales_agent_id").notNull(),
  ruleType: varchar("rule_type", { length: 50 }).default("weighted_random").notNull(),
  ruleSnapshot: jsonb("rule_snapshot"),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
});

export const leadActions = pgTable("lead_actions", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull(),
  salesAgentId: integer("sales_agent_id").notNull(),
  actionType: varchar("action_type", { length: 50 }).notNull(),
  actionValue: varchar("action_value", { length: 100 }),
  metaJson: jsonb("meta_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const leadDuplicateReviews = pgTable("lead_duplicate_reviews", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull(),
  reviewResult: varchar("review_result", { length: 20 }).notNull(),
  suspectedTargetLeadId: integer("suspected_target_lead_id"),
  reviewedBy: integer("reviewed_by").notNull(),
  reviewNote: text("review_note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),

  // 客户信息（已登录用户关联 userId，未登录用匿名 sessionId）
  userId: integer("user_id"),
  sessionId: varchar("session_id", { length: 64 }).notNull(),

  // 会话状态：ai（AI 接管）、human（人工接管）、closed（已关闭）
  status: varchar("status", { length: 20 }).default("ai").notNull(),

  // 接管的客服人员
  assignedAgent: varchar("assigned_agent", { length: 100 }),

  // 直播间邀约状态：none（未邀约）、early（提前邀约，9:30前）、late（会后发链接，9:30后）
  inviteStatus: varchar("invite_status", { length: 10 }).default("none").notNull(),
  invitedAt: timestamp("invited_at"),
  invitedBy: varchar("invited_by", { length: 100 }),

  // 客户的测评结果摘要（方便客服快速了解）
  quizSummary: jsonb("quiz_summary"),

  lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),

  // 发送者角色：user（客户）、ai（AI 客服）、agent（人工客服）
  role: varchar("role", { length: 10 }).notNull(),
  content: text("content").notNull(),

  // 人工客服的名称（role=agent 时填写）
  agentName: varchar("agent_name", { length: 100 }),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type Agent = typeof agents.$inferSelect;
export type LeadSource = typeof leadSources.$inferSelect;
export type LeadInvalidReason = typeof leadInvalidReasons.$inferSelect;
export type LeadImportBatch = typeof leadImportBatches.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type LeadAssignment = typeof leadAssignments.$inferSelect;
export type LeadAction = typeof leadActions.$inferSelect;
export type LeadDuplicateReview = typeof leadDuplicateReviews.$inferSelect;

export const insertSalesContactSchema = createInsertSchema(salesContacts).pick({
  name: true,
  url: true,
}).extend({
  name: z.string().min(1, "请输入顾问名称"),
  url: z.string().url("请输入有效的链接"),
});

export type SalesContact = typeof salesContacts.$inferSelect;
export type InsertSalesContact = z.infer<typeof insertSalesContactSchema>;

export const insertUserSchema = createInsertSchema(users).pick({
  phone: true,
  password: true,
}).extend({
  phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入有效的手机号码"),
  password: z.string().min(6, "密码至少6位"),
});

export const loginSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入有效的手机号码"),
  password: z.string().min(1, "请输入密码"),
});

export const insertQuizResultSchema = createInsertSchema(quizResults).pick({
  answers: true,
  scores: true,
  traderTypeCode: true,
  avgScore: true,
  rankName: true,
});

export const insertEventSchema = createInsertSchema(userEvents).pick({
  sessionId: true,
  eventType: true,
  eventData: true,
}).extend({
  userId: z.number().optional(),
  sessionId: z.string().min(1),
  eventType: z.string().min(1).max(50),
  eventData: z.record(z.any()).optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type QuizResult = typeof quizResults.$inferSelect;
export type InsertQuizResult = z.infer<typeof insertQuizResultSchema>;
export type UserEvent = typeof userEvents.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
