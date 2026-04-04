import assert from "node:assert/strict";
import { formatSalesPoolSnapshotMarkdown } from "../server/webhook";

const markdown = formatSalesPoolSnapshotMarkdown({
  cards: [
    {
      key: "high-payment",
      label: "高付费意向",
      description: "优先联系已具备明确预算和购买意愿的客户。",
      total: 3,
      todayNew: 2,
      pendingFollowUp: 1,
    },
    {
      key: "risk-cooling",
      label: "风险降温",
      description: "先做预期管理，不直接推进高价成交。",
      total: 2,
      todayNew: 1,
      pendingFollowUp: 2,
    },
  ],
  pendingUsers: [
    {
      id: 1,
      phone: "13800000001",
      nickname: "Alpha",
      traderStageLabel: "交易大师型",
      paymentIntentLabel: "高付费意向",
      recommendedPath: "课程训练系统",
      poolLabels: ["高付费意向", "课程高意向"],
      quizCompletedAt: "2026-04-04T04:20:00.000Z",
      createdAt: "2026-04-04T03:20:00.000Z",
      followStatus: "new",
    },
    {
      id: 2,
      phone: "13800000002",
      nickname: "Beta",
      traderStageLabel: "探索型交易者",
      paymentIntentLabel: "待培育付费意向",
      recommendedPath: "风险降温系统",
      poolLabels: ["风险降温"],
      quizCompletedAt: "2026-04-04T03:10:00.000Z",
      createdAt: "2026-04-04T02:00:00.000Z",
      followStatus: "new",
    },
  ],
});

assert.equal(markdown.includes("### 📈 当前销售池快照"), true);
assert.equal(markdown.includes("高付费意向：总 3 · 今日新增 2 · 待跟进 1"), true);
assert.equal(markdown.includes("风险降温：总 2 · 今日新增 1 · 待跟进 2"), true);
assert.equal(markdown.includes("Alpha（13800000001）"), true);
assert.equal(markdown.includes("Beta（13800000002）"), true);
assert.equal(markdown.includes("课程高意向 / 高付费意向"), true);

console.log("test-webhook-sales-pool-snapshot: ok");
