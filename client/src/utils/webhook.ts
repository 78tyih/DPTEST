interface RegisterWebhookParams {
  phone: string;
  wechatName?: string;
}

interface ResultWebhookParams {
  phone: string;
  wechatName?: string;
  scores: Record<string, number>;
  traderTypeCode: string;
  traderType: { code: string; name: string; emoji: string };
  rank: { name: string; emoji: string };
  avgScore: number;
  verifyCode?: string;
}

export async function sendRegisterWebhook({ phone, wechatName }: RegisterWebhookParams) {
  try {
    const res = await fetch('/api/webhook/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, wechatName }),
    });
    return await res.json();
  } catch (err) {
    console.error('注册 webhook 失败:', err);
    return { success: true, webhookError: true };
  }
}

export async function sendResultWebhook({ phone, wechatName, scores, traderTypeCode, traderType, rank, avgScore, verifyCode }: ResultWebhookParams) {
  try {
    const res = await fetch('/api/webhook/result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, wechatName, scores, traderTypeCode, traderType, rank, avgScore, verifyCode }),
    });
    return await res.json();
  } catch (err) {
    console.error('结果 webhook 失败:', err);
    return { success: true, webhookError: true };
  }
}
