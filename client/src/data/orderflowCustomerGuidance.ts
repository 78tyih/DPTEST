import type { DiagnosticDimension } from "./orderflowDiagnostic";
import type { OrderflowSystemRouteId } from "./orderflowLogicMap";

export interface DimensionGuidance {
  strengthMeaning: string;
  weaknessMeaning: string;
  referenceValue: string;
  improvementPlan: string;
}

export const dimensionGuidanceMap: Record<DiagnosticDimension, DimensionGuidance> = {
  awareness: {
    strengthMeaning: "说明你对订单流不是停留在概念层，而是开始理解它和风控、训练、执行之间的关系。",
    weaknessMeaning: "说明你现在可能知道一些术语，但还没有把订单流放回完整交易框架里，容易把它误看成单一信号工具。",
    referenceValue: "这一维决定你后续学课程、看直播、用工具时，能不能把看到的内容转成稳定的方法，而不是只记碎片化技巧。",
    improvementPlan: "优先补订单流底层认知，先把德湃课程里的结构逻辑、盘口语言和常见误区吃透，再进入更细的执行训练。",
  },
  "market-fit": {
    strengthMeaning: "说明你已经比较清楚订单流在当前市场里的适用方式，知道什么市场适合深用、什么市场要做路径转换。",
    weaknessMeaning: "说明你当前交易市场和使用路径可能还没对齐，比如工具、品种和执行环境之间存在错配。",
    referenceValue: "这一维直接影响你后续训练是否有效。同样的课程和工具，如果市场路径选错，执行效果会明显打折。",
    improvementPlan: "优先把市场路径校准，再结合德湃的交易系统确认当前品种、执行平台和订单流观察方式是否匹配。",
  },
  "risk-control": {
    strengthMeaning: "说明你已经具备一定风控意识，知道单笔风险、连续亏损和仓位管理对结果的决定作用。",
    weaknessMeaning: "说明你现在还容易把注意力放在入场和结果上，而不是风险暴露本身，实盘波动下容易失守纪律。",
    referenceValue: "这一维是所有训练能不能沉淀的底盘。风控不稳，再好的盘面理解和工具都会在放大亏损时失去意义。",
    improvementPlan: "优先按德湃交易系统把单笔风险、止损执行、连续亏损处理流程固定下来，再叠加课程和工具去放大执行质量。",
  },
  execution: {
    strengthMeaning: "说明你已经具备一定训练习惯，能够把规则、复盘和实际执行连接起来，而不是只停留在理解阶段。",
    weaknessMeaning: "说明你可能知道一些正确做法，但还没形成稳定执行，常见问题是复盘断续、计划落地弱、临盘容易偏离。",
    referenceValue: "这一维决定你能不能把诊断结果真正转成进步。执行弱时，知道方向不等于能做到，进步会被拖慢。",
    improvementPlan: "优先把训练节奏和复盘机制建立起来，结合德湃课程中的训练框架，把每次看盘、复盘和修正变成连续动作。",
  },
  "tool-readiness": {
    strengthMeaning: "说明你对工具接受度高，或者已经具备基本软件、盘口和数据环境，后续进入系统训练会更顺畅。",
    weaknessMeaning: "说明你目前还缺少必要的软件、盘面配置或工具理解，学习容易停留在概念而缺少落地场景。",
    referenceValue: "这一维决定你能不能把课程内容和真实盘面连接起来。工具不到位，很多细节只能停留在想象层。",
    improvementPlan: "优先把德湃相关软件和执行工具配置起来，通过试用、演示和实盘案例，把观察维度真正落到盘面里。",
  },
  "commercial-intent": {
    strengthMeaning: "说明你对继续学习、训练或使用工具有较明确的行动意愿，后续更容易进入稳定提升周期。",
    weaknessMeaning: "说明你现在还在观望阶段，可能更需要先建立理解和信任，而不是直接进入高强度训练。",
    referenceValue: "这一维不是单纯的购买意愿，而是你愿不愿意为能力提升投入时间、注意力和训练成本。",
    improvementPlan: "先明确你的阶段目标，再按目标选择德湃课程、训练系统或工具路径，避免什么都想学但没有主线。",
  },
};

export interface CustomerActionPlanStep {
  title: string;
  detail: string;
}

export const routeActionPlanMap: Record<OrderflowSystemRouteId, CustomerActionPlanStep[]> = {
  "cognition-foundation": [
    {
      title: "先补认知框架",
      detail: "优先用订单流学习笔记、FAQ 和入门视频建立正确框架，先理解盘口、结构和风险控制之间的关系。",
    },
    {
      title: "再进入课程打底",
      detail: "结合德湃订单流课程，把概念和实战场景对齐，避免只会记术语却不会判断盘面。",
    },
    {
      title: "最后补工具场景",
      detail: "等认知稳定后，再上手德湃相关软件和工具，把学习内容和真实盘面连接起来。",
    },
  ],
  "live-nurture": [
    {
      title: "先用内容建立判断标准",
      detail: "先通过直播、案例和公开资料形成对订单流的基本判断，避免一上来就被零散信息带偏。",
    },
    {
      title: "再结合课程做结构化学习",
      detail: "当你对市场结构和训练节奏有基本理解后，再进入课程体系，会更容易把内容消化成自己的方法。",
    },
    {
      title: "最后再决定是否上系统和工具",
      detail: "等方向明确后，再结合德湃系统和相关工具做深入训练，避免过早堆叠成本。",
    },
  ],
  "course-training": [
    {
      title: "先做结构化课程训练",
      detail: "优先进入德湃订单流课程，把认知、执行、复盘和训练节奏连成闭环，而不是单点提升。",
    },
    {
      title: "再接入交易系统",
      detail: "结合德湃交易系统，把进场、出场、风控和复盘规则固定下来，让学习变成可重复的方法。",
    },
    {
      title: "最后用工具放大执行质量",
      detail: "在方法成型后，再用软件和盘口工具提升看盘效率与执行精度，这样工具才能真正放大结果。",
    },
  ],
  "software-execution": [
    {
      title: "先补执行工具和盘面观察",
      detail: "优先通过德湃相关软件和工具，把盘口、节奏和执行细节看清楚，解决“知道但做不到”的问题。",
    },
    {
      title: "再把工具接进交易系统",
      detail: "让工具服务于固定规则，而不是取代规则。这样软件才能提升执行，而不是制造更多主观波动。",
    },
    {
      title: "最后结合课程做深化训练",
      detail: "当你已经看到工具价值后，再用课程和系统训练去稳固方法，会更容易形成持续提升。",
    },
  ],
  "evaluation-journey": [
    {
      title: "先做阶段验证",
      detail: "优先把目标放在模拟盘、考试盘或阶段性验证上，先确认方法和执行是否稳定。",
    },
    {
      title: "再用课程和系统补底盘",
      detail: "结合德湃课程和交易系统，把风控、纪律和执行框架补完整，而不是直接追逐短期结果。",
    },
    {
      title: "最后用工具提升一致性",
      detail: "当验证路径稳定后，再让工具帮助你提高盘面识别效率和执行一致性。",
    },
  ],
  "risk-cooling": [
    {
      title: "先做风险降温",
      detail: "优先把预期拉回现实，先处理纪律、风控和训练心态，避免继续放大错误动作。",
    },
    {
      title: "再进入低压训练期",
      detail: "通过德湃课程和交易系统先做基础训练，把风险控制和执行规则稳定下来。",
    },
    {
      title: "最后再考虑工具放大",
      detail: "等底盘稳定后，再用相关工具去提升效率，否则工具只会放大原本的问题。",
    },
  ],
};
