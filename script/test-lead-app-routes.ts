import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appPath = resolve("/Users/a1234/DPTEST/client/src/App.tsx");
const source = readFileSync(appPath, "utf8");

const expectedFragments = [
  'import LeadMobilePage from "@/pages/lead-mobile";',
  'import LeadValidPage from "@/pages/lead-valid";',
  'import LeadInvalidPage from "@/pages/lead-invalid";',
  'import LeadStatsPage from "@/pages/lead-stats";',
  'import LeadOpsImportPage from "@/pages/lead-ops-import";',
  'import LeadAdminPage from "@/pages/lead-admin";',
  '<Route path="/lead/mobile" component={LeadMobilePage} />',
  '<Route path="/lead/valid" component={LeadValidPage} />',
  '<Route path="/lead/invalid" component={LeadInvalidPage} />',
  '<Route path="/lead/stats" component={LeadStatsPage} />',
  '<Route path="/lead/ops-import" component={LeadOpsImportPage} />',
  '<Route path="/lead/admin" component={LeadAdminPage} />',
];

const missing = expectedFragments.filter((fragment) => !source.includes(fragment));

if (missing.length > 0) {
  console.error("Missing lead app routes:");
  for (const fragment of missing) {
    console.error(`- ${fragment}`);
  }
  process.exit(1);
}

console.log("lead app routes are present");
