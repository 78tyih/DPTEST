import assert from "node:assert/strict";
import { rewardAssets } from "../client/src/data/orderflowDiagnostic";
import {
  buildSurveyEntryUrl,
  getOfficialSiteUrl,
  resolveRewardAction,
  resolveSurveyBaseUrl,
} from "../client/src/utils/diagnosticLinks";

assert.equal(resolveSurveyBaseUrl("https://example.com/"), "https://example.com");
assert.equal(buildSurveyEntryUrl("starter", "https://example.com"), "https://example.com/?track=starter");
assert.equal(buildSurveyEntryUrl("deep", "https://example.com/"), "https://example.com/?track=deep");
assert.equal(buildSurveyEntryUrl(undefined, "https://example.com"), "https://example.com/");

const directReward = rewardAssets.find((item) => item.id === "sera-notes");
assert.ok(directReward);
const directAction = resolveRewardAction(directReward!);
assert.equal(directAction.href, directReward!.url);
assert.equal(directAction.label, "打开资料");
assert.equal(directAction.external, true);

const softwareReward = rewardAssets.find((item) => item.id === "software-trial");
assert.ok(softwareReward);
const softwareAction = resolveRewardAction(softwareReward!);
assert.equal(softwareAction.href.startsWith(getOfficialSiteUrl()), true);
assert.equal(softwareAction.label, "前往官网领取");
assert.equal(softwareAction.external, true);

console.log("test-diagnostic-links: ok");
