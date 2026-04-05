import assert from "node:assert/strict";
import { deriveAdminOrderflowSummary } from "../client/src/utils/orderflowAdmin";
import { calculateOrderflowDiagnosticResult } from "../client/src/utils/orderflowDiagnostic";
import { buildOrderflowQuizSubmission } from "../client/src/utils/orderflowStorage";

const orderflowResult = calculateOrderflowDiagnosticResult("deep", new Array(12).fill(0));
const orderflowSubmission = buildOrderflowQuizSubmission(new Array(12).fill(0), orderflowResult);
const orderflowSummary = deriveAdminOrderflowSummary(orderflowSubmission.scores);

assert.equal(orderflowSummary.mode, "orderflow");
assert.equal(orderflowSummary.traderStageLabel, orderflowResult.customerProfile.traderStage.label);
assert.equal(orderflowSummary.paymentIntentLabel, orderflowResult.customerProfile.paymentIntent.label);
assert.equal(orderflowSummary.recommendedPath, orderflowResult.recommendedPath);
assert.equal(orderflowSummary.segmentTagLabels.length > 0, true);
assert.equal((orderflowSummary.dimensionScores?.["commercial-intent"] ?? -1) >= 0, true);

const legacySummary = deriveAdminOrderflowSummary({
  EDGE: 77,
  EXEC: 65,
  RISK: 59,
  ADAPT: 71,
  MENTAL: 60,
  SYSTEM: 68,
});

assert.equal(legacySummary.mode, "legacy");
assert.equal(legacySummary.dimensionScores?.EDGE, 77);
assert.equal(legacySummary.traderStageLabel, "");

const unknownSummary = deriveAdminOrderflowSummary({ foo: "bar" });
assert.equal(unknownSummary.mode, "unknown");
assert.equal(unknownSummary.dimensionScores, null);

console.log("test-orderflow-admin: ok");
