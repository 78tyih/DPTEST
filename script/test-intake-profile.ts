import assert from "node:assert/strict";
import { loadIntakeProfile, saveIntakeProfile } from "../client/src/utils/intake";

const storage = new Map<string, string>();

Object.defineProperty(globalThis, "sessionStorage", {
  value: {
    getItem: (key: string) => storage.get(`s:${key}`) ?? null,
    setItem: (key: string, value: string) => { storage.set(`s:${key}`, value); },
    removeItem: (key: string) => { storage.delete(`s:${key}`); },
  },
  configurable: true,
});

Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (key: string) => storage.get(`l:${key}`) ?? null,
    setItem: (key: string, value: string) => { storage.set(`l:${key}`, value); },
    removeItem: (key: string) => { storage.delete(`l:${key}`); },
  },
  configurable: true,
});

saveIntakeProfile({
  primaryMarkets: ["期货", "加密货币"],
  tradingCapitalRange: "30万到100万",
  tradingExperience: "1-3年",
  tradingSystem: "价格行为 / ICT / SMC",
});

const loaded = loadIntakeProfile();
assert.deepEqual(loaded, {
  primaryMarkets: ["期货", "加密货币"],
  tradingCapitalRange: "30万到100万",
  tradingExperience: "1-3年",
  tradingSystem: "价格行为 / ICT / SMC",
});

console.log("test-intake-profile: ok");
