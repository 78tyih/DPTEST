export type DiagnosticTrackId = "starter" | "deep";

export type DiagnosticDimension =
  | "awareness"
  | "market-fit"
  | "risk-control"
  | "execution"
  | "tool-readiness"
  | "commercial-intent";

export type SegmentTagId =
  | "course-intent"
  | "software-priority"
  | "live-nurture"
  | "evaluation-path"
  | "free-resource"
  | "high-risk";

export interface DiagnosticTrack {
  id: DiagnosticTrackId;
  title: string;
  duration: string;
  questionCount: number;
}

export interface RewardAsset {
  id: string;
  unlockLevel: DiagnosticTrackId;
  title: string;
  description: string;
  url?: string;
}

export interface ScoreBand {
  id: string;
  track: DiagnosticTrackId;
  title: string;
  min: number;
  max: number;
  summary: string;
}

export interface SegmentTagDefinition {
  id: SegmentTagId;
  label: string;
  priority: "P0" | "P1" | "P2" | "P3";
  salesAction: string;
}

export interface DiagnosticQuestionOption {
  text: string;
  tag: string;
  dimensionScores: Partial<Record<DiagnosticDimension, number>>;
  segmentSignals?: Partial<Record<SegmentTagId, number>>;
}

export interface DiagnosticQuestion {
  id: string;
  track: DiagnosticTrackId;
  text: string;
  options: DiagnosticQuestionOption[];
}

export const diagnosticDimensionLabels: Record<DiagnosticDimension, string> = {
  awareness: "订单流认知",
  "market-fit": "市场适配",
  "risk-control": "风控成熟度",
  execution: "执行训练度",
  "tool-readiness": "工具准备度",
  "commercial-intent": "服务意向",
};

export const diagnosticTracks: Record<DiagnosticTrackId, DiagnosticTrack> = {
  starter: {
    id: "starter",
    title: "浅度测评",
    duration: "2-3 分钟",
    questionCount: 7,
  },
  deep: {
    id: "deep",
    title: "深度测评",
    duration: "5-8 分钟",
    questionCount: 12,
  },
};

export const rewardAssets: RewardAsset[] = [
  {
    id: "sera-notes",
    unlockLevel: "starter",
    title: "Sera 的订单流学习笔记",
    description: "订单流学习方法与知识精华，持续更新。",
    url: "https://flowus.cn/share/837f5d10-9ac4-45ee-83d2-60e669b1b23b?code=GYGFED",
  },
  {
    id: "video-15min",
    unlockLevel: "starter",
    title: "15 分钟德湃庄家订单流战法",
    description: "适合第一次接触订单流的用户先建立直观感受。",
    url: "https://meeting.tencent.com/crm/lJWyRP79ff",
  },
  {
    id: "community",
    unlockLevel: "starter",
    title: "Deltapex 腾讯频道",
    description: "持续接收直播、资料和社区更新。",
    url: "https://pd.qq.com/s/fetkc4duq?b=9",
  },
  {
    id: "faq-pack",
    unlockLevel: "deep",
    title: "关于学习订单流的常见问题",
    description: "集中回答入门和进阶阶段的高频疑问。",
    url: "https://flowus.cn/share/dbddfeb4-da1d-4d30-ac3e-58ea1f647c24?code=GYGFED",
  },
  {
    id: "session-two",
    unlockLevel: "deep",
    title: "先导二：德湃 2025 庄家订单流战法",
    description: "进一步建立对训练路径和盘面观察方式的理解。",
    url: "https://meeting.tencent.com/crm/24bj87myf8",
  },
  {
    id: "software-trial",
    unlockLevel: "deep",
    title: "软件试用与进群资格",
    description: "完成深测后按标签发放试用和进群资格。",
  },
  {
    id: "course-outline",
    unlockLevel: "deep",
    title: "课程大纲与个性化跟进",
    description: "向高意向用户推送课程大纲并同步销售跟进。",
  },
];

export const scoreBands: ScoreBand[] = [
  {
    id: "starter-foundation",
    track: "starter",
    title: "先建立订单流基础认知",
    min: 0,
    max: 39,
    summary: "你更适合先建立基础认知和正确预期，再决定是否继续深入。",
  },
  {
    id: "starter-ready",
    track: "starter",
    title: "具备继续深测的基础",
    min: 40,
    max: 69,
    summary: "你已经不是纯小白，适合继续做深测看真实适配度和承接路径。",
  },
  {
    id: "starter-upgrade",
    track: "starter",
    title: "建议直接进入深度诊断",
    min: 70,
    max: 100,
    summary: "你的基础认知和服务意向已经出现，适合直接进入深度诊断。",
  },
  {
    id: "deep-observe",
    track: "deep",
    title: "先补认知与训练底盘",
    min: 0,
    max: 44,
    summary: "当前更适合先做认知、风控和训练打底，不建议急着追求结果。",
  },
  {
    id: "deep-build",
    track: "deep",
    title: "适合进入系统训练期",
    min: 45,
    max: 64,
    summary: "已经具备一定基础，适合通过系统课程和训练反馈继续推进。",
  },
  {
    id: "deep-convert",
    track: "deep",
    title: "高匹配，可进入承接",
    min: 65,
    max: 84,
    summary: "匹配度和意向都较明确，适合承接到课程、软件或考试盘路径。",
  },
  {
    id: "deep-priority",
    track: "deep",
    title: "高优先级客户",
    min: 85,
    max: 100,
    summary: "建议尽快同步销售高优先级跟进，不要只放进普通培育池。",
  },
];

export const segmentTagDefinitions: Record<SegmentTagId, SegmentTagDefinition> = {
  "course-intent": {
    id: "course-intent",
    label: "课程高意向",
    priority: "P0",
    salesAction: "优先推课程大纲、案例和一对一诊断沟通。",
  },
  "software-priority": {
    id: "software-priority",
    label: "软件试用优先",
    priority: "P1",
    salesAction: "先演示软件和场景，再决定是否衔接课程。",
  },
  "live-nurture": {
    id: "live-nurture",
    label: "直播培育",
    priority: "P2",
    salesAction: "先用直播、FAQ 和案例内容继续教育，不急于成交。",
  },
  "evaluation-path": {
    id: "evaluation-path",
    label: "考试盘路径",
    priority: "P1",
    salesAction: "强调模拟/考试盘验证，再逐步过渡到实盘训练。",
  },
  "free-resource": {
    id: "free-resource",
    label: "免费资料型",
    priority: "P3",
    salesAction: "优先沉淀到资料池，不占用高价值销售时间。",
  },
  "high-risk": {
    id: "high-risk",
    label: "高风险用户",
    priority: "P0",
    salesAction: "先做风险降温和预期管理，不直接推进高价成交。",
  },
};

export const diagnosticQuestions: Record<DiagnosticTrackId, DiagnosticQuestion[]> = {
  starter: [
    {
      id: "starter-market",
      track: "starter",
      text: "你现在主要在什么市场做交易？",
      options: [
        {
          text: "内盘期货",
          tag: "内盘",
          dimensionScores: { "market-fit": 10, "tool-readiness": 6, "commercial-intent": 4 },
          segmentSignals: { "software-priority": 3, "course-intent": 2 },
        },
        {
          text: "黄金 / 外汇",
          tag: "黄金外汇",
          dimensionScores: { "market-fit": 8, awareness: 4, "commercial-intent": 3 },
          segmentSignals: { "live-nurture": 2, "course-intent": 2 },
        },
        {
          text: "加密币",
          tag: "加密",
          dimensionScores: { "market-fit": 7, execution: 4, "commercial-intent": 3 },
          segmentSignals: { "software-priority": 2, "live-nurture": 2 },
        },
        {
          text: "还没开始实盘",
          tag: "小白",
          dimensionScores: { awareness: 2, "risk-control": 2, "commercial-intent": 2 },
          segmentSignals: { "free-resource": 3, "live-nurture": 2 },
        },
      ],
    },
    {
      id: "starter-experience",
      track: "starter",
      text: "你的交易经验大概多久？",
      options: [
        {
          text: "还没开始 / 刚接触",
          tag: "新手",
          dimensionScores: { awareness: 2, execution: 2 },
          segmentSignals: { "free-resource": 3, "live-nurture": 2 },
        },
        {
          text: "3 个月以内",
          tag: "起步",
          dimensionScores: { awareness: 4, execution: 3, "risk-control": 3 },
          segmentSignals: { "live-nurture": 3 },
        },
        {
          text: "3-12 个月",
          tag: "磨合期",
          dimensionScores: { awareness: 5, execution: 5, "risk-control": 4 },
          segmentSignals: { "course-intent": 2, "evaluation-path": 2 },
        },
        {
          text: "1 年以上",
          tag: "老手",
          dimensionScores: { awareness: 7, execution: 6, "risk-control": 6, "commercial-intent": 4 },
          segmentSignals: { "course-intent": 3, "software-priority": 2 },
        },
      ],
    },
    {
      id: "starter-live",
      track: "starter",
      text: "你对德湃公开内容的熟悉度更接近哪种状态？",
      options: [
        {
          text: "没看过",
          tag: "陌生",
          dimensionScores: { awareness: 2, "commercial-intent": 1 },
          segmentSignals: { "free-resource": 2, "live-nurture": 3 },
        },
        {
          text: "看过 1-2 次，但还不太懂",
          tag: "看过但模糊",
          dimensionScores: { awareness: 4, "commercial-intent": 3 },
          segmentSignals: { "live-nurture": 4 },
        },
        {
          text: "持续关注，想系统理解",
          tag: "关注中",
          dimensionScores: { awareness: 7, "commercial-intent": 7 },
          segmentSignals: { "course-intent": 4, "software-priority": 1 },
        },
        {
          text: "已经跟过一段时间，想进一步验证",
          tag: "深度关注",
          dimensionScores: { awareness: 8, "commercial-intent": 8, execution: 5 },
          segmentSignals: { "course-intent": 4, "evaluation-path": 3 },
        },
      ],
    },
    {
      id: "starter-knowledge",
      track: "starter",
      text: "你理解中的订单流，更接近下面哪一种？",
      options: [
        {
          text: "观察挂单、成交、撤单背后的资金行为",
          tag: "理解较准确",
          dimensionScores: { awareness: 10, "market-fit": 4 },
          segmentSignals: { "course-intent": 2 },
        },
        {
          text: "一种自动预测涨跌的指标",
          tag: "神化工具",
          dimensionScores: { awareness: 2 },
          segmentSignals: { "high-risk": 3, "free-resource": 1 },
        },
        {
          text: "跟 K 线和均线差不多，只是更复杂",
          tag: "理解不足",
          dimensionScores: { awareness: 3 },
          segmentSignals: { "live-nurture": 2 },
        },
        {
          text: "不太清楚，所以想先测一下自己适不适合",
          tag: "探索中",
          dimensionScores: { awareness: 4, "commercial-intent": 3 },
          segmentSignals: { "live-nurture": 2, "free-resource": 2 },
        },
      ],
    },
    {
      id: "starter-pain",
      track: "starter",
      text: "你现在最想解决的交易问题是什么？",
      options: [
        {
          text: "看不懂盘面，不知道资金在做什么",
          tag: "认知问题",
          dimensionScores: { awareness: 3, execution: 3, "commercial-intent": 4 },
          segmentSignals: { "course-intent": 3, "live-nurture": 2 },
        },
        {
          text: "有方向但入场不稳定",
          tag: "执行问题",
          dimensionScores: { execution: 3, "tool-readiness": 4, "commercial-intent": 5 },
          segmentSignals: { "software-priority": 4, "course-intent": 2 },
        },
        {
          text: "总是管不住止损和仓位",
          tag: "风控问题",
          dimensionScores: { "risk-control": 2, "commercial-intent": 4 },
          segmentSignals: { "high-risk": 4, "course-intent": 2 },
        },
        {
          text: "不知道自己该先学课程、软件还是考试盘",
          tag: "路径不清晰",
          dimensionScores: { "commercial-intent": 6, awareness: 4 },
          segmentSignals: { "evaluation-path": 3, "course-intent": 2, "software-priority": 2 },
        },
      ],
    },
    {
      id: "starter-offer",
      track: "starter",
      text: "如果先给你一个入口，你更希望从哪一步开始？",
      options: [
        {
          text: "先看免费资料和学习笔记",
          tag: "资料优先",
          dimensionScores: { "commercial-intent": 3 },
          segmentSignals: { "free-resource": 4, "live-nurture": 1 },
        },
        {
          text: "先看直播和老师实盘讲解",
          tag: "直播优先",
          dimensionScores: { "commercial-intent": 5, awareness: 4 },
          segmentSignals: { "live-nurture": 4 },
        },
        {
          text: "先了解课程体系",
          tag: "课程优先",
          dimensionScores: { "commercial-intent": 8, awareness: 4 },
          segmentSignals: { "course-intent": 5 },
        },
        {
          text: "先看软件能不能帮我提升执行",
          tag: "软件优先",
          dimensionScores: { "commercial-intent": 7, "tool-readiness": 6 },
          segmentSignals: { "software-priority": 5 },
        },
      ],
    },
    {
      id: "starter-evaluation",
      track: "starter",
      text: "如果路径清晰，你能接受先模拟盘 / 考试盘，再进实盘吗？",
      options: [
        {
          text: "可以，这是更稳妥的方式",
          tag: "认可训练",
          dimensionScores: { "risk-control": 8, execution: 6, "commercial-intent": 5 },
          segmentSignals: { "evaluation-path": 5, "course-intent": 2 },
        },
        {
          text: "可以，但希望尽快进入实盘",
          tag: "偏激进",
          dimensionScores: { "risk-control": 5, execution: 6, "commercial-intent": 5 },
          segmentSignals: { "evaluation-path": 3, "software-priority": 2 },
        },
        {
          text: "不太想，我更想直接验证赚钱能力",
          tag: "急于验证",
          dimensionScores: { "risk-control": 2, "commercial-intent": 4 },
          segmentSignals: { "high-risk": 4, "course-intent": 1 },
        },
        {
          text: "还没想好",
          tag: "观望",
          dimensionScores: { awareness: 3, "commercial-intent": 2 },
          segmentSignals: { "live-nurture": 2, "free-resource": 1 },
        },
      ],
    },
  ],
  deep: [
    {
      id: "deep-awareness",
      track: "deep",
      text: "你现在怎么看订单流和稳定盈利之间的关系？",
      options: [
        {
          text: "不能，必须配合风控、资金管理和训练",
          tag: "认知扎实",
          dimensionScores: { awareness: 10, "risk-control": 6 },
          segmentSignals: { "course-intent": 3 },
        },
        {
          text: "理论上可以，只要工具足够强",
          tag: "过度神化",
          dimensionScores: { awareness: 2, "commercial-intent": 3 },
          segmentSignals: { "high-risk": 4 },
        },
        {
          text: "不确定，但我想验证这件事",
          tag: "验证型",
          dimensionScores: { awareness: 5, "commercial-intent": 4 },
          segmentSignals: { "evaluation-path": 2, "course-intent": 1 },
        },
        {
          text: "我更想看它能不能提升入场和持仓质量",
          tag: "工具视角",
          dimensionScores: { awareness: 8, execution: 4, "tool-readiness": 4 },
          segmentSignals: { "software-priority": 3, "course-intent": 2 },
        },
      ],
    },
    {
      id: "deep-market-path",
      track: "deep",
      text: "如果你主要做黄金 / 外汇，更合理的订单流路径是什么？",
      options: [
        {
          text: "用期货黄金的订单流看盘，再回到 MT4/MT5 执行",
          tag: "路径正确",
          dimensionScores: { awareness: 8, "market-fit": 9 },
          segmentSignals: { "course-intent": 2, "software-priority": 2 },
        },
        {
          text: "直接在 MT4/MT5 里看完整订单流",
          tag: "工具误解",
          dimensionScores: { awareness: 2, "market-fit": 2 },
          segmentSignals: { "high-risk": 2 },
        },
        {
          text: "只看消息面和均线就够了",
          tag: "排斥微观结构",
          dimensionScores: { awareness: 1, "market-fit": 2 },
          segmentSignals: { "free-resource": 1 },
        },
        {
          text: "我不做黄金 / 外汇",
          tag: "非目标市场",
          dimensionScores: { "market-fit": 5 },
          segmentSignals: { "software-priority": 1 },
        },
      ],
    },
    {
      id: "deep-risk",
      track: "deep",
      text: "你平时单笔风险通常怎么控制？",
      options: [
        {
          text: "固定比例或固定亏损上限，基本不会突破",
          tag: "成熟风控",
          dimensionScores: { "risk-control": 10, execution: 5 },
          segmentSignals: { "evaluation-path": 2, "course-intent": 2 },
        },
        {
          text: "会设止损，但仓位偶尔会随感觉变大",
          tag: "半成熟",
          dimensionScores: { "risk-control": 5, execution: 4 },
          segmentSignals: { "course-intent": 2 },
        },
        {
          text: "更多看盘感和把握，不太固定",
          tag: "随感觉",
          dimensionScores: { "risk-control": 2, "commercial-intent": 3 },
          segmentSignals: { "high-risk": 4 },
        },
        {
          text: "说实话还没有清晰的风险体系",
          tag: "缺体系",
          dimensionScores: { "risk-control": 1 },
          segmentSignals: { "high-risk": 5, "live-nurture": 1 },
        },
      ],
    },
    {
      id: "deep-losers",
      track: "deep",
      text: "连续亏损 3 笔后，你通常会怎么处理？",
      options: [
        {
          text: "停下来复盘，必要时当天结束交易",
          tag: "会止损自己",
          dimensionScores: { "risk-control": 9, execution: 8 },
          segmentSignals: { "evaluation-path": 2, "course-intent": 1 },
        },
        {
          text: "缩仓继续观察，只做最有把握的单子",
          tag: "有弹性",
          dimensionScores: { "risk-control": 7, execution: 6 },
          segmentSignals: { "software-priority": 1 },
        },
        {
          text: "想尽快做回来，容易提高频率",
          tag: "回本冲动",
          dimensionScores: { "risk-control": 2, execution: 2 },
          segmentSignals: { "high-risk": 5 },
        },
        {
          text: "会乱换方法，想找到当下能赢的那个",
          tag: "策略跳蚤",
          dimensionScores: { "risk-control": 3, execution: 2, awareness: 2 },
          segmentSignals: { "high-risk": 4, "live-nurture": 1 },
        },
      ],
    },
    {
      id: "deep-review",
      track: "deep",
      text: "你平时有没有固定的复盘和记录体系？",
      options: [
        {
          text: "有，基本每笔都记录，并定期复盘",
          tag: "重复盘",
          dimensionScores: { execution: 10, awareness: 5 },
          segmentSignals: { "course-intent": 2, "evaluation-path": 2 },
        },
        {
          text: "偶尔会做，但不够系统",
          tag: "断续复盘",
          dimensionScores: { execution: 5, awareness: 3 },
          segmentSignals: { "course-intent": 1, "live-nurture": 1 },
        },
        {
          text: "只有亏钱时才会想想哪里错了",
          tag: "被动复盘",
          dimensionScores: { execution: 2 },
          segmentSignals: { "high-risk": 2 },
        },
        {
          text: "几乎没有记录习惯",
          tag: "无记录",
          dimensionScores: { execution: 1 },
          segmentSignals: { "high-risk": 3, "free-resource": 1 },
        },
      ],
    },
    {
      id: "deep-training",
      track: "deep",
      text: "你是否接受先用模拟盘或考试盘验证一套方法？",
      options: [
        {
          text: "接受，而且我认同这是必要环节",
          tag: "训练认同",
          dimensionScores: { execution: 8, "risk-control": 7, "commercial-intent": 5 },
          segmentSignals: { "evaluation-path": 5, "course-intent": 2 },
        },
        {
          text: "可以接受，但需要看到明确收益路径",
          tag: "务实验证",
          dimensionScores: { execution: 6, "commercial-intent": 6 },
          segmentSignals: { "evaluation-path": 4, "course-intent": 1 },
        },
        {
          text: "不太想，我更想直接上实盘",
          tag: "急切实盘",
          dimensionScores: { "risk-control": 2, "commercial-intent": 4 },
          segmentSignals: { "high-risk": 4 },
        },
        {
          text: "还没有形成明确判断",
          tag: "犹豫",
          dimensionScores: { awareness: 3, "commercial-intent": 2 },
          segmentSignals: { "live-nurture": 2 },
        },
      ],
    },
    {
      id: "deep-tools",
      track: "deep",
      text: "你现在有没有用订单流软件、Level2 或更细颗粒度的数据？",
      options: [
        {
          text: "有，已经在用，但还没形成稳定方法",
          tag: "已有工具",
          dimensionScores: { "tool-readiness": 10, awareness: 5, "commercial-intent": 5 },
          segmentSignals: { "software-priority": 4, "course-intent": 2 },
        },
        {
          text: "没有，但我愿意试用并学习配置",
          tag: "愿意试用",
          dimensionScores: { "tool-readiness": 7, "commercial-intent": 6 },
          segmentSignals: { "software-priority": 5 },
        },
        {
          text: "没有，我更想先确认课程是否适合我",
          tag: "课程优先",
          dimensionScores: { "tool-readiness": 3, "commercial-intent": 7 },
          segmentSignals: { "course-intent": 4 },
        },
        {
          text: "暂时不想碰工具，先看资料就行",
          tag: "低准备度",
          dimensionScores: { "tool-readiness": 1, "commercial-intent": 2 },
          segmentSignals: { "free-resource": 3 },
        },
      ],
    },
    {
      id: "deep-time",
      track: "deep",
      text: "你未来 30 天能投入多少时间做训练和复盘？",
      options: [
        {
          text: "每周 4 次以上，可以稳定投入",
          tag: "高投入",
          dimensionScores: { execution: 9, "commercial-intent": 5 },
          segmentSignals: { "course-intent": 3, "evaluation-path": 2 },
        },
        {
          text: "每周 2-3 次，可以持续但有限",
          tag: "中投入",
          dimensionScores: { execution: 6, "commercial-intent": 4 },
          segmentSignals: { "course-intent": 2, "software-priority": 1 },
        },
        {
          text: "时间不固定，主要看工作安排",
          tag: "不稳定",
          dimensionScores: { execution: 3, "commercial-intent": 3 },
          segmentSignals: { "live-nurture": 2 },
        },
        {
          text: "几乎没有固定训练时间",
          tag: "低投入",
          dimensionScores: { execution: 1, "commercial-intent": 1 },
          segmentSignals: { "free-resource": 3 },
        },
      ],
    },
    {
      id: "deep-goal",
      track: "deep",
      text: "如果德湃现在先帮你补一块，你最想先补哪一块？",
      options: [
        {
          text: "系统课程和训练反馈",
          tag: "课程目标",
          dimensionScores: { "commercial-intent": 10, awareness: 4 },
          segmentSignals: { "course-intent": 6 },
        },
        {
          text: "软件和执行辅助工具",
          tag: "软件目标",
          dimensionScores: { "commercial-intent": 9, "tool-readiness": 6 },
          segmentSignals: { "software-priority": 6 },
        },
        {
          text: "考试盘 / PropFirm 路径",
          tag: "考核目标",
          dimensionScores: { "commercial-intent": 8, "risk-control": 5, execution: 5 },
          segmentSignals: { "evaluation-path": 6 },
        },
        {
          text: "先继续看内容和直播，不急着投入",
          tag: "继续观察",
          dimensionScores: { "commercial-intent": 4 },
          segmentSignals: { "live-nurture": 5, "free-resource": 2 },
        },
      ],
    },
    {
      id: "deep-notes",
      track: "deep",
      text: "你有没有系统看过 Sera 的学习笔记或常见问题整理？",
      options: [
        {
          text: "看过，而且帮助我建立了基本框架",
          tag: "已预热",
          dimensionScores: { awareness: 8, "commercial-intent": 6 },
          segmentSignals: { "course-intent": 3 },
        },
        {
          text: "看过一点，但还没系统消化",
          tag: "部分预热",
          dimensionScores: { awareness: 5, "commercial-intent": 4 },
          segmentSignals: { "live-nurture": 2, "course-intent": 1 },
        },
        {
          text: "还没认真看过",
          tag: "未预热",
          dimensionScores: { awareness: 2 },
          segmentSignals: { "free-resource": 2, "live-nurture": 1 },
        },
        {
          text: "没看过，但愿意按路径补内容",
          tag: "愿意补课",
          dimensionScores: { awareness: 4, "commercial-intent": 4 },
          segmentSignals: { "course-intent": 1, "live-nurture": 2 },
        },
      ],
    },
    {
      id: "deep-discipline",
      track: "deep",
      text: "如果系统告诉你今天不该做单，你最真实的反应是什么？",
      options: [
        {
          text: "接受，空仓也是执行的一部分",
          tag: "纪律稳定",
          dimensionScores: { execution: 10, "risk-control": 7 },
          segmentSignals: { "evaluation-path": 2, "course-intent": 1 },
        },
        {
          text: "大概率会忍住，但仍会想找机会",
          tag: "有波动",
          dimensionScores: { execution: 6, "risk-control": 5 },
          segmentSignals: { "course-intent": 1 },
        },
        {
          text: "很难忍，容易去试一两单",
          tag: "容易出手",
          dimensionScores: { execution: 2, "risk-control": 3 },
          segmentSignals: { "high-risk": 3 },
        },
        {
          text: "如果我觉得有把握，通常还是会做",
          tag: "主观 override",
          dimensionScores: { execution: 3, awareness: 3 },
          segmentSignals: { "high-risk": 4 },
        },
      ],
    },
    {
      id: "deep-conversion",
      track: "deep",
      text: "如果这套路径和你匹配，你更希望先从哪一步开始？",
      options: [
        {
          text: "先约 1 次诊断沟通，再决定课程或软件",
          tag: "强推进",
          dimensionScores: { "commercial-intent": 10 },
          segmentSignals: { "course-intent": 4, "software-priority": 2 },
        },
        {
          text: "先领试用 / 资料，再判断是否继续",
          tag: "试用推进",
          dimensionScores: { "commercial-intent": 7, "tool-readiness": 4 },
          segmentSignals: { "software-priority": 3, "free-resource": 1 },
        },
        {
          text: "先看直播和案例，过几天再决定",
          tag: "培育推进",
          dimensionScores: { "commercial-intent": 5 },
          segmentSignals: { "live-nurture": 4 },
        },
        {
          text: "先不急，我主要想知道自己现在属于什么阶段",
          tag: "阶段识别",
          dimensionScores: { awareness: 4, "commercial-intent": 3 },
          segmentSignals: { "free-resource": 2, "live-nurture": 2 },
        },
      ],
    },
  ],
};
