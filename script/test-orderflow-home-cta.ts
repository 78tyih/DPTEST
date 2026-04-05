import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const homePageSource = readFileSync(new URL("../client/src/pages/home.tsx", import.meta.url), "utf8");

assert.equal(homePageSource.includes("重做浅测"), false);
assert.equal(homePageSource.includes("重做深测"), false);
assert.equal(homePageSource.includes("添加客服获取深度诊断报告"), true);
assert.equal(homePageSource.includes("添加客服后可领取深度诊断报告"), true);

console.log("test-orderflow-home-cta: ok");
