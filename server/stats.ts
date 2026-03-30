import { sql } from "drizzle-orm";
import { db } from "./db";

type QueryRows<T = Record<string, unknown>> = { rows?: T[] } | T[];

type StatsWindow = {
  now: Date;
  todayStart: Date;
  weekStart: Date;
  monthStart: Date;
};

function createStatsWindow(now = new Date()): StatsWindow {
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(todayStart);
  monthStart.setDate(monthStart.getDate() - 30);

  return { now, todayStart, weekStart, monthStart };
}

function rowsOf<T>(result: QueryRows<T>): T[] {
  return Array.isArray(result) ? result : result.rows || [];
}

function firstRowOf<T extends Record<string, unknown>>(result: QueryRows<T>): T {
  return rowsOf(result)[0] || ({} as T);
}

function createAdminStatsQueries({ todayStart, weekStart, monthStart }: StatsWindow) {
  return {
    overview: () => db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE event_type = 'page_view') AS total_views,
        COUNT(*) FILTER (WHERE event_type = 'user_register') AS total_registers,
        COUNT(*) FILTER (WHERE event_type = 'wechat_click') AS total_wechat_clicks,
        COUNT(*) FILTER (WHERE event_type = 'wechat_contact_assign') AS total_assigns,
        COUNT(*) FILTER (WHERE event_type = 'quiz_complete') AS total_quiz_completes,
        COUNT(*) FILTER (WHERE event_type = 'page_view' AND created_at >= ${todayStart}) AS today_views,
        COUNT(*) FILTER (WHERE event_type = 'user_register' AND created_at >= ${todayStart}) AS today_registers,
        COUNT(*) FILTER (WHERE event_type = 'wechat_click' AND created_at >= ${todayStart}) AS today_wechat_clicks,
        COUNT(*) FILTER (WHERE event_type = 'page_view' AND created_at >= ${weekStart}) AS week_views,
        COUNT(*) FILTER (WHERE event_type = 'user_register' AND created_at >= ${weekStart}) AS week_registers,
        COUNT(*) FILTER (WHERE event_type = 'wechat_click' AND created_at >= ${weekStart}) AS week_wechat_clicks,
        COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'page_view') AS total_unique_visitors,
        COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'page_view' AND created_at >= ${todayStart}) AS today_unique_visitors
      FROM user_events
    `),
    contactStats: () => db.execute(sql`
      SELECT
        event_data->>'contactName' AS contact_name,
        COUNT(*) AS assign_count
      FROM user_events
      WHERE event_type = 'wechat_contact_assign'
        AND event_data->>'contactName' IS NOT NULL
      GROUP BY event_data->>'contactName'
      ORDER BY assign_count DESC
    `),
    dailyTrend: () => db.execute(sql`
      SELECT
        DATE(created_at) AS date,
        COUNT(*) FILTER (WHERE event_type = 'page_view') AS views,
        COUNT(*) FILTER (WHERE event_type = 'user_register') AS registers,
        COUNT(*) FILTER (WHERE event_type = 'wechat_click') AS wechat_clicks
      FROM user_events
      WHERE created_at >= ${monthStart}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `),
    funnel: () => db.execute(sql`
      SELECT
        COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'page_view') AS step_view,
        COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'user_register') AS step_register,
        COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'quiz_complete') AS step_quiz,
        COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'wechat_click') AS step_wechat
      FROM user_events
    `),
    traderTypes: () => db.execute(sql`
      SELECT
        event_data->>'traderTypeCode' AS type_code,
        COUNT(*) AS count
      FROM user_events
      WHERE event_type = 'quiz_complete'
        AND event_data->>'traderTypeCode' IS NOT NULL
      GROUP BY event_data->>'traderTypeCode'
      ORDER BY count DESC
    `),
    hourlyDistribution: () => db.execute(sql`
      SELECT
        EXTRACT(HOUR FROM created_at) AS hour,
        COUNT(*) AS count
      FROM user_events
      WHERE event_type = 'page_view' AND created_at >= ${weekStart}
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hour
    `),
  };
}

function createExternalStatsQueries({ todayStart, weekStart }: StatsWindow) {
  return {
    overview: () => db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE event_type = 'page_view') AS total_views,
        COUNT(*) FILTER (WHERE event_type = 'user_register') AS total_registers,
        COUNT(*) FILTER (WHERE event_type = 'wechat_click') AS total_wechat_clicks,
        COUNT(*) FILTER (WHERE event_type = 'wechat_contact_assign') AS total_assigns,
        COUNT(*) FILTER (WHERE event_type = 'quiz_complete') AS total_quiz_completes,
        COUNT(*) FILTER (WHERE event_type = 'page_view' AND created_at >= ${todayStart}) AS today_views,
        COUNT(*) FILTER (WHERE event_type = 'user_register' AND created_at >= ${todayStart}) AS today_registers,
        COUNT(*) FILTER (WHERE event_type = 'wechat_click' AND created_at >= ${todayStart}) AS today_wechat_clicks,
        COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'page_view') AS total_unique_visitors,
        COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'page_view' AND created_at >= ${todayStart}) AS today_unique_visitors
      FROM user_events
    `),
    funnel: () => db.execute(sql`
      SELECT
        COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'page_view') AS step_view,
        COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'user_register') AS step_register,
        COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'quiz_complete') AS step_quiz,
        COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'wechat_click') AS step_wechat
      FROM user_events
    `),
    traderTypes: () => db.execute(sql`
      SELECT
        event_data->>'traderTypeCode' AS type_code,
        COUNT(*) AS count
      FROM user_events
      WHERE event_type = 'quiz_complete'
        AND event_data->>'traderTypeCode' IS NOT NULL
      GROUP BY event_data->>'traderTypeCode'
      ORDER BY count DESC
    `),
    contactStats: () => db.execute(sql`
      SELECT
        event_data->>'contactName' AS contact_name,
        COUNT(*) AS assign_count
      FROM user_events
      WHERE event_type = 'wechat_contact_assign'
        AND event_data->>'contactName' IS NOT NULL
      GROUP BY event_data->>'contactName'
      ORDER BY assign_count DESC
    `),
    dailyTrend: () => db.execute(sql`
      SELECT
        DATE(created_at) AS date,
        COUNT(*) FILTER (WHERE event_type = 'page_view') AS views,
        COUNT(*) FILTER (WHERE event_type = 'user_register') AS registers,
        COUNT(*) FILTER (WHERE event_type = 'wechat_click') AS wechat_clicks
      FROM user_events
      WHERE created_at >= ${weekStart}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `),
    users: () => db.execute(sql`
      SELECT
        id, phone, nickname, source, tier,
        created_at AS registered_at,
        last_active_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 100
    `),
  };
}

function maskUsers(users: Array<Record<string, unknown>>) {
  return users.map((user) => {
    const phone = typeof user.phone === "string"
      ? `${user.phone.slice(0, 3)}****${user.phone.slice(-4)}`
      : null;

    return {
      ...user,
      phone,
    };
  });
}

export async function getAdminStats(now = new Date()) {
  const queries = createAdminStatsQueries(createStatsWindow(now));
  const [
    overviewResult,
    contactStatsResult,
    dailyTrendResult,
    funnelResult,
    traderTypesResult,
    hourlyDistributionResult,
  ] = await Promise.all([
    queries.overview(),
    queries.contactStats(),
    queries.dailyTrend(),
    queries.funnel(),
    queries.traderTypes(),
    queries.hourlyDistribution(),
  ]);

  return {
    overview: firstRowOf(overviewResult),
    contactStats: rowsOf(contactStatsResult),
    dailyTrend: rowsOf(dailyTrendResult),
    funnel: firstRowOf(funnelResult),
    traderTypes: rowsOf(traderTypesResult),
    hourlyDistribution: rowsOf(hourlyDistributionResult),
  };
}

export async function getAdminStatsSequential(now = new Date()) {
  const queries = createAdminStatsQueries(createStatsWindow(now));
  const overviewResult = await queries.overview();
  const contactStatsResult = await queries.contactStats();
  const dailyTrendResult = await queries.dailyTrend();
  const funnelResult = await queries.funnel();
  const traderTypesResult = await queries.traderTypes();
  const hourlyDistributionResult = await queries.hourlyDistribution();

  return {
    overview: firstRowOf(overviewResult),
    contactStats: rowsOf(contactStatsResult),
    dailyTrend: rowsOf(dailyTrendResult),
    funnel: firstRowOf(funnelResult),
    traderTypes: rowsOf(traderTypesResult),
    hourlyDistribution: rowsOf(hourlyDistributionResult),
  };
}

export async function getExternalStats(now = new Date()) {
  const statsWindow = createStatsWindow(now);
  const queries = createExternalStatsQueries(statsWindow);
  const [
    overviewResult,
    funnelResult,
    traderTypesResult,
    contactStatsResult,
    dailyTrendResult,
    usersResult,
  ] = await Promise.all([
    queries.overview(),
    queries.funnel(),
    queries.traderTypes(),
    queries.contactStats(),
    queries.dailyTrend(),
    queries.users(),
  ]);

  return {
    source: "dptest.org",
    generatedAt: statsWindow.now.toISOString(),
    overview: firstRowOf(overviewResult),
    funnel: firstRowOf(funnelResult),
    traderTypes: rowsOf(traderTypesResult),
    contactStats: rowsOf(contactStatsResult),
    dailyTrend: rowsOf(dailyTrendResult),
    users: maskUsers(rowsOf(usersResult) as Array<Record<string, unknown>>),
  };
}

export async function getExternalStatsSequential(now = new Date()) {
  const statsWindow = createStatsWindow(now);
  const queries = createExternalStatsQueries(statsWindow);
  const overviewResult = await queries.overview();
  const funnelResult = await queries.funnel();
  const traderTypesResult = await queries.traderTypes();
  const contactStatsResult = await queries.contactStats();
  const dailyTrendResult = await queries.dailyTrend();
  const usersResult = await queries.users();

  return {
    source: "dptest.org",
    generatedAt: statsWindow.now.toISOString(),
    overview: firstRowOf(overviewResult),
    funnel: firstRowOf(funnelResult),
    traderTypes: rowsOf(traderTypesResult),
    contactStats: rowsOf(contactStatsResult),
    dailyTrend: rowsOf(dailyTrendResult),
    users: maskUsers(rowsOf(usersResult) as Array<Record<string, unknown>>),
  };
}
