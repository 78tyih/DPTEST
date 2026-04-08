import {
  agents,
  leadActions,
  leadAssignments,
  leadDuplicateReviews,
  leadImportBatches,
  leadInvalidReasons,
  leads,
  leadSources,
} from "../shared/schema";

function assertTable(name: string, value: unknown) {
  if (!value || typeof value !== "object") {
    throw new Error(`Expected ${name} to be a table export`);
  }
}

assertTable("agents", agents);
assertTable("leadSources", leadSources);
assertTable("leadInvalidReasons", leadInvalidReasons);
assertTable("leadImportBatches", leadImportBatches);
assertTable("leads", leads);
assertTable("leadAssignments", leadAssignments);
assertTable("leadActions", leadActions);
assertTable("leadDuplicateReviews", leadDuplicateReviews);

console.log("lead schema exports are available");
