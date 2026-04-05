import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const localStorageStore = new Map<string, string>();

Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (key: string) => localStorageStore.get(key) ?? null,
    setItem: (key: string, value: string) => {
      localStorageStore.set(key, value);
    },
    removeItem: (key: string) => {
      localStorageStore.delete(key);
    },
  },
  configurable: true,
});

Object.defineProperty(globalThis, "fetch", {
  value: async () => ({ ok: true }),
  configurable: true,
});

async function main() {
  const { calculateOrderflowDiagnosticResult } = await import("../client/src/utils/orderflowDiagnostic");
  const { ORDERFLOW_RESULT_TITLE } = await import("../client/src/data/orderflowPresentation");
  const { default: OrderflowDiagnosticView } = await import("../client/src/components/OrderflowDiagnosticView");

  const result = calculateOrderflowDiagnosticResult("deep", new Array(12).fill(0));

  const html = renderToStaticMarkup(
    React.createElement(OrderflowDiagnosticView, {
      result,
      title: ORDERFLOW_RESULT_TITLE,
      subtitle: "这份结果用于判断你现在更适合先做课程、软件、直播培育，还是考试盘路径。",
      customerFacing: true,
    }),
  );

  assert.equal(html.includes(ORDERFLOW_RESULT_TITLE), true);
  assert.equal(html.includes("付费意向"), false);
  assert.equal(html.includes("销售标签"), false);
  assert.equal(html.includes(result.segmentTags[0]?.label ?? ""), false);
  assert.equal(html.includes(result.customerProfile.paymentIntent.label), false);
  assert.equal(html.includes('data-testid="orderflow-radar-chart"'), true);
  assert.equal(html.includes("交易系统映射"), false);
  assert.equal(html.includes("建议方向"), true);
  assert.equal(html.includes("学习资料与下一步"), true);
  assert.equal(html.includes("展开全部资料"), true);
  assert.equal(html.includes("专业解读"), true);
  assert.equal(html.includes("诊断方案"), false);
  assert.equal(html.includes("当前判断"), false);
  assert.equal(html.includes("学习路径建议"), true);
  assert.equal(html.includes("优势项参考"), true);
  assert.equal(html.includes("短板项参考"), true);
  assert.equal(html.includes("高优先级客户"), false);
  assert.equal(html.includes("承接"), false);
  assert.equal(html.includes("深测"), false);
  assert.equal(html.includes("立即行动建议"), true);
  assert.equal(html.includes(">立即行动<"), true);
  assert.equal(html.includes("交易阶段"), false);

  console.log("test-orderflow-result-presentation: ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
