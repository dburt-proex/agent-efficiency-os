import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const runs = sqliteTable(
  "runs",
  {
    id: text("id").primaryKey(),
    externalKey: text("external_key").notNull(),
    systemKey: text("system_key").notNull().default("mirdexx"),
    ledgerNamespace: text("ledger_namespace").notNull().default("mirdexx.shared"),
    title: text("title").notNull(),
    objective: text("objective").notNull(),
    status: text("status").notNull().default("active"),
    currentGate: text("current_gate").notNull().default("REVIEW"),
    ownerEmail: text("owner_email").notNull(),
    agentKey: text("agent_key").notNull().default("codex"),
    policyVersion: text("policy_version").notNull().default("MGEP-1.0"),
    authorityScope: text("authority_scope").notNull().default("read-only"),
    dataClassification: text("data_classification").notNull().default("internal"),
    tokenBudget: integer("token_budget").notNull().default(50000),
    toolBudget: integer("tool_budget").notNull().default(12),
    sourceRef: text("source_ref").notNull().default(""),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    completedAt: text("completed_at"),
  },
  (table) => [
    uniqueIndex("runs_external_key_unique").on(table.externalKey),
    index("runs_owner_updated_idx").on(table.ownerEmail, table.updatedAt),
  ],
);

export const decisions = sqliteTable(
  "decisions",
  {
    id: text("id").primaryKey(),
    runId: text("run_id").notNull().references(() => runs.id, { onDelete: "cascade" }),
    decisionKey: text("decision_key").notNull(),
    sequence: integer("sequence").notNull(),
    gate: text("gate").notNull(),
    rationale: text("rationale").notNull(),
    evidenceSummary: text("evidence_summary").notNull().default(""),
    assumptions: text("assumptions").notNull().default(""),
    risk: text("risk").notNull().default("medium"),
    actorEmail: text("actor_email").notNull(),
    reviewerEmail: text("reviewer_email").notNull().default(""),
    policyVersion: text("policy_version").notNull(),
    scope: text("scope").notNull().default("execution"),
    nextGate: text("next_gate").notNull().default(""),
    previousHash: text("previous_hash").notNull(),
    eventHash: text("event_hash").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("decisions_run_sequence_unique").on(table.runId, table.sequence),
    uniqueIndex("decisions_decision_key_unique").on(table.decisionKey),
    index("decisions_run_created_idx").on(table.runId, table.createdAt),
  ],
);

export const evidenceRecords = sqliteTable(
  "evidence_records",
  {
    id: text("id").primaryKey(),
    runId: text("run_id").notNull().references(() => runs.id, { onDelete: "cascade" }),
    decisionId: text("decision_id").references(() => decisions.id, { onDelete: "set null" }),
    evidenceKey: text("evidence_key").notNull(),
    kind: text("kind").notNull().default("artifact"),
    uri: text("uri").notNull().default(""),
    summary: text("summary").notNull(),
    contentHash: text("content_hash").notNull(),
    sourceAuthority: text("source_authority").notNull().default("workspace"),
    freshness: text("freshness").notNull().default("current-run"),
    actorEmail: text("actor_email").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("evidence_records_key_unique").on(table.evidenceKey),
    index("evidence_records_run_created_idx").on(table.runId, table.createdAt),
  ],
);
