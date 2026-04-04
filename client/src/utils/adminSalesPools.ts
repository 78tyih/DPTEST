export interface AdminUsersFilterState {
  search: string;
  stage: string;
  payment: string;
  path: string;
  tag: string;
  page: number;
  pageSize: number;
}

export interface AdminSalesPoolPreset {
  key: string;
  label: string;
  description: string;
  patch: Partial<AdminUsersFilterState>;
}

export const adminSalesPoolPresets: AdminSalesPoolPreset[] = [
  {
    key: "all",
    label: "全部客户",
    description: "清空销售池筛选，回到完整名单。",
    patch: {
      search: "",
      stage: "all",
      payment: "all",
      path: "all",
      tag: "all",
      page: 1,
    },
  },
  {
    key: "high-payment",
    label: "高付费意向",
    description: "优先联系已具备明确预算和购买意愿的客户。",
    patch: {
      payment: "高付费意向",
      stage: "all",
      path: "all",
      tag: "all",
      page: 1,
    },
  },
  {
    key: "novice",
    label: "订单流小白",
    description: "适合先推入门资料和直播培育的客户池。",
    patch: {
      stage: "订单流小白",
      payment: "all",
      path: "all",
      tag: "all",
      page: 1,
    },
  },
  {
    key: "trading-master",
    label: "交易大师型",
    description: "偏成熟客群，适合直接讨论训练和执行体系。",
    patch: {
      stage: "交易大师型",
      payment: "all",
      path: "all",
      tag: "all",
      page: 1,
    },
  },
  {
    key: "course-intent",
    label: "课程高意向",
    description: "优先推进课程诊断和体系化训练转化。",
    patch: {
      tag: "课程高意向",
      stage: "all",
      payment: "all",
      path: "all",
      page: 1,
    },
  },
  {
    key: "risk-cooling",
    label: "风险降温",
    description: "先做预期管理，不直接推进高价成交。",
    patch: {
      path: "风险降温系统",
      stage: "all",
      payment: "all",
      tag: "all",
      page: 1,
    },
  },
];

export function buildAdminSalesPoolQueryPatch(key: string): Partial<AdminUsersFilterState> {
  const preset = adminSalesPoolPresets.find((item) => item.key === key) ?? adminSalesPoolPresets[0];
  return { ...preset.patch };
}

export function isAdminSalesPoolActive(
  key: string,
  query: Pick<AdminUsersFilterState, "search" | "stage" | "payment" | "path" | "tag">,
): boolean {
  const patch = buildAdminSalesPoolQueryPatch(key);

  return (patch.search ?? "") === query.search
    && (patch.stage ?? "all") === query.stage
    && (patch.payment ?? "all") === query.payment
    && (patch.path ?? "all") === query.path
    && (patch.tag ?? "all") === query.tag;
}
