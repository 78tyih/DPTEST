import type { DiagnosticDimension, DiagnosticTrackId, SegmentTagId } from "./orderflowDiagnostic";

export type OrderflowScoreBandId =
  | "starter-foundation"
  | "starter-ready"
  | "starter-upgrade"
  | "deep-observe"
  | "deep-build"
  | "deep-convert"
  | "deep-priority";

export type OrderflowSystemRouteId =
  | "cognition-foundation"
  | "live-nurture"
  | "course-training"
  | "software-execution"
  | "evaluation-journey"
  | "risk-cooling";

export interface OrderflowQuestionLogic {
  questionId: string;
  track: DiagnosticTrackId;
  objective: string;
  diagnose: string;
  primaryDimensions: DiagnosticDimension[];
  primaryTags: SegmentTagId[];
  routeHints: OrderflowSystemRouteId[];
}

export interface OrderflowSystemRoute {
  id: OrderflowSystemRouteId;
  label: string;
  description: string;
  fitFor: string;
  salesFocus: string;
  nextStep: string;
}

export interface OrderflowSystemMapping {
  route: OrderflowSystemRoute;
  reason: string;
}

export const orderflowQuestionLogicMap: Record<string, OrderflowQuestionLogic> = {
  "starter-market": {
    questionId: "starter-market",
    track: "starter",
    objective: "识别用户当前所处市场，判断订单流适配路径。",
    diagnose: "看用户是偏内盘、黄金外汇、加密还是纯小白。",
    primaryDimensions: ["market-fit", "tool-readiness"],
    primaryTags: ["software-priority", "live-nurture"],
    routeHints: ["software-execution", "live-nurture"],
  },
  "starter-experience": {
    questionId: "starter-experience",
    track: "starter",
    objective: "判断交易基础和学习起点。",
    diagnose: "看用户是刚接触、磨合期还是已具备一定交易经验。",
    primaryDimensions: ["awareness", "execution", "risk-control"],
    primaryTags: ["free-resource", "course-intent", "evaluation-path"],
    routeHints: ["cognition-foundation", "course-training"],
  },
  "starter-live": {
    questionId: "starter-live",
    track: "starter",
    objective: "确认用户对德湃内容的熟悉度和预热程度。",
    diagnose: "看用户是纯陌生、轻度接触还是已经持续关注。",
    primaryDimensions: ["awareness", "commercial-intent"],
    primaryTags: ["live-nurture", "course-intent"],
    routeHints: ["live-nurture", "course-training"],
  },
  "starter-knowledge": {
    questionId: "starter-knowledge",
    track: "starter",
    objective: "判断用户对订单流本质的理解偏差。",
    diagnose: "识别他把订单流看成资金行为、普通指标还是赚钱神器。",
    primaryDimensions: ["awareness"],
    primaryTags: ["high-risk", "live-nurture"],
    routeHints: ["risk-cooling", "cognition-foundation"],
  },
  "starter-pain": {
    questionId: "starter-pain",
    track: "starter",
    objective: "定位用户当前最强痛点。",
    diagnose: "判断他卡在认知、执行、风控还是路径选择。",
    primaryDimensions: ["awareness", "execution", "risk-control", "commercial-intent"],
    primaryTags: ["course-intent", "software-priority", "high-risk", "evaluation-path"],
    routeHints: ["course-training", "software-execution", "risk-cooling", "evaluation-journey"],
  },
  "starter-offer": {
    questionId: "starter-offer",
    track: "starter",
    objective: "判断用户希望从哪个入口先承接。",
    diagnose: "区分资料型、直播型、课程型还是软件型需求。",
    primaryDimensions: ["commercial-intent", "tool-readiness"],
    primaryTags: ["free-resource", "live-nurture", "course-intent", "software-priority"],
    routeHints: ["cognition-foundation", "live-nurture", "course-training", "software-execution"],
  },
  "starter-evaluation": {
    questionId: "starter-evaluation",
    track: "starter",
    objective: "判断用户是否接受训练闭环和延迟满足。",
    diagnose: "看他是认可模拟盘/考试盘，还是想直接验证赚钱能力。",
    primaryDimensions: ["risk-control", "execution", "commercial-intent"],
    primaryTags: ["evaluation-path", "high-risk"],
    routeHints: ["evaluation-journey", "risk-cooling"],
  },
  "deep-awareness": {
    questionId: "deep-awareness",
    track: "deep",
    objective: "确认用户有没有把订单流神化。",
    diagnose: "看用户能不能把订单流放回风控、资金管理和训练框架里。",
    primaryDimensions: ["awareness", "risk-control"],
    primaryTags: ["course-intent", "software-priority", "high-risk"],
    routeHints: ["course-training", "software-execution", "risk-cooling"],
  },
  "deep-market-path": {
    questionId: "deep-market-path",
    track: "deep",
    objective: "确认用户是否理解不同市场的正确使用路径。",
    diagnose: "重点识别黄金外汇用户是否知道期货盘看单、MT4/5 执行这条路。",
    primaryDimensions: ["awareness", "market-fit"],
    primaryTags: ["course-intent", "software-priority", "high-risk"],
    routeHints: ["course-training", "software-execution", "risk-cooling"],
  },
  "deep-risk": {
    questionId: "deep-risk",
    track: "deep",
    objective: "识别风控成熟度。",
    diagnose: "看用户是固定风险管理，还是随感觉放大仓位。",
    primaryDimensions: ["risk-control", "execution"],
    primaryTags: ["course-intent", "high-risk"],
    routeHints: ["course-training", "risk-cooling"],
  },
  "deep-losers": {
    questionId: "deep-losers",
    track: "deep",
    objective: "识别亏损后的行为模式。",
    diagnose: "区分会停手复盘的人，还是会回本冲动和乱换方法的人。",
    primaryDimensions: ["risk-control", "execution", "awareness"],
    primaryTags: ["course-intent", "high-risk"],
    routeHints: ["course-training", "risk-cooling"],
  },
  "deep-review": {
    questionId: "deep-review",
    track: "deep",
    objective: "识别复盘和日志习惯。",
    diagnose: "看用户是否具备真正可训练的基础。",
    primaryDimensions: ["execution", "awareness"],
    primaryTags: ["course-intent", "evaluation-path", "high-risk"],
    routeHints: ["course-training", "evaluation-journey", "risk-cooling"],
  },
  "deep-training": {
    questionId: "deep-training",
    track: "deep",
    objective: "确认用户是否接受训练闭环。",
    diagnose: "区分愿意先验证的人，还是更想直接上实盘的人。",
    primaryDimensions: ["execution", "risk-control", "commercial-intent"],
    primaryTags: ["evaluation-path", "course-intent", "high-risk"],
    routeHints: ["evaluation-journey", "course-training", "risk-cooling"],
  },
  "deep-tools": {
    questionId: "deep-tools",
    track: "deep",
    objective: "识别工具准备度和软件接受度。",
    diagnose: "看用户是在用工具、愿意试用，还是排斥工具。",
    primaryDimensions: ["tool-readiness", "awareness", "commercial-intent"],
    primaryTags: ["software-priority", "course-intent", "free-resource"],
    routeHints: ["software-execution", "course-training", "cognition-foundation"],
  },
  "deep-time": {
    questionId: "deep-time",
    track: "deep",
    objective: "识别未来 30 天的执行可能性。",
    diagnose: "看用户是真有时间训练，还是只停留在兴趣层。",
    primaryDimensions: ["execution", "commercial-intent"],
    primaryTags: ["course-intent", "evaluation-path", "free-resource"],
    routeHints: ["course-training", "evaluation-journey", "cognition-foundation"],
  },
  "deep-goal": {
    questionId: "deep-goal",
    track: "deep",
    objective: "确认最直接的承接目标。",
    diagnose: "区分课程、软件、考试盘还是继续观察。",
    primaryDimensions: ["commercial-intent", "tool-readiness", "risk-control", "execution"],
    primaryTags: ["course-intent", "software-priority", "evaluation-path", "live-nurture"],
    routeHints: ["course-training", "software-execution", "evaluation-journey", "live-nurture"],
  },
  "deep-notes": {
    questionId: "deep-notes",
    track: "deep",
    objective: "判断内容预热程度。",
    diagnose: "看用户是已经系统消费过内容，还是还停留在浅接触。",
    primaryDimensions: ["awareness", "commercial-intent"],
    primaryTags: ["course-intent", "live-nurture", "free-resource"],
    routeHints: ["course-training", "live-nurture", "cognition-foundation"],
  },
  "deep-discipline": {
    questionId: "deep-discipline",
    track: "deep",
    objective: "识别纪律执行的真实水平。",
    diagnose: "看用户会不会在系统和主观之间反复 override。",
    primaryDimensions: ["execution", "risk-control", "awareness"],
    primaryTags: ["evaluation-path", "course-intent", "high-risk"],
    routeHints: ["evaluation-journey", "course-training", "risk-cooling"],
  },
  "deep-conversion": {
    questionId: "deep-conversion",
    track: "deep",
    objective: "确认用户更愿意如何往下一步推进。",
    diagnose: "看用户是直接约沟通、先试用、继续培育还是只看阶段判断。",
    primaryDimensions: ["commercial-intent", "tool-readiness", "awareness"],
    primaryTags: ["course-intent", "software-priority", "live-nurture", "free-resource"],
    routeHints: ["course-training", "software-execution", "live-nurture", "cognition-foundation"],
  },
};

export const orderflowSystemRoutes: Record<OrderflowSystemRouteId, OrderflowSystemRoute> = {
  "cognition-foundation": {
    id: "cognition-foundation",
    label: "认知打底系统",
    description: "先用资料、FAQ 和基础内容把用户从概念混乱拉到正确认知。",
    fitFor: "适合浅测低分、资料型、对订单流理解仍很模糊的用户。",
    salesFocus: "先给资料和学习顺序，不急着推进成交。",
    nextStep: "优先发学习笔记、15 分钟视频和 FAQ，观察二次互动再推进。",
  },
  "live-nurture": {
    id: "live-nurture",
    label: "直播培育系统",
    description: "用直播、案例和公开内容持续预热，先建立信任和理解。",
    fitFor: "适合对德湃有兴趣但还没形成明确购买动作的用户。",
    salesFocus: "通过直播和案例持续教育，降低直接成交压力。",
    nextStep: "先发直播、案例和社群入口，再根据互动强度推进深测或诊断沟通。",
  },
  "course-training": {
    id: "course-training",
    label: "课程训练系统",
    description: "承接到系统课程、训练节奏和一对一诊断沟通。",
    fitFor: "适合认知基础较好、愿意训练、课程意向明确的用户。",
    salesFocus: "从课程大纲、训练节奏、案例和反馈机制切入。",
    nextStep: "优先安排诊断沟通，发送课程大纲、学习路径和案例材料。",
  },
  "software-execution": {
    id: "software-execution",
    label: "软件执行系统",
    description: "先用软件试用和盘面演示承接，再判断是否接课程。",
    fitFor: "适合工具接受度高、执行问题明显、想先看软件价值的用户。",
    salesFocus: "强调盘面演示、执行提升和真实使用场景。",
    nextStep: "优先发软件试用申请、演示入口和配置说明，再约短沟通。",
  },
  "evaluation-journey": {
    id: "evaluation-journey",
    label: "考试盘验证系统",
    description: "先把用户拉进模拟盘 / 考试盘的验证路径，而不是直接追求实盘结果。",
    fitFor: "适合接受训练闭环、愿意验证方法、追求稳步过渡的用户。",
    salesFocus: "强调训练、验证和阶段目标，不讨论一夜暴利。",
    nextStep: "先给考试盘路径说明、阶段目标和训练要求，再决定是否接课程。",
  },
  "risk-cooling": {
    id: "risk-cooling",
    label: "风险降温系统",
    description: "先处理急于赚钱、神化工具和风控失序，不直接做高价转化。",
    fitFor: "适合高风险标签明显、急于验证结果、纪律和风控不足的用户。",
    salesFocus: "先做预期管理和风险教育，避免承诺结果。",
    nextStep: "先发风控内容和基础材料，必要时只保留培育，不推进高价产品。",
  },
};

const segmentTagRoutePriority: Record<SegmentTagId, OrderflowSystemRouteId> = {
  "course-intent": "course-training",
  "software-priority": "software-execution",
  "live-nurture": "live-nurture",
  "evaluation-path": "evaluation-journey",
  "free-resource": "cognition-foundation",
  "high-risk": "risk-cooling",
};

const scoreBandFallbackRoute: Record<OrderflowScoreBandId, OrderflowSystemRouteId> = {
  "starter-foundation": "cognition-foundation",
  "starter-ready": "live-nurture",
  "starter-upgrade": "course-training",
  "deep-observe": "cognition-foundation",
  "deep-build": "course-training",
  "deep-convert": "course-training",
  "deep-priority": "course-training",
};

export function resolveOrderflowSystemMapping({
  trackId,
  scoreBandId,
  segmentTagIds,
}: {
  trackId: DiagnosticTrackId;
  scoreBandId: OrderflowScoreBandId;
  segmentTagIds: SegmentTagId[];
}): OrderflowSystemMapping {
  if (segmentTagIds.includes("high-risk")) {
    return {
      route: orderflowSystemRoutes["risk-cooling"],
      reason: "当前结果里出现高风险信号，高风险处理优先级高于其他承接动作。",
    };
  }

  for (const segmentTagId of segmentTagIds) {
    const routeId = segmentTagRoutePriority[segmentTagId];
    if (routeId) {
      return {
        route: orderflowSystemRoutes[routeId],
        reason: `当前最高信号标签是 ${segmentTagId}，因此优先映射到 ${orderflowSystemRoutes[routeId].label}。`,
      };
    }
  }

  const fallbackRouteId = scoreBandFallbackRoute[scoreBandId];

  return {
    route: orderflowSystemRoutes[fallbackRouteId],
    reason: `${trackId === "starter" ? "浅测" : "深测"}没有出现强标签，按分层 ${scoreBandId} 的默认路径承接。`,
  };
}
