import { performance } from "node:perf_hooks";

type Suite = {
  name: string;
  sequential: () => Promise<unknown>;
  parallel: () => Promise<unknown>;
};

type Summary = {
  name: string;
  sequentialAvgMs: number;
  parallelAvgMs: number;
  speedup: number;
  improvementPercent: number;
};

async function timeExecution(fn: () => Promise<unknown>) {
  const start = performance.now();
  await fn();
  return performance.now() - start;
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

async function measureSuite(suite: Suite, iterations: number): Promise<Summary> {
  const sequentialTimes: number[] = [];
  const parallelTimes: number[] = [];

  for (let index = 0; index < iterations; index += 1) {
    if (index % 2 === 0) {
      sequentialTimes.push(await timeExecution(suite.sequential));
      parallelTimes.push(await timeExecution(suite.parallel));
    } else {
      parallelTimes.push(await timeExecution(suite.parallel));
      sequentialTimes.push(await timeExecution(suite.sequential));
    }
  }

  const sequentialAvgMs = average(sequentialTimes);
  const parallelAvgMs = average(parallelTimes);

  return {
    name: suite.name,
    sequentialAvgMs,
    parallelAvgMs,
    speedup: sequentialAvgMs / parallelAvgMs,
    improvementPercent: ((sequentialAvgMs - parallelAvgMs) / sequentialAvgMs) * 100,
  };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL 未设置，无法执行 stats benchmark。");
    process.exit(1);
  }

  const iterations = Math.max(Number(process.env.BENCH_ITERATIONS || 5), 1);
  const [{ getAdminStats, getAdminStatsSequential, getExternalStats, getExternalStatsSequential }, { pool }] = await Promise.all([
    import("../server/stats"),
    import("../server/db"),
  ]);

  const suites: Suite[] = [
    {
      name: "admin stats",
      sequential: () => getAdminStatsSequential(),
      parallel: () => getAdminStats(),
    },
    {
      name: "external stats",
      sequential: () => getExternalStatsSequential(),
      parallel: () => getExternalStats(),
    },
  ];

  try {
    const results: Summary[] = [];
    console.log(`Running stats benchmark (${iterations} iterations per suite)...`);

    for (const suite of suites) {
      console.log(`- ${suite.name}`);
      results.push(await measureSuite(suite, iterations));
    }

    console.table(
      results.map((result) => ({
        suite: result.name,
        sequential_avg_ms: result.sequentialAvgMs.toFixed(2),
        parallel_avg_ms: result.parallelAvgMs.toFixed(2),
        speedup: `${result.speedup.toFixed(2)}x`,
        improvement: `${result.improvementPercent.toFixed(1)}%`,
      })),
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Stats benchmark failed:", err);
  process.exit(1);
});
