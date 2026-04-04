import assert from "node:assert/strict";
import {
  DEFAULT_WECHAT_CONTACT,
  DEFAULT_WECHAT_CONTACT_URL,
  buildWechatContactPayload,
} from "../shared/wechatContact";

assert.equal(
  DEFAULT_WECHAT_CONTACT_URL,
  "https://work.weixin.qq.com/ca/cawcde1551ac975840",
);

assert.equal(DEFAULT_WECHAT_CONTACT.name, "默认顾问");
assert.equal(DEFAULT_WECHAT_CONTACT.url, DEFAULT_WECHAT_CONTACT_URL);

const payload = buildWechatContactPayload();
assert.deepEqual(payload, {
  name: "默认顾问",
  url: "https://work.weixin.qq.com/ca/cawcde1551ac975840",
  verified: true,
});

console.log("test-wechat-contact-config: ok");
