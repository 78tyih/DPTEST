import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const homePageSource = readFileSync(new URL("../client/src/pages/home.tsx", import.meta.url), "utf8");
const reportPageSource = readFileSync(new URL("../client/src/pages/report.tsx", import.meta.url), "utf8");
const resultPageSource = readFileSync(new URL("../client/src/pages/result.tsx", import.meta.url), "utf8");
const presentationSource = readFileSync(new URL("../client/src/data/orderflowPresentation.ts", import.meta.url), "utf8");

assert.equal(homePageSource.includes("付费意向"), false);
assert.equal(homePageSource.includes("交易系统映射"), false);
assert.equal(reportPageSource.includes("customerFacing"), true);
assert.equal(resultPageSource.includes("customerFacing"), true);
assert.equal(reportPageSource.includes("销售跟进和后续路径承接"), false);
assert.equal(presentationSource.includes("课程、软件、直播培育，还是考试盘路径"), false);

console.log("test-orderflow-customer-copy: ok");
