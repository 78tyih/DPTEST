import type { SegmentTagId, DiagnosticTrackId } from "./orderflowDiagnostic";
import type { OrderflowSystemRouteId } from "./orderflowLogicMap";

export interface OrderflowSalesPlaybook {
  responseWindow: string;
  contactGoal: string;
  firstTouch: string;
  materialsToSend: string[];
  avoid: string;
  crmTag: string;
}

const routePlaybookTemplates: Record<OrderflowSystemRouteId, Omit<OrderflowSalesPlaybook, "materialsToSend" | "crmTag">> = {
  "cognition-foundation": {
    responseWindow: "24 小时内跟进即可",
    contactGoal: "先让客户建立正确认知，而不是急着推进成交。",
    firstTouch: "先确认他现在最看不懂的是盘面、概念还是学习顺序，再把学习笔记和 15 分钟视频按顺序发过去。",
    avoid: "不要一上来推课程价格，不要承诺看完资料就能稳定盈利。",
  },
  "live-nurture": {
    responseWindow: "12 小时内触达更好",
    contactGoal: "把客户拉进直播、案例和社群，先形成持续互动。",
    firstTouch: "先从直播或最近案例切入，问他想看老师怎么讲市场，而不是直接问买不买。",
    avoid: "不要追着要决定，不要连续轰炸资料。",
  },
  "course-training": {
    responseWindow: "30 分钟内优先触达",
    contactGoal: "约到一次有效诊断沟通，确认是否进入系统课程承接。",
    firstTouch: "先围绕他当前市场、痛点和训练目标切入，再发课程大纲和真实案例，不要直接堆概念。",
    avoid: "不要空谈方法论，不要只发报名链接。",
  },
  "software-execution": {
    responseWindow: "30 分钟内优先触达",
    contactGoal: "先让客户感受到软件在执行和盘面观察上的具体价值。",
    firstTouch: "先问他现在看盘用什么工具、最卡在哪个执行环节，再给软件试用和盘面演示入口。",
    avoid: "不要一上来把软件讲成圣杯，不要跳过实际场景直接讲配置细节。",
  },
  "evaluation-journey": {
    responseWindow: "2 小时内跟进",
    contactGoal: "把客户从急于实盘拉回训练闭环和考试盘验证路径。",
    firstTouch: "先确认他愿不愿意用模拟盘或考试盘验证，再把阶段目标和过渡路径讲清楚。",
    avoid: "不要直接鼓动他上实盘，不要承诺短期收益。",
  },
  "risk-cooling": {
    responseWindow: "筛选后再跟进",
    contactGoal: "先做预期管理和风险降温，必要时只保留培育。",
    firstTouch: "先围绕风控、预期和训练心态切入，让他知道现在最该补的是底盘，不是立即放大结果。",
    avoid: "不要承诺收益，不要直接推进高价成交，不要强化暴利想象。",
  },
};

function resolveCrmTag(systemRouteId: OrderflowSystemRouteId, priorityLabel: string): string {
  const routeLabelMap: Record<OrderflowSystemRouteId, string> = {
    "cognition-foundation": "资料培育",
    "live-nurture": "直播培育",
    "course-training": "课程承接",
    "software-execution": "软件承接",
    "evaluation-journey": "考试盘承接",
    "risk-cooling": "风险筛选",
  };

  return `${priorityLabel} / ${routeLabelMap[systemRouteId]}`;
}

function mergeMaterials(routeId: OrderflowSystemRouteId, unlockRewardTitles: string[]): string[] {
  const routeMaterials: Record<OrderflowSystemRouteId, string[]> = {
    "cognition-foundation": ["Sera 学习笔记", "15 分钟入门视频", "订单流 FAQ"],
    "live-nurture": ["直播入口", "案例内容", "社群入口"],
    "course-training": ["课程大纲", "案例材料", "学习路径说明"],
    "software-execution": ["软件试用入口", "盘面演示", "配置说明"],
    "evaluation-journey": ["考试盘路径说明", "阶段目标说明", "训练要求"],
    "risk-cooling": ["风控内容", "基础资料", "学习顺序建议"],
  };

  return Array.from(new Set([...routeMaterials[routeId], ...unlockRewardTitles]));
}

export function buildOrderflowSalesPlaybook({
  trackId,
  systemRouteId,
  priorityLabel,
  segmentTagIds,
  unlockRewardTitles,
}: {
  trackId: DiagnosticTrackId;
  systemRouteId: OrderflowSystemRouteId;
  priorityLabel: string;
  segmentTagIds: SegmentTagId[];
  unlockRewardTitles: string[];
}): OrderflowSalesPlaybook {
  const template = routePlaybookTemplates[systemRouteId];
  const materialsToSend = mergeMaterials(systemRouteId, unlockRewardTitles);
  const crmTag = resolveCrmTag(systemRouteId, priorityLabel);

  const trackPrefix = trackId === "starter" ? "浅测" : "深测";
  const highRiskExtra = segmentTagIds.includes("high-risk")
    ? "当前带有高风险信号，沟通时优先做预期管理。"
    : "";

  return {
    responseWindow: template.responseWindow,
    contactGoal: `${trackPrefix}客户当前目标：${template.contactGoal}${highRiskExtra}`,
    firstTouch: template.firstTouch,
    materialsToSend,
    avoid: template.avoid,
    crmTag,
  };
}
