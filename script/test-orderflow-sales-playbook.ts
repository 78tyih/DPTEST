import assert from "node:assert/strict";
import { buildOrderflowSalesPlaybook } from "../client/src/data/orderflowSalesPlaybook";

const coursePlaybook = buildOrderflowSalesPlaybook({
  trackId: "deep",
  systemRouteId: "course-training",
  priorityLabel: "重点跟进",
  segmentTagIds: ["course-intent"],
  unlockRewardTitles: ["课程大纲与个性化跟进"],
});

assert.equal(coursePlaybook.firstTouch.includes("课程"), true);
assert.equal(coursePlaybook.materialsToSend.length > 0, true);
assert.equal(coursePlaybook.responseWindow.length > 0, true);

const softwarePlaybook = buildOrderflowSalesPlaybook({
  trackId: "deep",
  systemRouteId: "software-execution",
  priorityLabel: "重点跟进",
  segmentTagIds: ["software-priority"],
  unlockRewardTitles: ["软件试用与进群资格"],
});

assert.equal(softwarePlaybook.firstTouch.includes("软件"), true);
assert.equal(softwarePlaybook.crmTag.includes("软件"), true);

const riskPlaybook = buildOrderflowSalesPlaybook({
  trackId: "deep",
  systemRouteId: "risk-cooling",
  priorityLabel: "先降温，不直接成交",
  segmentTagIds: ["high-risk"],
  unlockRewardTitles: ["Sera 的订单流学习笔记"],
});

assert.equal(riskPlaybook.avoid.includes("承诺"), true);
assert.equal(riskPlaybook.contactGoal.includes("预期"), true);

console.log("test-orderflow-sales-playbook: ok");
