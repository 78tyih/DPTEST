import assert from "node:assert/strict";
import { buildResultWebhookPayload } from "../client/src/utils/webhook";

const payload = buildResultWebhookPayload({
  phone: "13800000000",
  normalizedScores: {
    RISK: 78,
    MENTAL: 84,
    SYSTEM: 80,
    ADAPT: 76,
    EXEC: 88,
    EDGE: 82,
  },
  traderTypeCode: "RE",
  avgScore: 81,
  rankName: "大师交易员",
});

assert.equal(payload.phone, "13800000000");
assert.equal(payload.traderType.code, "RE");
assert.equal(payload.rank.name, "大师交易员");
assert.equal(payload.salesStrategy.keyHook.length > 0, true);
assert.equal(payload.scores.EXEC, 88);

console.log("test-result-webhook: ok");
