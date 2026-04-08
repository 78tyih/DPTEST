import assert from "node:assert/strict";
import { internalSalesStrategy } from "../server/internal-sales-strategy";

const strategy = internalSalesStrategy.RE;

assert.ok(strategy);
assert.equal(strategy.attitude.length > 0, true);
assert.equal(strategy.opening.length > 0, true);
assert.equal(strategy.avoid.length > 0, true);
assert.equal(strategy.keyHook.length > 0, true);

console.log("test-result-webhook: ok");
