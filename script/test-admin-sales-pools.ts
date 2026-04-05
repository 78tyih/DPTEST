import assert from "node:assert/strict";
import {
  adminSalesPoolPresets,
  buildAdminSalesPoolQueryPatch,
  isAdminSalesPoolActive,
} from "../client/src/utils/adminSalesPools";

assert.equal(adminSalesPoolPresets.length >= 5, true);

const allPatch = buildAdminSalesPoolQueryPatch("all");
assert.deepEqual(allPatch, {
  search: "",
  stage: "all",
  payment: "all",
  path: "all",
  tag: "all",
  page: 1,
});

const highPaymentPatch = buildAdminSalesPoolQueryPatch("high-payment");
assert.equal(highPaymentPatch.payment, "高付费意向");
assert.equal(highPaymentPatch.stage, "all");

const novicePatch = buildAdminSalesPoolQueryPatch("novice");
assert.equal(novicePatch.stage, "订单流小白");
assert.equal(novicePatch.tag, "all");

const coursePatch = buildAdminSalesPoolQueryPatch("course-intent");
assert.equal(coursePatch.tag, "课程高意向");
assert.equal(coursePatch.path, "all");

const riskPatch = buildAdminSalesPoolQueryPatch("risk-cooling");
assert.equal(riskPatch.path, "风险降温系统");
assert.equal(riskPatch.payment, "all");

assert.equal(isAdminSalesPoolActive("all", {
  search: "",
  stage: "all",
  payment: "all",
  path: "all",
  tag: "all",
}), true);

assert.equal(isAdminSalesPoolActive("course-intent", {
  search: "",
  stage: "all",
  payment: "all",
  path: "all",
  tag: "课程高意向",
}), true);

assert.equal(isAdminSalesPoolActive("course-intent", {
  search: "",
  stage: "订单流小白",
  payment: "all",
  path: "all",
  tag: "课程高意向",
}), false);

console.log("test-admin-sales-pools: ok");
