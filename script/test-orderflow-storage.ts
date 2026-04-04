import assert from "node:assert/strict";
import { calculateOrderflowDiagnosticResult } from "../client/src/utils/orderflowDiagnostic";
import {
  buildOrderflowQuizSubmission,
  reconstructOrderflowResultFromStoredRecord,
} from "../client/src/utils/orderflowStorage";

const result = calculateOrderflowDiagnosticResult("deep", new Array(12).fill(0));
const submission = buildOrderflowQuizSubmission(new Array(12).fill(0), result);

assert.equal(submission.traderTypeCode, "OF_DEEP");
assert.equal(submission.rankName, result.scoreBand.title);
assert.equal(submission.scores.mode, "orderflow-diagnostic");
assert.equal(submission.scores.trackId, "deep");
assert.equal(submission.scores.segmentTags.length > 0, true);
assert.equal(submission.scores.unlockRewards.length >= 4, true);
assert.equal(submission.scores.userSummary.length > 0, true);
assert.equal(submission.scores.salesSummary.priorityLabel.length > 0, true);
assert.equal(submission.scores.systemMapping.route.label.length > 0, true);
assert.equal(submission.scores.salesPlaybook.crmTag.length > 0, true);

const reconstructed = reconstructOrderflowResultFromStoredRecord({
  scores: submission.scores,
  traderTypeCode: submission.traderTypeCode,
  avgScore: submission.avgScore,
  rankName: submission.rankName,
});

assert.notEqual(reconstructed, null);
assert.equal(reconstructed?.trackId, "deep");
assert.equal(reconstructed?.scoreBand.title, result.scoreBand.title);
assert.equal(reconstructed?.recommendedPath.length > 0, true);
assert.equal(reconstructed?.userSummary, result.userSummary);
assert.equal(reconstructed?.salesSummary.priorityLabel, result.salesSummary.priorityLabel);
assert.equal(reconstructed?.systemMapping.route.label, result.systemMapping.route.label);
assert.equal(reconstructed?.salesPlaybook.crmTag, result.salesPlaybook.crmTag);

console.log("test-orderflow-storage: ok");
