import { DatabaseStorage } from "../server/storage";

const storage = new DatabaseStorage() as unknown as Record<string, unknown>;

const requiredMethods = [
  "getAgentById",
  "listLeadImportBatches",
  "findStrongLeadDuplicate",
  "findWeakLeadDuplicateCandidates",
  "createLeadImportBatch",
  "completeLeadImportBatch",
  "createLead",
  "getLeadQueueForSales",
  "markLeadValid",
  "markLeadInvalid",
  "getValidLeadsForSales",
  "getInvalidLeadsForSales",
  "getSalesLeadStats",
  "getPendingDuplicateReviews",
  "reviewDuplicateLead",
] as const;

for (const methodName of requiredMethods) {
  if (typeof storage[methodName] !== "function") {
    throw new Error(`Expected DatabaseStorage.${methodName} to exist`);
  }
}

console.log("lead storage methods are available");
