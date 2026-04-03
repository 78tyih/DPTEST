# Orderflow Diagnostic Engine Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce the new orderflow diagnostic core into `DPTEST` without breaking the existing login, storage, and result-page flow.

**Architecture:** Add a parallel orderflow-diagnostic domain beside the legacy人格测评 domain. Phase 1 only builds the new question bank, scoring engine, and webhook payload/formatting so the later UI refactor can switch over with lower risk. Legacy files remain compatible during this phase.

**Tech Stack:** TypeScript, React client modules, Express server webhook formatting, `tsx` script-based assertions for TDD.

---

### Task 1: Add a failing executable spec for the new diagnostic core

**Files:**
- Create: `script/test-orderflow-diagnostic.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing test**

Create a script that imports the new diagnostic calculator and webhook builder, then asserts:
- starter track returns starter reward assets and a score band
- deep track returns deep reward assets, segment tags, and a recommended action
- webhook payload contains `selectedTrack`, `scoreBand`, `dimensionScores`, `segmentTags`, and `unlockRewards`

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx script/test-orderflow-diagnostic.ts`
Expected: fail because the orderflow diagnostic modules do not exist yet.

### Task 2: Implement the orderflow diagnostic domain model

**Files:**
- Create: `client/src/data/orderflowDiagnostic.ts`
- Create: `client/src/utils/orderflowDiagnostic.ts`
- Test: `script/test-orderflow-diagnostic.ts`

- [ ] **Step 1: Write the minimal data model**

Add:
- tracks: `starter`, `deep`
- dimensions: `awareness`, `market-fit`, `risk-control`, `execution`, `tool-readiness`, `commercial-intent`
- reward assets matching the approved unlock matrix
- score bands for starter/deep tracks
- segment tag metadata for sales follow-up
- starter and deep question sets

- [ ] **Step 2: Implement the calculator**

Add a pure function that:
- accepts `trackId` and `answers`
- accumulates raw/normalized dimension scores
- computes average score and matching score band
- derives top dimensions
- derives segment tags from option signals
- returns unlock rewards and recommended action

- [ ] **Step 3: Run test to verify it passes**

Run: `npx tsx script/test-orderflow-diagnostic.ts`
Expected: pass.

### Task 3: Extend webhook payload generation and server-side formatting

**Files:**
- Modify: `client/src/utils/webhook.ts`
- Modify: `server/webhook.ts`
- Modify: `server/routes.ts`
- Test: `script/test-orderflow-diagnostic.ts`

- [ ] **Step 1: Add a new client payload builder**

Add `buildOrderflowResultWebhookPayload()` that produces:
- `selectedTrack`
- `scoreBand`
- `dimensionScores`
- `segmentTags`
- `unlockRewards`
- `recommendedAction`
- `recommendedPath`

- [ ] **Step 2: Support dual payloads server-side**

Make the webhook route and notification formatter accept both:
- legacy人格 payloads
- new orderflow diagnostic payloads

Do not break the current route contract for legacy callers.

- [ ] **Step 3: Re-run the test and project checks**

Run:
- `npx tsx script/test-orderflow-diagnostic.ts`
- `npm run check`
- `npm run build`

Expected: all pass.

### Task 4: Commit the first slice

**Files:**
- Modify: files above

- [ ] **Step 1: Commit**

```bash
git add package.json script/test-orderflow-diagnostic.ts client/src/data/orderflowDiagnostic.ts client/src/utils/orderflowDiagnostic.ts client/src/utils/webhook.ts server/webhook.ts server/routes.ts docs/superpowers/plans/2026-04-04-orderflow-diagnostic-engine-phase1.md
git commit -m "Add orderflow diagnostic core"
```
