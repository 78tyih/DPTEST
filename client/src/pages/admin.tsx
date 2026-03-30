import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Plus, Trash2, Activity, Power, PowerOff, RefreshCw, Shield, ArrowLeft, X, BarChart3, Eye, UserPlus, MessageSquare, Users, TrendingUp, Pencil, Check, Clock, Copy, Search, Download, Phone, User, ChevronRight, Target, Lightbulb, AlertTriangle, Zap } from "lucide-react";
import { traderTypes, rankTiers } from "@/data/traderTypes";
import { dimensionLabels, type Dimension } from "@/data/questions";
import { useToast } from "@/hooks/use-toast";

interface SalesContact {
  id: number;
  name: string;
  url: string;
  enabled: boolean;
  lastHealthCheck: string | null;
  lastHealthStatus: string | null;
  createdAt: string;
}

interface StatsOverview {
  total_views: string;
  total_registers: string;
  total_wechat_clicks: string;
  total_assigns: string;
  total_quiz_completes: string;
  today_views: string;
  today_registers: string;
  today_wechat_clicks: string;
  week_views: string;
  week_registers: string;
  week_wechat_clicks: string;
  total_unique_visitors: string;
  today_unique_visitors: string;
}

interface ContactStat {
  contact_name: string;
  assign_count: string;
}

interface DailyTrend {
  date: string;
  views: string;
  registers: string;
  wechat_clicks: string;
}

interface FunnelData {
  step_view: string;
  step_register: string;
  step_quiz: string;
  step_wechat: string;
}

interface TraderType {
  type_code: string;
  count: string;
}

interface HourlyData {
  hour: string;
  count: string;
}

interface StatsData {
  overview: StatsOverview;
  contactStats: ContactStat[];
  dailyTrend: DailyTrend[];
  funnel: FunnelData;
  traderTypes: TraderType[];
  hourlyDistribution: HourlyData[];
}

interface UserTags {
  notes?: string;
  status?: string;
  labels?: string[];
}

interface AdminUser {
  id: number;
  phone: string;
  nickname: string | null;
  wechat_id: string | null;
  source: string | null;
  tags: UserTags | null;
  tier: number;
  login_days: number;
  last_login_date: string | null;
  last_active_at: string | null;
  created_at: string;
  trader_type_code: string | null;
  avg_score: number | null;
  rank_name: string | null;
  scores: Record<string, number> | null;
  quiz_completed_at: string | null;
}

const TRADER_TYPE_NAMES: Record<string, string> = {
  RS: "风险猎手", RM: "稳健策略师", RT: "技术分析师", RI: "直觉交易者",
  AS: "激进狙击手", AM: "平衡操盘手", AT: "量化分析师", AI: "灵感交易者",
  DS: "防守大师", DM: "保守管理者", DT: "数据矿工", DI: "感知守护者",
  ES: "情绪冲浪者", EM: "心态教练", ET: "系统执行者", EI: "市场哲学家",
};

function StatusDot({ status }: { status: string | null }) {
  const color = status === "ok" ? "#07C160" : status === "dead" ? "#EF4444" : "#6B7280";
  const label = status === "ok" ? "正常" : status === "dead" ? "异常" : "未检测";
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2 h-2 rounded-full" style={{ background: color }} />
      <span className="text-xs" style={{ color }}>{label}</span>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, subValue, color }: {
  icon: typeof Eye;
  label: string;
  value: string | number;
  subValue?: string;
  color: string;
}) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
      </div>
      <div className="text-xl font-bold" style={{ color: 'var(--text-strong)' }} data-testid={`stat-${label}`}>
        {value}
      </div>
      {subValue && (
        <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{subValue}</div>
      )}
    </div>
  );
}

function FunnelChart({ funnel }: { funnel: FunnelData }) {
  const steps = [
    { label: "浏览", value: parseInt(funnel.step_view) || 0, color: "#3B82F6" },
    { label: "注册", value: parseInt(funnel.step_register) || 0, color: "#07C160" },
    { label: "完成测评", value: parseInt(funnel.step_quiz) || 0, color: "#8B5CF6" },
    { label: "添加客服", value: parseInt(funnel.step_wechat) || 0, color: "#F59E0B" },
  ];
  const maxVal = Math.max(steps[0].value, 1);

  return (
    <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4" style={{ color: 'var(--gold)' }} />
        <span className="text-sm font-medium" style={{ color: 'var(--text-strong)' }}>转化漏斗</span>
      </div>
      <div className="space-y-3">
        {steps.map((step, i) => {
          const pct = (step.value / maxVal) * 100;
          const convRate = i > 0 && steps[i - 1].value > 0
            ? ((step.value / steps[i - 1].value) * 100).toFixed(1)
            : null;
          return (
            <div key={step.label} data-testid={`funnel-${step.label}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: 'var(--text-strong)' }}>{step.label}</span>
                  {convRate && (
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)' }}>
                      {convRate}%
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium" style={{ color: step.color }}>{step.value}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, delay: i * 0.1, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ background: step.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TraderTypeChart({ types }: { types: TraderType[] }) {
  if (types.length === 0) return null;
  const total = types.reduce((sum, t) => sum + (parseInt(t.count) || 0), 0);
  const colors = ["#F59E0B", "#3B82F6", "#07C160", "#8B5CF6", "#EF4444", "#EC4899", "#14B8A6", "#F97316"];

  return (
    <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4" style={{ color: 'var(--gold)' }} />
        <span className="text-sm font-medium" style={{ color: 'var(--text-strong)' }}>交易者类型分布</span>
      </div>
      <div className="space-y-2">
        {types.map((t, i) => {
          const count = parseInt(t.count) || 0;
          const pct = total > 0 ? ((count / total) * 100).toFixed(1) : "0";
          const color = colors[i % colors.length];
          const name = TRADER_TYPE_NAMES[t.type_code] || t.type_code;
          return (
            <div key={t.type_code} data-testid={`type-${t.type_code}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium" style={{ color }}>{t.type_code}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{name}</span>
                </div>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{count} ({pct}%)</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${parseFloat(pct)}%` }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                  className="h-full rounded-full"
                  style={{ background: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HourlyChart({ data }: { data: HourlyData[] }) {
  if (data.length === 0) return null;
  const hours = Array.from({ length: 24 }, (_, i) => {
    const found = data.find(d => parseInt(d.hour) === i);
    return { hour: i, count: found ? parseInt(found.count) || 0 : 0 };
  });
  const maxCount = Math.max(...hours.map(h => h.count), 1);

  return (
    <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4" style={{ color: 'var(--gold)' }} />
        <span className="text-sm font-medium" style={{ color: 'var(--text-strong)' }}>访问时段分布（近7天）</span>
      </div>
      <div className="flex items-end gap-[2px] h-20">
        {hours.map(h => {
          const heightPct = (h.count / maxCount) * 100;
          const isHigh = h.count >= maxCount * 0.7;
          return (
            <div key={h.hour} className="flex-1 flex flex-col items-center justify-end h-full" title={`${h.hour}:00 - ${h.count} 次`}>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(heightPct, 2)}%` }}
                transition={{ duration: 0.4, delay: h.hour * 0.02 }}
                className="w-full rounded-t-sm"
                style={{ background: isHigh ? 'var(--gold)' : 'rgba(var(--gold-rgb), 0.3)', minHeight: '1px' }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>0:00</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>6:00</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>12:00</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>18:00</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>23:00</span>
      </div>
    </div>
  );
}

function StatsPanel({ stats, loading }: { stats: StatsData | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 mx-auto rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
        <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>加载统计数据...</p>
      </div>
    );
  }

  if (!stats) return null;

  const o = stats.overview;
  const totalViews = parseInt(o.total_views) || 0;
  const totalRegisters = parseInt(o.total_registers) || 0;
  const totalClicks = parseInt(o.total_wechat_clicks) || 0;
  const totalAssigns = parseInt(o.total_assigns) || 0;
  const totalQuiz = parseInt(o.total_quiz_completes) || 0;
  const todayViews = parseInt(o.today_views) || 0;
  const todayRegisters = parseInt(o.today_registers) || 0;
  const todayClicks = parseInt(o.today_wechat_clicks) || 0;
  const uniqueVisitors = parseInt(o.total_unique_visitors) || 0;

  return (
    <div className="space-y-4" data-testid="stats-panel">
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={Eye}
          label="总浏览量"
          value={totalViews.toLocaleString()}
          subValue={`今日 ${todayViews} / 独立访客 ${uniqueVisitors}`}
          color="#3B82F6"
        />
        <StatCard
          icon={UserPlus}
          label="总注册量"
          value={totalRegisters.toLocaleString()}
          subValue={`今日 ${todayRegisters}`}
          color="#07C160"
        />
        <StatCard
          icon={MessageSquare}
          label="添加客服点击"
          value={totalClicks.toLocaleString()}
          subValue={`今日 ${todayClicks}`}
          color="#F59E0B"
        />
        <StatCard
          icon={Users}
          label="客服分配次数"
          value={totalAssigns.toLocaleString()}
          subValue={`测评完成 ${totalQuiz}`}
          color="#8B5CF6"
        />
      </div>

      {stats.funnel && <FunnelChart funnel={stats.funnel} />}

      {stats.contactStats.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4" style={{ color: 'var(--gold)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--text-strong)' }}>顾问分配统计</span>
          </div>
          <div className="space-y-2">
            {stats.contactStats.map((cs) => {
              const count = parseInt(cs.assign_count) || 0;
              const maxCount = Math.max(...stats.contactStats.map(s => parseInt(s.assign_count) || 0), 1);
              const pct = (count / maxCount) * 100;
              return (
                <div key={cs.contact_name} data-testid={`stat-contact-${cs.contact_name}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs" style={{ color: 'var(--text-strong)' }}>{cs.contact_name}</span>
                    <span className="text-xs font-medium" style={{ color: 'var(--gold)' }}>{count} 次</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ background: 'var(--gold)' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {stats.traderTypes && <TraderTypeChart types={stats.traderTypes} />}
      {stats.hourlyDistribution && <HourlyChart data={stats.hourlyDistribution} />}

      {stats.dailyTrend.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4" style={{ color: 'var(--gold)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--text-strong)' }}>近期趋势（最近7天）</span>
          </div>
          <div className="space-y-1.5">
            {stats.dailyTrend.slice(0, 7).map((d) => (
              <div key={d.date} className="flex items-center gap-3 text-xs" data-testid={`stat-day-${d.date}`}>
                <span className="w-20 shrink-0" style={{ color: 'var(--text-muted)' }}>
                  {new Date(d.date).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
                </span>
                <div className="flex items-center gap-3 flex-1">
                  <span style={{ color: '#3B82F6' }}>
                    <Eye className="w-3 h-3 inline mr-0.5" />{d.views}
                  </span>
                  <span style={{ color: '#07C160' }}>
                    <UserPlus className="w-3 h-3 inline mr-0.5" />{d.registers}
                  </span>
                  <span style={{ color: '#F59E0B' }}>
                    <MessageSquare className="w-3 h-3 inline mr-0.5" />{d.wechat_clicks}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <div className="flex items-center gap-1 text-xs" style={{ color: '#3B82F6' }}>
              <div className="w-2 h-2 rounded-full" style={{ background: '#3B82F6' }} /> 浏览
            </div>
            <div className="flex items-center gap-1 text-xs" style={{ color: '#07C160' }}>
              <div className="w-2 h-2 rounded-full" style={{ background: '#07C160' }} /> 注册
            </div>
            <div className="flex items-center gap-1 text-xs" style={{ color: '#F59E0B' }}>
              <div className="w-2 h-2 rounded-full" style={{ background: '#F59E0B' }} /> 添加客服
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const TIER_NAMES: Record<number, string> = { 0: "学徒", 1: "交易者", 2: "精英", 3: "职业操盘手" };

const DIMENSION_KEYS: Dimension[] = ['EDGE', 'EXEC', 'RISK', 'ADAPT', 'MENTAL', 'SYSTEM'];

// 每种交易者类型对应的销售切入策略
const SALES_STRATEGIES: Record<string, { opener: string; painPoint: string; courseValue: string; reminder: string }> = {
  RA: {
    opener: "你的风控底子很好，适应力也强，这在大部分交易者里已经很稀缺了",
    painPoint: "你现在最缺的是一个有硬逻辑支撑的入场体系 — 不是感觉「差不多了」就进场，而是有量化的证据告诉你这里该进",
    courseValue: "我们的方法论就是帮你把「差不多」变成「确定」，用资金流数据给你一个客观的确认信号",
    reminder: "跟你做什么市场没关系，不管内盘外盘都能用，订单流的本质是理解大资金的行为",
  },
  EAv: {
    opener: "你的盘感和适应力很强，这是真正的天赋",
    painPoint: "好的交易你说不出理由，坏的交易也说不出哪里错了，这样你就没法稳定输出",
    courseValue: "我们的课程能帮你把直觉量化 — 你现在凭感觉看到的东西，用订单流能看到客观的证据。不是取代你的直觉，而是给你的直觉加一个验证工具",
    reminder: "很多高阶量价策略有论文支撑，不是玄学",
  },
  ES: {
    opener: "你的分析框架和系统化程度在评测里很突出",
    painPoint: "分析对了不等于赚钱了。你是不是经常遇到「大方向对了但入场时机差一点」的情况？",
    courseValue: "你需要的不是更多分析，而是一个微观级别的入场工具。订单流能让你的宏观判断在K线级别找到精确的切入点",
    reminder: "订单流很适合中长线，不是只能做日内。你有系统思维的底子，加上精确工具就是如虎添翼",
  },
  RS: {
    opener: "你是风控和系统化双高的类型，这已经超过大部分交易者了",
    painPoint: "你有没有觉得自己「活得久」但「赚得少」？防守已经满分了，现在需要升级进攻",
    courseValue: "我们帮你在现有系统里加一个进攻维度 — 用资金流看到大钱在哪里，让你敢于在有把握时加码",
    reminder: "这不是让你冒更大的风险，而是让你在同样的风险预算下找到更好的机会",
  },
  SE: {
    opener: "你的执行力和系统化程度很高，是少数能做到「知行合一」的人",
    painPoint: "系统连续亏损时你还在执行，后来才发现市场环境已经变了？",
    courseValue: "你需要给系统加一个大环境过滤器。订单流能帮你判断当前市场的资金流动状态，让你的系统在对的环境下运行",
    reminder: "很多机构交易员就是这样用订单流的，不是用来做短线，而是用来判断市场状态",
  },
  RM: {
    opener: "你在风控和心态上的得分很高，这两项是交易的地基，你的地基很稳",
    painPoint: "地基稳不代表房子会自己长起来。该做的都做了，为什么账户还是不涨？",
    courseValue: "你缺的就是一个进攻武器。我们的课程从方法论层面帮你建立一套有逻辑的入场体系",
    reminder: "你的心态已经是做中长线的理想状态，订单流能帮你在大级别找到最佳入场点",
  },
  ER: {
    opener: "你的认知格局和风控意识在评测中很突出",
    painPoint: "看对了方向、止损也设了，就是入场点差那么一点，被止损打掉后行情就启动了？",
    courseValue: "你不需要更多分析，你需要精确定位入场点的工具。订单流就是帮你在微观层面找到那个「差一点」的答案",
    reminder: "大方向+精确入场=完整的交易闭环",
  },
  AS: {
    opener: "你兼具系统化思维和灵活性，这个组合很稀缺",
    painPoint: "回测和实盘之间总有差距？可能不是系统不够好，而是你的输入数据不够精确",
    courseValue: "订单流能给你的系统加一个更高维度的数据源 — 从成交量和资金行为层面看市场，比纯K线形态可靠得多",
    reminder: "给你的系统加一个「冷冻期」— 至少运行100笔不修改，用真实数据验证",
  },
  ME: {
    opener: "你的执行力和心态在评测里排名靠前",
    painPoint: "做得多但算下来不赚钱，交易频率和胜率不成正比？减少50%的交易次数是不是反而赚得更多？",
    courseValue: "我们的方法论能帮你识别哪些信号值得出手、哪些应该放过，让你的快手不再是快刀乱斩",
    reminder: "速度是你的武器，但需要一个过滤器 — 不是每个快球都要接",
  },
  MA: {
    opener: "你的心态和适应力很强，什么市场环境都能找到节奏",
    painPoint: "什么方法都懂一点，但没有一个是真正精通的，缺一个「一招鲜」",
    courseValue: "我们的课程体系帮你建立一个以资金流为核心的方法论，不用再到处找新策略",
    reminder: "300笔以上的回测能告诉你，哪个才是你真正的优势策略",
  },
  EM: {
    opener: "坦诚地说，现在是交易者最危险的阶段 — 知道一些但不够系统",
    painPoint: "不系统的知识反而会让你做出更多错误的决定",
    courseValue: "现在建立正确的框架，比带着错误习惯走三年更好。我们不只是教工具，而是帮你从零建立一套完整的交易方法论",
    reminder: "我们是一套市场方法论+交易员培训全案，不只是教一个工具",
  },
  RE: {
    opener: "你的纪律和执行力没问题",
    painPoint: "但你执行的那套策略真的有正期望吗？严格执行的可能不是一个好系统",
    courseValue: "我们帮你用数据验证和升级你的系统，300笔以上的盲测能告诉你答案",
    reminder: "纪律+好系统=持续盈利",
  },
  EA: {
    opener: "你不缺执行力，什么行情都敢做",
    painPoint: "同时关注太多品种和时间框架，注意力分散，重仓的反而不是准备最充分的",
    courseValue: "我们帮你在一个方法论上深耕，不再东一榔头西一棒子",
    reminder: "聚焦一个方法，把速度和适应力集中到一个点上",
  },
  EX: {
    opener: "你天生就是做大行情的人，趋势判断+执行力的组合很强",
    painPoint: "两次大行情之间的震荡期里，赚来的钱又亏回去了不少？",
    courseValue: "你缺的是一个「行情类型识别器」— 在趋势不明时降低仓位，订单流能帮你判断现在是趋势还是震荡",
    reminder: "订单流不只是看短线，更能帮你判断行情的大节奏",
  },
  SM: {
    opener: "你将理性的系统思维和强大的心理素质完美结合",
    painPoint: "分析经常是对的，但账户没有反映出分析水平。从判断到执行之间有一段距离还没跨过去",
    courseValue: "给自己设一个决策时间限制 — 分析到80分就执行，我们的工具能给你一个客观的「够了，该动手了」的信号",
    reminder: "完美主义是交易的敌人，80分的执行胜过100分的计划",
  },
};

function getWeakestDimension(scores: Record<string, number> | null): { key: Dimension; label: string; score: number } | null {
  if (!scores) return null;
  let min: { key: Dimension; label: string; score: number } | null = null;
  for (const k of DIMENSION_KEYS) {
    const s = scores[k];
    if (s != null && (!min || s < min.score)) {
      min = { key: k, label: dimensionLabels[k], score: s };
    }
  }
  return min;
}

function getStrongestDimension(scores: Record<string, number> | null): { key: Dimension; label: string; score: number } | null {
  if (!scores) return null;
  let max: { key: Dimension; label: string; score: number } | null = null;
  for (const k of DIMENSION_KEYS) {
    const s = scores[k];
    if (s != null && (!max || s > max.score)) {
      max = { key: k, label: dimensionLabels[k], score: s };
    }
  }
  return max;
}

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <span className="text-xs font-bold" style={{ color }}>{score}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
    </div>
  );
}

function UserDetailDrawer({ user, onClose, onTagsUpdate }: { user: AdminUser; onClose: () => void; onTagsUpdate?: (userId: number, tags: UserTags) => void }) {
  const { toast } = useToast();
  const scores = user.scores;
  const typeCode = user.trader_type_code;
  const typeInfo = typeCode ? traderTypes[typeCode] : null;
  const strategy = typeCode ? SALES_STRATEGIES[typeCode] : null;
  const weakest = getWeakestDimension(scores);
  const strongest = getStrongestDimension(scores);
  const rank = rankTiers.find(r => user.avg_score != null && user.avg_score >= r.minScore && user.avg_score <= r.maxScore);

  const [notes, setNotes] = useState(user.tags?.notes || "");
  const [followStatus, setFollowStatus] = useState(user.tags?.status || "new");
  const [saving, setSaving] = useState(false);

  const STATUS_OPTIONS = [
    { value: "new", label: "新客户", color: "#3B82F6" },
    { value: "contacted", label: "已联系", color: "#F59E0B" },
    { value: "following", label: "跟进中", color: "#8B5CF6" },
    { value: "trial", label: "试听中", color: "#14B8A6" },
    { value: "converted", label: "已成交", color: "#07C160" },
    { value: "lost", label: "已流失", color: "#6B7280" },
  ];

  const saveTags = useCallback(async (newStatus?: string) => {
    setSaving(true);
    const tags: UserTags = { notes, status: newStatus || followStatus, labels: user.tags?.labels || [] };
    try {
      const res = await fetch(`/api/admin/users/${user.id}/tags`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags }),
        credentials: "include",
      });
      if (res.ok) {
        toast({ title: "已保存" });
        onTagsUpdate?.(user.id, tags);
      }
    } catch { toast({ title: "保存失败", variant: "destructive" }); }
    setSaving(false);
  }, [notes, followStatus, user, toast, onTagsUpdate]);

  const generateWechatNote = useCallback(() => {
    const lines: string[] = [];
    lines.push(`【${user.phone}】`);
    if (typeInfo) lines.push(`${typeInfo.icon} ${typeInfo.name}（${typeInfo.subtitle}）`);
    if (user.avg_score != null && rank) lines.push(`${rank.icon} ${rank.name} ${user.avg_score}分`);
    if (strongest && weakest) lines.push(`强项：${strongest.label}${strongest.score} / 弱项：${weakest.label}${weakest.score}`);
    if (typeInfo) lines.push(`痛点：${typeInfo.piercingDescription.substring(0, 50)}...`);
    if (strategy) lines.push(`切入：${strategy.opener.substring(0, 40)}...`);
    if (notes) lines.push(`备注：${notes}`);
    return lines.join('\n');
  }, [user, typeInfo, rank, strongest, weakest, strategy, notes]);

  const copyBrief = useCallback(async () => {
    const text = generateWechatNote();
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "已复制，可粘贴到微信备注" });
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select(); document.execCommand("copy");
      document.body.removeChild(ta);
      toast({ title: "已复制" });
    }
  }, [generateWechatNote, toast]);

  const getScoreColor = (s: number) => {
    if (s >= 70) return '#07C160';
    if (s >= 50) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl pb-8"
        style={{ background: 'var(--bg-0)', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 拖拽指示条 */}
        <div className="sticky top-0 pt-3 pb-2 flex justify-center" style={{ background: 'var(--bg-0)', zIndex: 1 }}>
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>

        <div className="px-5 space-y-5">
          {/* 头部：用户基本信息 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {typeInfo && <span className="text-2xl">{typeInfo.icon}</span>}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold" style={{ color: 'var(--text-strong)' }}>
                    {user.phone}
                  </span>
                  {rank && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${rank.color}20`, color: rank.color }}>
                      {rank.icon} {rank.name}
                    </span>
                  )}
                </div>
                {typeInfo && (
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {typeInfo.name} · {typeInfo.subtitle} · {user.avg_score}分
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={copyBrief} className="h-8 px-3 rounded-lg flex items-center gap-1.5 text-xs font-medium" style={{ background: 'rgba(var(--gold-rgb), 0.12)', color: 'var(--gold)' }}>
                <Copy className="w-3.5 h-3.5" />
                复制备注
              </button>
              <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
          </div>

          {/* 跟进状态 + 备注 */}
          <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Pencil className="w-4 h-4" style={{ color: 'var(--gold)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-strong)' }}>销售跟进</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setFollowStatus(opt.value); saveTags(opt.value); }}
                  className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                  style={{
                    background: followStatus === opt.value ? `${opt.color}20` : 'rgba(255,255,255,0.04)',
                    color: followStatus === opt.value ? opt.color : 'var(--text-muted)',
                    border: `1px solid ${followStatus === opt.value ? `${opt.color}40` : 'transparent'}`,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="添加备注（客户情况、沟通记录等）..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--text-strong)' }}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                备注会保存到数据库，方便下次查看
              </span>
              <button
                onClick={() => saveTags()}
                disabled={saving}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: 'var(--gold)', color: '#000' }}
              >
                {saving ? "保存中..." : "保存备注"}
              </button>
            </div>
          </div>

          {/* 一句话描述 */}
          {typeInfo && (
            <div className="rounded-xl p-4" style={{ background: `${typeInfo.cardColors.primary}15`, border: `1px solid ${typeInfo.cardColors.primary}30` }}>
              <p className="text-sm font-medium" style={{ color: typeInfo.cardColors.primary }}>
                "{typeInfo.oneLiner}"
              </p>
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                {typeInfo.description}
              </p>
            </div>
          )}

          {/* 六维评分 */}
          {scores && (
            <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4" style={{ color: 'var(--gold)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-strong)' }}>六维评分</span>
                {strongest && weakest && (
                  <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
                    最强 {strongest.label} {strongest.score} / 最弱 {weakest.label} {weakest.score}
                  </span>
                )}
              </div>
              <div className="space-y-2.5">
                {DIMENSION_KEYS.map(k => (
                  <ScoreBar key={k} label={dimensionLabels[k]} score={scores[k] ?? 0} color={getScoreColor(scores[k] ?? 0)} />
                ))}
              </div>
            </div>
          )}

          {/* 灵魂拷问 */}
          {typeInfo && (
            <div className="rounded-xl p-4" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4" style={{ color: '#EF4444' }} />
                <span className="text-sm font-medium" style={{ color: '#EF4444' }}>客户核心痛点</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-strong)' }}>
                {typeInfo.piercingDescription}
              </p>
            </div>
          )}

          {/* 销售策略 */}
          {strategy && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" style={{ color: 'var(--gold)' }} />
                <span className="text-sm font-bold" style={{ color: 'var(--gold)' }}>销售攻略</span>
              </div>

              <div className="rounded-xl p-4" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <MessageSquare className="w-3.5 h-3.5" style={{ color: '#3B82F6' }} />
                  <span className="text-xs font-medium" style={{ color: '#3B82F6' }}>开场白</span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-strong)' }}>
                  "{strategy.opener}"
                </p>
              </div>

              <div className="rounded-xl p-4" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" style={{ color: '#EF4444' }} />
                  <span className="text-xs font-medium" style={{ color: '#EF4444' }}>戳痛点</span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-strong)' }}>
                  "{strategy.painPoint}"
                </p>
              </div>

              <div className="rounded-xl p-4" style={{ background: 'rgba(7,193,96,0.06)', border: '1px solid rgba(7,193,96,0.15)' }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Lightbulb className="w-3.5 h-3.5" style={{ color: '#07C160' }} />
                  <span className="text-xs font-medium" style={{ color: '#07C160' }}>课程价值</span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-strong)' }}>
                  "{strategy.courseValue}"
                </p>
              </div>

              <div className="rounded-xl p-4" style={{ background: 'rgba(var(--gold-rgb), 0.06)', border: '1px solid rgba(var(--gold-rgb), 0.15)' }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" style={{ color: 'var(--gold)' }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--gold)' }}>重要提醒</span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-strong)' }}>
                  {strategy.reminder}
                </p>
              </div>
            </div>
          )}

          {/* 优势与盲区 */}
          {typeInfo && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-3" style={{ background: 'rgba(7,193,96,0.06)', border: '1px solid rgba(7,193,96,0.15)' }}>
                <span className="text-xs font-medium" style={{ color: '#07C160' }}>优势</span>
                <ul className="mt-1.5 space-y-1">
                  {typeInfo.strengths.map((s, i) => (
                    <li key={i} className="text-xs leading-relaxed" style={{ color: 'var(--text-strong)' }}>• {s}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl p-3" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <span className="text-xs font-medium" style={{ color: '#EF4444' }}>盲区</span>
                <ul className="mt-1.5 space-y-1">
                  {typeInfo.blindSpots.map((s, i) => (
                    <li key={i} className="text-xs leading-relaxed" style={{ color: 'var(--text-strong)' }}>• {s}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* 通用提醒 */}
          <div className="rounded-xl p-4" style={{ background: 'rgba(var(--gold-rgb), 0.04)', border: '1px solid rgba(var(--gold-rgb), 0.1)' }}>
            <span className="text-xs font-bold block mb-2" style={{ color: 'var(--gold)' }}>销售必读</span>
            <ul className="space-y-1.5 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              <li>• 不要把订单流和特定品种/市场挂钩，我们是<b style={{ color: 'var(--text-strong)' }}>方法论+培训全案</b></li>
              <li>• 订单流<b style={{ color: 'var(--text-strong)' }}>适合中长线</b>，不只是日内，很多策略有学术论文支撑</li>
              <li>• 外盘/内盘/大A/美股都能用，内盘期货和大A产品正在推出</li>
              <li>• 市场上用订单流的人很少 = <b style={{ color: 'var(--text-strong)' }}>稀缺优势</b></li>
            </ul>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function UsersPanel({ users, loading, onRefresh }: { users: AdminUser[]; loading: boolean; onRefresh: () => void }) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const filtered = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.phone.includes(q) ||
      (u.nickname && u.nickname.toLowerCase().includes(q)) ||
      (u.wechat_id && u.wechat_id.toLowerCase().includes(q)) ||
      (u.trader_type_code && (TRADER_TYPE_NAMES[u.trader_type_code] || u.trader_type_code).toLowerCase().includes(q))
    );
  });

  const copyText = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(text);
      toast({ title: `${label} 已复制` });
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiedId(text);
      toast({ title: `${label} 已复制` });
      setTimeout(() => setCopiedId(null), 1500);
    }
  }, [toast]);

  const exportCSV = useCallback(() => {
    const escapeCSV = (val: string | number | null | undefined): string => {
      if (val == null || val === "") return '""';
      const s = String(val);
      if (/^[=+\-@\t\r]/.test(s)) return `"'${s.replace(/"/g, '""')}"`;
      if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const DIMENSION_NAMES: Record<string, string> = {
      EDGE: "认知格局", EXEC: "执行力", RISK: "风险管理",
      ADAPT: "市场适应", MENTAL: "交易心理", SYSTEM: "系统思维",
    };
    const DIMENSIONS = ["EDGE", "EXEC", "RISK", "ADAPT", "MENTAL", "SYSTEM"];
    const getWeakest = (scores: Record<string, number> | null) => {
      if (!scores) return "";
      const entries = DIMENSIONS.map(d => [d, scores[d] ?? 999] as const);
      const min = entries.reduce((a, b) => a[1] <= b[1] ? a : b);
      return DIMENSION_NAMES[min[0]] || min[0];
    };
    const header = "ID,手机号,昵称,微信号,来源,阶段,登录天数,交易者���型,综合评分,认知格局,执行力,风险管理,市场适应,交易心理,��统思维,薄弱维度,注册时间,测评时间,最��活跃";
    const rows = filtered.map(u => [
      u.id,
      escapeCSV(u.phone),
      escapeCSV(u.nickname),
      escapeCSV(u.wechat_id),
      escapeCSV(u.source),
      escapeCSV(TIER_NAMES[u.tier] || `T${u.tier}`),
      u.login_days,
      escapeCSV(u.trader_type_code ? (TRADER_TYPE_NAMES[u.trader_type_code] || u.trader_type_code) : ""),
      u.avg_score ?? "",
      u.scores?.EDGE ?? "",
      u.scores?.EXEC ?? "",
      u.scores?.RISK ?? "",
      u.scores?.ADAPT ?? "",
      u.scores?.MENTAL ?? "",
      u.scores?.SYSTEM ?? "",
      escapeCSV(getWeakest(u.scores)),
      u.created_at ? new Date(u.created_at).toLocaleDateString("zh-CN") : "",
      u.quiz_completed_at ? new Date(u.quiz_completed_at).toLocaleDateString("zh-CN") : "",
      u.last_active_at ? new Date(u.last_active_at).toLocaleDateString("zh-CN") : "",
    ].join(","));
    const csv = "\uFEFF" + [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `客户资料_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: `已导出 ${filtered.length} 条记录` });
  }, [filtered, toast]);

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  if (loading && users.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 mx-auto rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="users-panel">
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="搜索手机号 / 昵称 / 微信号"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl text-xs outline-none"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', color: 'var(--text-strong)' }}
            data-testid="input-search-users"
          />
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium shrink-0"
          style={{ background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)', border: '1px solid rgba(var(--primary-rgb), 0.2)' }}
          data-testid="button-export-csv"
        >
          <Download className="w-3.5 h-3.5" />
          导出
        </button>
      </div>

      <div className="text-xs flex items-center justify-between" style={{ color: 'var(--text-muted)' }}>
        <span>共 {filtered.length} 位客户{search && ` (筛选自 ${users.length})`}</span>
        <button onClick={onRefresh} disabled={loading} className="flex items-center gap-1" data-testid="button-refresh-users">
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{search ? "未找到匹配客户" : "暂无客户数据"}</p>
          </div>
        ) : (
          filtered.map(u => {
            const uType = u.trader_type_code ? traderTypes[u.trader_type_code] : null;
            return (
            <div
              key={u.id}
              className="rounded-xl p-3 cursor-pointer transition-all active:scale-[0.98]"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}
              data-testid={`user-card-${u.id}`}
              onClick={() => u.trader_type_code && setSelectedUser(u)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(var(--gold-rgb), 0.1)' }}>
                    {uType ? <span className="text-base">{uType.icon}</span> : <User className="w-4 h-4" style={{ color: 'var(--gold)' }} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium" style={{ color: 'var(--text-strong)' }}>
                        {u.nickname || u.phone}
                      </span>
                      {uType && (
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: `${uType.cardColors.primary}15`, color: uType.cardColors.primary }}>
                          {uType.name}
                        </span>
                      )}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {u.avg_score != null ? `${u.avg_score}分 · ` : ''}注册 {formatDate(u.created_at)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {u.tags?.status && u.tags.status !== 'new' && (() => {
                    const st = [
                      { value: "contacted", label: "已联系", color: "#F59E0B" },
                      { value: "following", label: "跟进中", color: "#8B5CF6" },
                      { value: "trial", label: "试听中", color: "#14B8A6" },
                      { value: "converted", label: "已成交", color: "#07C160" },
                      { value: "lost", label: "已流失", color: "#6B7280" },
                    ].find(s => s.value === u.tags?.status);
                    return st ? <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: `${st.color}20`, color: st.color }}>{st.label}</span> : null;
                  })()}
                  {u.trader_type_code && (
                    <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  )}
                </div>
              </div>

              <div className="space-y-1.5 ml-10">
                <CopyRow icon={<Phone className="w-3 h-3" />} label="手机" value={u.phone} onCopy={copyText} copiedId={copiedId} />
                {u.wechat_id && (
                  <CopyRow icon={<MessageSquare className="w-3 h-3" />} label="微信" value={u.wechat_id} onCopy={copyText} copiedId={copiedId} />
                )}
                {u.scores && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {DIMENSION_KEYS.map(k => {
                      const s = u.scores![k] ?? 0;
                      const color = s >= 70 ? '#07C160' : s >= 50 ? '#F59E0B' : '#EF4444';
                      return (
                        <div key={k} className="flex-1">
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <div className="h-full rounded-full" style={{ background: color, width: `${s}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color: 'var(--text-muted)' }}>
                  <span data-testid={`text-login-days-${u.id}`}>登录 {u.login_days} 天</span>
                  {u.source && <span data-testid={`text-source-${u.id}`}>来源: {u.source}</span>}
                  {u.quiz_completed_at && <span data-testid={`text-quiz-date-${u.id}`}>测评 {formatDate(u.quiz_completed_at)}</span>}
                  {u.last_active_at && <span data-testid={`text-active-${u.id}`}>活跃 {formatDate(u.last_active_at)}</span>}
                </div>
              </div>
            </div>
          );})
          )}
      </div>

      <AnimatePresence>
        {selectedUser && (
          <UserDetailDrawer
            user={selectedUser}
            onClose={() => setSelectedUser(null)}
            onTagsUpdate={(userId, tags) => {
              setSelectedUser(prev => prev && prev.id === userId ? { ...prev, tags } : prev);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CopyRow({ icon, label, value, onCopy, copiedId }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onCopy: (text: string, label: string) => void;
  copiedId: string | null;
}) {
  const isCopied = copiedId === value;
  return (
    <div className="flex items-center gap-2 text-xs group">
      <span style={{ color: 'var(--text-muted)' }}>{icon}</span>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span
        className="font-mono select-all cursor-pointer"
        style={{ color: 'var(--text-strong)' }}
        onClick={() => onCopy(value, label)}
        data-testid={`copy-${label}-${value}`}
      >
        {value}
      </span>
      <button
        onClick={() => onCopy(value, label)}
        className="opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: isCopied ? 'var(--success)' : 'var(--text-muted)' }}
        data-testid={`button-copy-${label}-${value}`}
      >
        {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      </button>
    </div>
  );
}

function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!password) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        credentials: "include",
      });
      if (res.ok) {
        onLogin();
      } else {
        const data = await res.json();
        toast({ title: data.message || "登录失败", variant: "destructive" });
      }
    } catch {
      toast({ title: "网络错误", variant: "destructive" });
    }
    setLoading(false);
  }, [password, onLogin, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg-0)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm rounded-2xl p-8"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <div className="flex flex-col items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(var(--gold-rgb), 0.12)' }}>
            <Shield className="w-7 h-7" style={{ color: 'var(--gold)' }} />
          </div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-strong)' }}>管理后台</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>请输入管理员密码</p>
        </div>
        <div className="space-y-3">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <input
              type="password"
              placeholder="管理员密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', color: 'var(--text-strong)' }}
              data-testid="input-admin-password"
            />
          </div>
          <motion.button
            onClick={handleSubmit}
            disabled={loading || !password}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 rounded-xl font-bold text-sm"
            style={{
              background: password ? 'var(--primary)' : 'rgba(var(--primary-rgb), 0.2)',
              color: password ? '#fff' : 'rgba(var(--primary-rgb), 0.5)',
            }}
            data-testid="button-admin-login"
          >
            {loading ? "验证中..." : "登录"}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

function AddContactForm({ onAdded }: { onAdded: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!name || !url) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url }),
        credentials: "include",
      });
      if (res.ok) {
        toast({ title: "顾问已添加" });
        setName("");
        setUrl("");
        setOpen(false);
        onAdded();
      } else {
        const data = await res.json();
        toast({ title: data.message || "添加失败", variant: "destructive" });
      }
    } catch {
      toast({ title: "网络错误", variant: "destructive" });
    }
    setLoading(false);
  }, [name, url, onAdded, toast]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
        style={{ background: 'rgba(var(--gold-rgb), 0.1)', color: 'var(--gold)', border: '1px solid rgba(var(--gold-rgb), 0.2)' }}
        data-testid="button-add-contact"
      >
        <Plus className="w-4 h-4" />
        添加顾问
      </button>
    );
  }

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: 'var(--text-strong)' }}>添加新顾问</span>
        <button onClick={() => setOpen(false)} style={{ color: 'var(--text-muted)' }}>
          <X className="w-4 h-4" />
        </button>
      </div>
      <input
        placeholder="顾问名称"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', color: 'var(--text-strong)' }}
        data-testid="input-contact-name"
      />
      <input
        placeholder="企业微信链接 (https://work.weixin.qq.com/ca/...)"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', color: 'var(--text-strong)' }}
        data-testid="input-contact-url"
      />
      <motion.button
        onClick={handleSubmit}
        disabled={loading || !name || !url}
        whileTap={{ scale: 0.98 }}
        className="w-full py-2 rounded-lg text-sm font-medium"
        style={{
          background: name && url ? 'var(--gold)' : 'rgba(var(--gold-rgb), 0.2)',
          color: name && url ? '#000' : 'rgba(var(--gold-rgb), 0.5)',
        }}
        data-testid="button-submit-contact"
      >
        {loading ? "添加中..." : "确认添加"}
      </motion.button>
    </div>
  );
}

function ContactCard({ contact, onUpdate, onDelete }: {
  contact: SalesContact;
  onUpdate: () => void;
  onDelete: () => void;
}) {
  const { toast } = useToast();
  const [checking, setChecking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(contact.name);
  const [editUrl, setEditUrl] = useState(contact.url);
  const [saving, setSaving] = useState(false);

  const toggleEnabled = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !contact.enabled }),
        credentials: "include",
      });
      if (res.ok) {
        toast({ title: contact.enabled ? "已禁用" : "已启用" });
        onUpdate();
      }
    } catch {
      toast({ title: "操作失败", variant: "destructive" });
    }
  }, [contact, onUpdate, toast]);

  const runHealthCheck = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch(`/api/admin/contacts/${contact.id}/health-check`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        toast({ title: data.status === "ok" ? "检测正常" : "检测异常" });
        onUpdate();
      }
    } catch {
      toast({ title: "检测失败", variant: "destructive" });
    }
    setChecking(false);
  }, [contact, onUpdate, toast]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/contacts/${contact.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast({ title: "已删除" });
        onDelete();
      }
    } catch {
      toast({ title: "删除失败", variant: "destructive" });
    }
    setDeleting(false);
    setConfirmDelete(false);
  }, [contact, onDelete, toast]);

  const handleSaveEdit = useCallback(async () => {
    if (!editName || !editUrl) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, url: editUrl }),
        credentials: "include",
      });
      if (res.ok) {
        toast({ title: "已保存" });
        setEditing(false);
        onUpdate();
      } else {
        const data = await res.json();
        toast({ title: data.message || "保存失败", variant: "destructive" });
      }
    } catch {
      toast({ title: "网络错误", variant: "destructive" });
    }
    setSaving(false);
  }, [contact.id, editName, editUrl, onUpdate, toast]);

  const handleCancelEdit = useCallback(() => {
    setEditName(contact.name);
    setEditUrl(contact.url);
    setEditing(false);
  }, [contact]);

  return (
    <div
      className="rounded-xl p-4 transition-all"
      style={{
        background: contact.enabled ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.01)',
        border: `1px solid ${contact.enabled ? 'var(--border)' : 'rgba(255,255,255,0.04)'}`,
        opacity: contact.enabled ? 1 : 0.6,
      }}
      data-testid={`card-contact-${contact.id}`}
    >
      {editing ? (
        <div className="space-y-2.5">
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="顾问名称"
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(var(--gold-rgb), 0.3)', color: 'var(--text-strong)' }}
            data-testid={`input-edit-name-${contact.id}`}
          />
          <input
            value={editUrl}
            onChange={(e) => setEditUrl(e.target.value)}
            placeholder="企业微信链接"
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(var(--gold-rgb), 0.3)', color: 'var(--text-strong)' }}
            data-testid={`input-edit-url-${contact.id}`}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveEdit}
              disabled={saving || !editName || !editUrl}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: 'var(--gold)', color: '#000' }}
              data-testid={`button-save-edit-${contact.id}`}
            >
              <Check className="w-3 h-3" />
              {saving ? "保存中..." : "保存"}
            </button>
            <button
              onClick={handleCancelEdit}
              className="px-3 py-1.5 rounded-lg text-xs"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}
              data-testid={`button-cancel-edit-${contact.id}`}
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-strong)' }}>{contact.name}</span>
              <StatusDot status={contact.lastHealthStatus} />
            </div>
            <p className="text-xs truncate mb-1" style={{ color: 'var(--text-muted)' }}>{contact.url}</p>
            {contact.lastHealthCheck && (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                上次检测: {new Date(contact.lastHealthCheck).toLocaleString('zh-CN')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => { setEditName(contact.name); setEditUrl(contact.url); setEditing(true); }}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)' }}
              title="编辑"
              data-testid={`button-edit-${contact.id}`}
            >
              <Pencil className="w-3.5 h-3.5" style={{ color: 'var(--gold)' }} />
            </button>
            <button
              onClick={runHealthCheck}
              disabled={checking}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)' }}
              title="健康检测"
              data-testid={`button-check-${contact.id}`}
            >
              <Activity className={`w-3.5 h-3.5 ${checking ? 'animate-pulse' : ''}`} style={{ color: 'var(--info)' }} />
            </button>
            <button
              onClick={toggleEnabled}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)' }}
              title={contact.enabled ? "禁用" : "启用"}
              data-testid={`button-toggle-${contact.id}`}
            >
              {contact.enabled ? (
                <Power className="w-3.5 h-3.5" style={{ color: '#07C160' }} />
              ) : (
                <PowerOff className="w-3.5 h-3.5" style={{ color: '#EF4444' }} />
              )}
            </button>
            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-2 py-1 rounded text-xs font-medium"
                  style={{ background: '#EF4444', color: '#fff' }}
                  data-testid={`button-confirm-delete-${contact.id}`}
                >
                  {deleting ? "..." : "确认"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-2 py-1 rounded text-xs"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}
                >
                  取消
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)' }}
                title="删除"
                data-testid={`button-delete-${contact.id}`}
              >
                <Trash2 className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

type AdminTab = "contacts" | "stats" | "users";

export default function AdminPage() {
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [contacts, setContacts] = useState<SalesContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkingAll, setCheckingAll] = useState(false);
  const [tab, setTab] = useState<AdminTab>("contacts");
  const [stats, setStats] = useState<StatsData | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/session", { credentials: "include" });
      const data = await res.json();
      setIsAdmin(data.isAdmin);
    } catch {
      setIsAdmin(false);
    }
  }, []);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/contacts", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
      }
    } catch {}
    setLoading(false);
  }, []);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/admin/stats", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {}
    setStatsLoading(false);
  }, []);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await fetch("/api/admin/users", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setAdminUsers(data);
      }
    } catch {}
    setUsersLoading(false);
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (isAdmin) {
      fetchContacts();
      fetchStats();
    }
  }, [isAdmin, fetchContacts, fetchStats]);

  const handleCheckAll = useCallback(async () => {
    setCheckingAll(true);
    try {
      const res = await fetch("/api/admin/contacts/health-check-all", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const results = await res.json();
        const dead = results.filter((r: any) => r.status === "dead");
        toast({
          title: dead.length > 0
            ? `检测完成：${dead.length} 个异常`
            : `全部正常（${results.length} 个顾问）`,
          variant: dead.length > 0 ? "destructive" : "default",
        });
        fetchContacts();
      }
    } catch {
      toast({ title: "检测失败", variant: "destructive" });
    }
    setCheckingAll(false);
  }, [fetchContacts, toast]);

  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-0)' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!isAdmin) {
    return <AdminLogin onLogin={() => { setIsAdmin(true); }} />;
  }

  const enabledCount = contacts.filter(c => c.enabled).length;
  const deadCount = contacts.filter(c => c.lastHealthStatus === "dead" && c.enabled).length;

  return (
    <div className="min-h-screen pb-12 admin-panel" style={{ background: 'var(--bg-0)', fontSize: '14px' }}>
      <div className="max-w-lg mx-auto px-5 pt-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <a href="/" className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }} data-testid="link-back-home">
              <ArrowLeft className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </a>
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-strong)' }}>管理后台</h1>
          </div>
        </div>

        <div className="flex gap-1.5 mb-5 overflow-x-auto">
          <button
            onClick={() => setTab("contacts")}
            className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium transition-colors whitespace-nowrap"
            style={{
              background: tab === "contacts" ? 'rgba(var(--gold-rgb), 0.15)' : 'rgba(255,255,255,0.03)',
              color: tab === "contacts" ? 'var(--gold)' : 'var(--text-muted)',
              border: `1px solid ${tab === "contacts" ? 'rgba(var(--gold-rgb), 0.3)' : 'var(--border)'}`,
            }}
            data-testid="tab-contacts"
          >
            <Users className="w-4 h-4" />
            顾问管理
          </button>
          <button
            onClick={() => { setTab("users"); if (adminUsers.length === 0) fetchUsers(); }}
            className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium transition-colors whitespace-nowrap"
            style={{
              background: tab === "users" ? 'rgba(var(--gold-rgb), 0.15)' : 'rgba(255,255,255,0.03)',
              color: tab === "users" ? 'var(--gold)' : 'var(--text-muted)',
              border: `1px solid ${tab === "users" ? 'rgba(var(--gold-rgb), 0.3)' : 'var(--border)'}`,
            }}
            data-testid="tab-users"
          >
            <User className="w-4 h-4" />
            客户资料
          </button>
          <button
            onClick={() => { setTab("stats"); if (!stats) fetchStats(); }}
            className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium transition-colors whitespace-nowrap"
            style={{
              background: tab === "stats" ? 'rgba(var(--gold-rgb), 0.15)' : 'rgba(255,255,255,0.03)',
              color: tab === "stats" ? 'var(--gold)' : 'var(--text-muted)',
              border: `1px solid ${tab === "stats" ? 'rgba(var(--gold-rgb), 0.3)' : 'var(--border)'}`,
            }}
            data-testid="tab-stats"
          >
            <BarChart3 className="w-4 h-4" />
            数据统计
          </button>
        </div>

        {tab === "contacts" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {enabledCount} 个启用 {deadCount > 0 && <span style={{ color: '#EF4444' }}>/ {deadCount} 个异常</span>}
              </p>
              <motion.button
                onClick={handleCheckAll}
                disabled={checkingAll}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors"
                style={{ background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)', border: '1px solid rgba(var(--primary-rgb), 0.2)' }}
                data-testid="button-check-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${checkingAll ? 'animate-spin' : ''}`} />
                {checkingAll ? "检测中..." : "全部检测"}
              </motion.button>
            </div>

            <div className="space-y-3 mb-4">
              {loading && contacts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 mx-auto rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
                </div>
              ) : contacts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>暂无顾问</p>
                </div>
              ) : (
                contacts.map(contact => (
                  <ContactCard
                    key={contact.id}
                    contact={contact}
                    onUpdate={fetchContacts}
                    onDelete={fetchContacts}
                  />
                ))
              )}
            </div>

            <AddContactForm onAdded={fetchContacts} />

            <div className="mt-8 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-strong)' }}>自动监控</p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                系统每30分钟自动检测所有启用顾问的健康状态。当某个顾问从正常变为异常时，会自动通过企业微信群发送告警通知。
              </p>
            </div>
          </>
        )}

        {tab === "users" && (
          <UsersPanel users={adminUsers} loading={usersLoading} onRefresh={fetchUsers} />
        )}

        {tab === "stats" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>网站运营数据概览</p>
              <button
                onClick={fetchStats}
                disabled={statsLoading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs"
                style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)' }}
                data-testid="button-refresh-stats"
              >
                <RefreshCw className={`w-3 h-3 ${statsLoading ? 'animate-spin' : ''}`} />
                刷新
              </button>
            </div>
            <StatsPanel stats={stats} loading={statsLoading} />
          </div>
        )}
      </div>
    </div>
  );
}
