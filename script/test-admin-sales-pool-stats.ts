import assert from "node:assert/strict";
import { buildAdminSalesPoolStats } from "../server/adminSalesPoolStats";

const now = new Date("2026-04-04T10:30:00+08:00");

const users = [
  {
    id: 11,
    phone: "13800000011",
    nickname: "Alpha",
    tags: { status: "new" },
    created_at: "2026-04-04T01:00:00.000Z",
    quiz_completed_at: "2026-04-04T02:00:00.000Z",
    scores: {
      mode: "orderflow-diagnostic",
      recommendedPath: "课程训练系统",
      customerProfile: {
        traderStage: { label: "交易大师型" },
        paymentIntent: { label: "高付费意向" },
      },
      segmentTags: [{ label: "课程高意向" }],
    },
  },
  {
    id: 12,
    phone: "13800000012",
    nickname: "Beta",
    tags: { status: "contacted" },
    created_at: "2026-04-04T03:00:00.000Z",
    quiz_completed_at: "2026-04-04T03:20:00.000Z",
    scores: {
      mode: "orderflow-diagnostic",
      recommendedPath: "认知打底系统",
      customerProfile: {
        traderStage: { label: "订单流小白" },
        paymentIntent: { label: "免费资料意向" },
      },
      segmentTags: [{ label: "免费资料型" }],
    },
  },
  {
    id: 13,
    phone: "13800000013",
    nickname: "Gamma",
    tags: null,
    created_at: "2026-04-03T02:00:00.000Z",
    quiz_completed_at: "2026-04-04T04:00:00.000Z",
    scores: {
      mode: "orderflow-diagnostic",
      recommendedPath: "风险降温系统",
      customerProfile: {
        traderStage: { label: "探索型交易者" },
        paymentIntent: { label: "待培育付费意向" },
      },
      segmentTags: [{ label: "高风险用户" }],
    },
  },
  {
    id: 14,
    phone: "13800000014",
    nickname: "Delta",
    tags: { status: "following" },
    created_at: "2026-04-02T05:00:00.000Z",
    quiz_completed_at: "2026-04-02T06:00:00.000Z",
    scores: {
      mode: "orderflow-diagnostic",
      recommendedPath: "课程训练系统",
      customerProfile: {
        traderStage: { label: "交易大师型" },
        paymentIntent: { label: "高付费意向" },
      },
      segmentTags: [{ label: "课程高意向" }],
    },
  },
  {
    id: 15,
    phone: "13800000015",
    nickname: "Legacy",
    tags: { status: "new" },
    created_at: "2026-04-04T05:00:00.000Z",
    quiz_completed_at: "2026-04-04T05:30:00.000Z",
    scores: { EDGE: 80, EXEC: 60, RISK: 55, ADAPT: 60, MENTAL: 50, SYSTEM: 65 },
  },
] as const;

const stats = buildAdminSalesPoolStats(users, now);

assert.equal(stats.cards.length >= 5, true);

const highPaymentCard = stats.cards.find((card) => card.key === "high-payment");
assert.equal(highPaymentCard?.total, 2);
assert.equal(highPaymentCard?.todayNew, 1);
assert.equal(highPaymentCard?.pendingFollowUp, 1);

const noviceCard = stats.cards.find((card) => card.key === "novice");
assert.equal(noviceCard?.total, 1);
assert.equal(noviceCard?.pendingFollowUp, 0);

const riskCard = stats.cards.find((card) => card.key === "risk-cooling");
assert.equal(riskCard?.total, 1);
assert.equal(riskCard?.pendingFollowUp, 1);

assert.equal(stats.pendingUsers.length, 2);
assert.equal(stats.pendingUsers[0]?.id, 13);
assert.equal(stats.pendingUsers[0]?.poolLabels.includes("风险降温"), true);
assert.equal(stats.pendingUsers[1]?.id, 11);
assert.equal(stats.pendingUsers[1]?.poolLabels.includes("高付费意向"), true);
assert.equal(stats.pendingUsers[1]?.poolLabels.includes("课程高意向"), true);

console.log("test-admin-sales-pool-stats: ok");
