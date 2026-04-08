import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const routesPath = resolve("/Users/a1234/DPTEST/server/routes.ts");
const source = readFileSync(routesPath, "utf8");

const expectedFragments = [
  'app.post("/api/lead/import/preview"',
  'app.post("/api/lead/import/commit"',
  'app.get("/api/lead/import/batches"',
  'app.get("/api/lead/queue"',
  'app.post("/api/lead/:id/mark-valid"',
  'app.post("/api/lead/:id/mark-invalid"',
  'app.get("/api/lead/valid"',
  'app.get("/api/lead/invalid"',
  'app.get("/api/lead/stats/me"',
  'app.get("/api/lead/admin/stats"',
  'app.get("/api/lead/admin/overview"',
  'app.get("/api/lead/admin/duplicates"',
  'app.post("/api/lead/admin/duplicates/:id/review"',
  'app.get("/api/lead/admin/rules"',
  'app.post("/api/lead/admin/rules"',
];

const missing = expectedFragments.filter((fragment) => !source.includes(fragment));

if (missing.length > 0) {
  console.error("Missing lead routes:");
  for (const fragment of missing) {
    console.error(`- ${fragment}`);
  }
  process.exit(1);
}

console.log("lead route registrations are present");
