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

console.log("test-orderflow-storage: ok");
