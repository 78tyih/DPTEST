import assert from "node:assert/strict";
import {
  calculateOrderflowDiagnosticResult,
  getQuestionSetByTrack,
} from "../client/src/utils/orderflowDiagnostic";
import { buildOrderflowResultWebhookPayload } from "../client/src/utils/webhook";

const starterAnswers = new Array(getQuestionSetByTrack("starter").length).fill(0);
const starterResult = calculateOrderflowDiagnosticResult("starter", starterAnswers);

assert.equal(starterResult.trackId, "starter");
assert.equal(starterResult.unlockRewards.length >= 3, true);
assert.equal(starterResult.scoreBand.track, "starter");
assert.equal(starterResult.recommendedAction.length > 0, true);
assert.equal(starterResult.userSummary.includes("订单流"), true);
assert.equal(starterResult.salesSummary.priorityLabel.length > 0, true);
assert.equal(starterResult.salesSummary.conversationHook.length > 0, true);
assert.equal(starterResult.systemMapping.route.label.length > 0, true);

const deepAnswers = new Array(getQuestionSetByTrack("deep").length).fill(0);
const deepResult = calculateOrderflowDiagnosticResult("deep", deepAnswers);

assert.equal(deepResult.trackId, "deep");
assert.equal(deepResult.unlockRewards.length >= 4, true);
assert.equal(deepResult.scoreBand.track, "deep");
assert.equal(deepResult.segmentTags.length > 0, true);
assert.equal(deepResult.recommendedPath.length > 0, true);
assert.equal(deepResult.bottomDimensions.length, 2);
assert.equal(deepResult.salesSummary.fitConclusion.length > 0, true);
assert.equal(deepResult.salesSummary.nextStep.length > 0, true);
assert.equal(deepResult.systemMapping.route.id.length > 0, true);

const payload = buildOrderflowResultWebhookPayload({
  phone: "13800000000",
  wechatName: "Sera",
  result: deepResult,
  verifyCode: "9527",
});

assert.equal(payload.selectedTrack, "deep");
assert.equal(payload.scoreBand.title, deepResult.scoreBand.title);
assert.equal(payload.dimensionScores["commercial-intent"] >= 0, true);
assert.equal(payload.segmentTags.length > 0, true);
assert.equal(payload.unlockRewards.length >= 4, true);
assert.equal(payload.recommendedAction.length > 0, true);
assert.equal(payload.userSummary, deepResult.userSummary);
assert.equal(payload.salesSummary.priorityLabel, deepResult.salesSummary.priorityLabel);
assert.equal(payload.salesSummary.riskAlert.length > 0, true);
assert.equal(payload.systemMapping.route.label, deepResult.systemMapping.route.label);

console.log("test-orderflow-diagnostic: ok");
