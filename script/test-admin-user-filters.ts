import assert from "node:assert/strict";
import { filterAdminUsers } from "../server/adminUsers";

const users = [
  {
    id: 1,
    phone: "13800000001",
    nickname: "Alpha",
    wechat_id: "alpha01",
    trader_type_code: null,
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
    id: 2,
    phone: "13800000002",
    nickname: "Beta",
    wechat_id: "beta02",
    trader_type_code: null,
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
    id: 3,
    phone: "13800000003",
    nickname: "Gamma",
    wechat_id: "gamma03",
    trader_type_code: "RS",
    scores: { EDGE: 80, EXEC: 70, RISK: 60, ADAPT: 65, MENTAL: 55, SYSTEM: 75 },
  },
] as const;

const bySearch = filterAdminUsers(users, { search: "alpha", page: 1, pageSize: 20 });
assert.equal(bySearch.total, 1);
assert.equal(bySearch.items[0]?.id, 1);

const byStage = filterAdminUsers(users, { stage: "订单流小白", page: 1, pageSize: 20 });
assert.equal(byStage.total, 1);
assert.equal(byStage.items[0]?.id, 2);

const byPayment = filterAdminUsers(users, { payment: "高付费意向", page: 1, pageSize: 20 });
assert.equal(byPayment.total, 1);
assert.equal(byPayment.items[0]?.id, 1);

const byPath = filterAdminUsers(users, { path: "课程训练系统", page: 1, pageSize: 20 });
assert.equal(byPath.total, 1);
assert.equal(byPath.items[0]?.id, 1);

const paged = filterAdminUsers(users, { page: 2, pageSize: 1 });
assert.equal(paged.total, 3);
assert.equal(paged.totalPages, 3);
assert.equal(paged.items.length, 1);
assert.equal(paged.items[0]?.id, 2);
assert.equal(paged.availableStages.includes("交易大师型"), true);
assert.equal(paged.availableStages.includes("订单流小白"), true);
assert.equal(paged.availablePayments.includes("高付费意向"), true);
assert.equal(paged.availablePayments.includes("免费资料意向"), true);

console.log("test-admin-user-filters: ok");
