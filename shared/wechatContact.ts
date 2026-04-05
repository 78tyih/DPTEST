export const DEFAULT_WECHAT_CONTACT_URL = "https://work.weixin.qq.com/ca/cawcde1551ac975840";

export const DEFAULT_WECHAT_CONTACT = {
  name: "默认顾问",
  url: DEFAULT_WECHAT_CONTACT_URL,
} as const;

export function buildWechatContactPayload() {
  return {
    ...DEFAULT_WECHAT_CONTACT,
    verified: true,
  };
}
