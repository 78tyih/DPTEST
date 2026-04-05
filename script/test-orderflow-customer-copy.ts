import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const homePageSource = readFileSync(new URL("../client/src/pages/home.tsx", import.meta.url), "utf8");
const reportPageSource = readFileSync(new URL("../client/src/pages/report.tsx", import.meta.url), "utf8");
const resultPageSource = readFileSync(new URL("../client/src/pages/result.tsx", import.meta.url), "utf8");

assert.equal(homePageSource.includes("付费意向"), false);
assert.equal(homePageSource.includes("交易系统映射"), false);
assert.equal(reportPageSource.includes("customerFacing"), true);
assert.equal(resultPageSource.includes("customerFacing"), true);

console.log("test-orderflow-customer-copy: ok");
