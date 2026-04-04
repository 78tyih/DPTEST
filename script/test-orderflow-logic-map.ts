import assert from "node:assert/strict";
import { diagnosticQuestions } from "../client/src/data/orderflowDiagnostic";
import {
  orderflowQuestionLogicMap,
  orderflowSystemRoutes,
  resolveOrderflowSystemMapping,
} from "../client/src/data/orderflowLogicMap";

const allQuestionIds = Object.values(diagnosticQuestions).flat().map((question) => question.id);

for (const questionId of allQuestionIds) {
  assert.equal(questionId in orderflowQuestionLogicMap, true, `missing logic map for ${questionId}`);
}

const starterMapping = resolveOrderflowSystemMapping({
  trackId: "starter",
  scoreBandId: "starter-foundation",
  segmentTagIds: ["free-resource"],
});

assert.equal(starterMapping.route.id, "cognition-foundation");
assert.equal(starterMapping.route.label.length > 0, true);
assert.equal(starterMapping.reason.length > 0, true);

const softwareMapping = resolveOrderflowSystemMapping({
  trackId: "deep",
  scoreBandId: "deep-convert",
  segmentTagIds: ["software-priority"],
});

assert.equal(softwareMapping.route.id, "software-execution");
assert.equal(softwareMapping.route.nextStep.length > 0, true);

const riskMapping = resolveOrderflowSystemMapping({
  trackId: "deep",
  scoreBandId: "deep-build",
  segmentTagIds: ["course-intent", "high-risk"],
});

assert.equal(riskMapping.route.id, "risk-cooling");
assert.equal(riskMapping.route.salesFocus.includes("预期"), true);
assert.equal(orderflowSystemRoutes["course-training"].fitFor.length > 0, true);

console.log("test-orderflow-logic-map: ok");
