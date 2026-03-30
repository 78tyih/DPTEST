import { salesStrategy } from "@/data/salesStrategy";
import { rankTiers, traderTypes } from "@/data/traderTypes";

interface RegisterWebhookParams {
  phone: string;
  wechatName?: string;
}

interface ResultWebhookParams {
  phone: string;
  wechatName?: string;
  scores: Record<string, number>;
  traderType: { code: string; name: string; emoji: string };
  rank: { name: string; emoji: string };
  avgScore: number;
  salesStrategy: {
    attitude: string;
    opening: string;
    avoid: string;
    keyHook: string;
  };
  verifyCode?: string;
}

interface BuildResultWebhookPayloadParams {
  phone: string;
  wechatName?: string;
  normalizedScores: Record<string, number>;
  traderTypeCode: string;
  avgScore: number;
  rankName: string;
  verifyCode?: string;
}

export function buildResultWebhookPayload({
  phone,
  wechatName,
  normalizedScores,
  traderTypeCode,
  avgScore,
  rankName,
  verifyCode,
}: BuildResultWebhookPayloadParams): ResultWebhookParams {
  const traderType = traderTypes[traderTypeCode];
  const rank = rankTiers.find((item) => item.name === rankName);
  const strategy = salesStrategy[traderTypeCode];

  if (!traderType) {
    throw new Error(`Unknown trader type code: ${traderTypeCode}`);
  }

  if (!rank) {
    throw new Error(`Unknown rank name: ${rankName}`);
  }

  if (!strategy) {
    throw new Error(`Missing sales strategy for trader type: ${traderTypeCode}`);
  }

  return {
    phone,
    wechatName,
    scores: normalizedScores,
    traderType: {
      code: traderType.code,
      name: traderType.name,
      emoji: traderType.icon,
    },
    rank: {
      name: rank.name,
      emoji: rank.icon,
    },
    avgScore,
    salesStrategy: strategy,
    verifyCode,
  };
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

export async function sendResultWebhook({ phone, wechatName, scores, traderType, rank, avgScore, salesStrategy, verifyCode }: ResultWebhookParams) {
  try {
    const res = await fetch('/api/webhook/result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, wechatName, scores, traderType, rank, avgScore, salesStrategy, verifyCode }),
    });
    return await res.json();
  } catch (err) {
    console.error('结果 webhook 失败:', err);
    return { success: true, webhookError: true };
  }
}
