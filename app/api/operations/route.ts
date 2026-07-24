type Gate = "ALLOW" | "REVIEW" | "HALT";
type RunStatus = "queued" | "active" | "review" | "blocked" | "completed";

type RunRow = {
  id: string;
  external_key: string;
  system_key: string;
  ledger_namespace: string;
  title: string;
  objective: string;
  status: RunStatus;
  current_gate: Gate;
  owner_email: string;
  agent_key: string;
  policy_version: string;
  authority_scope: string;
  data_classification: string;
  token_budget: number;
  tool_budget: number;
  source_ref: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

type DecisionRow = {
  id: string;
  run_id: string;
  decision_key: string;
  sequence: number;
  gate: Gate;
  rationale: string;
  evidence_summary: string;
  assumptions: string;
  risk: string;
  actor_email: string;
  reviewer_email: string;
  policy_version: string;
  scope: string;
  next_gate: string;
  previous_hash: string;
  event_hash: string;
  created_at: string;
};

type EvidenceRow = {
  id: string;
  run_id: string;
  decision_id: string | null;
  evidence_key: string;
  kind: string;
  uri: string;
  summary: string;
  content_hash: string;
  source_authority: string;
  freshness: string;
  actor_email: string;
  created_at: string;
};

let initialization: Promise<void> | null = null;

async function database() {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) throw new Error("The governed operations database is not bound.");
  return env.DB;
}

async function ensureSchema() {
  if (initialization) return initialization;

  const db = await database();
  initialization = db
    .batch([
      db.prepare(`CREATE TABLE IF NOT EXISTS runs (
        id TEXT PRIMARY KEY NOT NULL,
        external_key TEXT NOT NULL UNIQUE,
        system_key TEXT NOT NULL DEFAULT 'mirdexx',
        ledger_namespace TEXT NOT NULL DEFAULT 'mirdexx.shared',
        title TEXT NOT NULL,
        objective TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        current_gate TEXT NOT NULL DEFAULT 'REVIEW',
        owner_email TEXT NOT NULL,
        agent_key TEXT NOT NULL DEFAULT 'codex',
        policy_version TEXT NOT NULL DEFAULT 'MGEP-1.0',
        authority_scope TEXT NOT NULL DEFAULT 'read-only',
        data_classification TEXT NOT NULL DEFAULT 'internal',
        token_budget INTEGER NOT NULL DEFAULT 50000,
        tool_budget INTEGER NOT NULL DEFAULT 12,
        source_ref TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        completed_at TEXT
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS decisions (
        id TEXT PRIMARY KEY NOT NULL,
        run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
        decision_key TEXT NOT NULL UNIQUE,
        sequence INTEGER NOT NULL,
        gate TEXT NOT NULL,
        rationale TEXT NOT NULL,
        evidence_summary TEXT NOT NULL DEFAULT '',
        assumptions TEXT NOT NULL DEFAULT '',
        risk TEXT NOT NULL DEFAULT 'medium',
        actor_email TEXT NOT NULL,
        reviewer_email TEXT NOT NULL DEFAULT '',
        policy_version TEXT NOT NULL,
        scope TEXT NOT NULL DEFAULT 'execution',
        next_gate TEXT NOT NULL DEFAULT '',
        previous_hash TEXT NOT NULL,
        event_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(run_id, sequence)
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS evidence_records (
        id TEXT PRIMARY KEY NOT NULL,
        run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
        decision_id TEXT REFERENCES decisions(id) ON DELETE SET NULL,
        evidence_key TEXT NOT NULL UNIQUE,
        kind TEXT NOT NULL DEFAULT 'artifact',
        uri TEXT NOT NULL DEFAULT '',
        summary TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        source_authority TEXT NOT NULL DEFAULT 'workspace',
        freshness TEXT NOT NULL DEFAULT 'current-run',
        actor_email TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`),
      db.prepare("CREATE INDEX IF NOT EXISTS runs_owner_updated_idx ON runs(owner_email, updated_at)"),
      db.prepare("CREATE INDEX IF NOT EXISTS decisions_run_created_idx ON decisions(run_id, created_at)"),
      db.prepare("CREATE INDEX IF NOT EXISTS evidence_records_run_created_idx ON evidence_records(run_id, created_at)"),
    ])
    .then(() => undefined)
    .catch((error) => {
      initialization = null;
      throw error;
    });

  return initialization;
}

function requestActor(request: Request) {
  const email = request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase();
  if (email) return email;

  const host = new URL(request.url).hostname;
  if (host === "terminal.local" || host === "localhost" || host === "127.0.0.1") {
    return "preview@local";
  }

  return null;
}

function clean(value: unknown, max = 2000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function asPositiveInt(value: unknown, fallback: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(Math.floor(parsed), max) : fallback;
}

function isGate(value: unknown): value is Gate {
  return value === "ALLOW" || value === "REVIEW" || value === "HALT";
}

function isRunStatus(value: unknown): value is RunStatus {
  return value === "queued" || value === "active" || value === "review" || value === "blocked" || value === "completed";
}

function statusForGate(gate: Gate): RunStatus {
  if (gate === "HALT") return "blocked";
  if (gate === "REVIEW") return "review";
  return "active";
}

function shortKey(prefix: string) {
  const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `${prefix}-${stamp}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function ownedRun(runId: string, actor: string) {
  const db = await database();
  const row = await db
    .prepare("SELECT * FROM runs WHERE id = ? AND owner_email = ? LIMIT 1")
    .bind(runId, actor)
    .first<RunRow>();
  return row ?? null;
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected operations-console error.";
  return Response.json({ error: message }, { status: 500 });
}

export async function GET(request: Request) {
  const actor = requestActor(request);
  if (!actor) return Response.json({ error: "Authenticated workspace identity required." }, { status: 401 });

  try {
    await ensureSchema();
    const db = await database();
    const url = new URL(request.url);
    const requestedRunId = clean(url.searchParams.get("run_id"), 120);
    const runsResult = await db
      .prepare("SELECT * FROM runs WHERE owner_email = ? ORDER BY updated_at DESC LIMIT 100")
      .bind(actor)
      .all<RunRow>();
    const runs = runsResult.results ?? [];
    const selectedRunId = requestedRunId && runs.some((run) => run.id === requestedRunId)
      ? requestedRunId
      : runs[0]?.id ?? "";

    let decisions: DecisionRow[] = [];
    let evidence: EvidenceRow[] = [];
    if (selectedRunId) {
      const [decisionResult, evidenceResult] = await db.batch([
        db.prepare("SELECT * FROM decisions WHERE run_id = ? ORDER BY sequence DESC LIMIT 100").bind(selectedRunId),
        db.prepare("SELECT * FROM evidence_records WHERE run_id = ? ORDER BY created_at DESC LIMIT 100").bind(selectedRunId),
      ]);
      decisions = (decisionResult.results ?? []) as unknown as DecisionRow[];
      evidence = (evidenceResult.results ?? []) as unknown as EvidenceRow[];
    }

    const metrics = {
      totalRuns: runs.length,
      activeRuns: runs.filter((run) => run.status === "active" || run.status === "review").length,
      blockedRuns: runs.filter((run) => run.status === "blocked").length,
      recordedDecisions: decisions.length,
    };

    return Response.json({ actor, runs, selectedRunId, decisions, evidence, metrics });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  const actor = requestActor(request);
  if (!actor) return Response.json({ error: "Authenticated workspace identity required." }, { status: 401 });

  try {
    await ensureSchema();
    const db = await database();
    const body = (await request.json()) as Record<string, unknown>;
    const action = clean(body.action, 40);

    if (action === "initialize_mastery_run") {
      const policyVersion = "AEOS-LIT-1.0";
      const existing = await db
        .prepare("SELECT * FROM runs WHERE owner_email = ? AND policy_version = ? ORDER BY created_at DESC LIMIT 1")
        .bind(actor, policyVersion)
        .first<RunRow>();

      if (existing) {
        return Response.json({ run: existing, initialized: false });
      }

      const runId = crypto.randomUUID();
      const externalKey = shortKey("MRDX-RUN");
      const decisionId = crypto.randomUUID();
      const decisionKey = shortKey("MRDX-DEC");
      const courseEvidenceId = crypto.randomUUID();
      const courseEvidenceKey = shortKey("MRDX-EVD");
      const referenceEvidenceId = crypto.randomUUID();
      const referenceEvidenceKey = shortKey("MRDX-EVD");
      const runbookEvidenceId = crypto.randomUUID();
      const runbookEvidenceKey = shortKey("MRDX-EVD");
      const worksheetEvidenceId = crypto.randomUUID();
      const worksheetEvidenceKey = shortKey("MRDX-EVD");
      const now = new Date().toISOString();
      const courseUri = "library:libfile_58d7e16549048191ae198768661aaae5";
      const referenceUri = "library:libfile_4da5b6463bac81918fa9fac91009b02b";
      const runbookUri = "library:libfile_045f932b2478819180583888a8bad7f6";
      const worksheetUri = "library:libfile_5736aa6a394081919bce01239b941404";
      const courseSummary = "Canonical private Agentic Systems Architect curriculum. Module 0 requires a typed, read-only agent loop, bounded turns, traces, failure handling, and an independent learner defense.";
      const referenceSummary = "Governed Agent Foundry Core reference archive. SHA-256 71b8aad1f7cee9fdc6a4b0b630877a34a71992a4109ab795cde66eac7f271cb1 verified on 2026-07-21; 35 repository tests and Ruff checks passed in the bounded AEOS validation run.";
      const runbookSummary = "AEOS AI Literacy Advancement Runbook v1.0. Governing decision, evidence limits, active/next/backlog state, Module 0 execution contract, gate logic, and reversal condition.";
      const worksheetSummary = "AEOS Module 0 Defense Worksheet. Learner build boundary, required fixtures, trace checklist, defense questions, skills matrix, and gate-request package.";
      const decision = {
        id: decisionId,
        runId,
        decisionKey,
        sequence: 1,
        gate: "REVIEW" as Gate,
        rationale: "The system artifacts prove strong architecture and governance capability, but artifact possession is not evidence of independent runtime mastery. Module 0 remains in REVIEW until Drew can reconstruct, test, and defend the critical loop without copying the reference implementation.",
        evidenceSummary: "The curriculum, reference archive checksum, 35 passing repository tests, passing Ruff checks, governed runbook, and defense worksheet establish a valid starting baseline. Personal teach-back and learner-created traces remain unverified.",
        assumptions: "The durable mastery curriculum is being used as the audit-derived source because the original literacy-audit chat transcript is not directly addressable from this console.",
        risk: "medium",
        actor,
        reviewerEmail: "",
        policyVersion,
        scope: "execution",
        nextGate: "Drew completes the Module 0 lab, records success/REVIEW/HALT traces, updates the skills matrix, and passes a critical-path teach-back.",
        previousHash: "GENESIS",
        createdAt: now,
      };
      const eventHash = await sha256(JSON.stringify(decision));
      const courseHash = await sha256(`source\n${courseUri}\n${courseSummary}`);
      const referenceHash = await sha256(`test\n${referenceUri}\n${referenceSummary}`);
      const runbookHash = await sha256(`artifact\n${runbookUri}\n${runbookSummary}`);
      const worksheetHash = await sha256(`artifact\n${worksheetUri}\n${worksheetSummary}`);

      await db.batch([
        db
          .prepare(`INSERT INTO runs (
            id, external_key, system_key, ledger_namespace, title, objective, status, current_gate,
            owner_email, agent_key, policy_version, authority_scope, data_classification,
            token_budget, tool_budget, source_ref, created_at, updated_at
          ) VALUES (?, ?, 'aeos', 'mirdexx.shared', ?, ?, 'review', 'REVIEW', ?, 'vin-codex', ?, 'read-only', 'internal', 50000, 12, ?, ?, ?)`)
          .bind(
            runId,
            externalKey,
            "AI Literacy Advancement — Module 0",
            "Prove independent command of the governed agent control loop by explaining, rebuilding, failure-testing, tracing, and defending one bounded read-only agent before advancing to Module 1.",
            actor,
            policyVersion,
            courseUri,
            now,
            now,
          ),
        db
          .prepare(`INSERT INTO decisions (
            id, run_id, decision_key, sequence, gate, rationale, evidence_summary, assumptions,
            risk, actor_email, reviewer_email, policy_version, scope, next_gate,
            previous_hash, event_hash, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .bind(
            decision.id,
            runId,
            decision.decisionKey,
            decision.sequence,
            decision.gate,
            decision.rationale,
            decision.evidenceSummary,
            decision.assumptions,
            decision.risk,
            actor,
            decision.reviewerEmail,
            policyVersion,
            decision.scope,
            decision.nextGate,
            decision.previousHash,
            eventHash,
            now,
          ),
        db
          .prepare(`INSERT INTO evidence_records (
            id, run_id, decision_id, evidence_key, kind, uri, summary, content_hash,
            source_authority, freshness, actor_email, created_at
          ) VALUES (?, ?, ?, ?, 'source', ?, ?, ?, 'canonical-curriculum', 'verified-2026-07-21', ?, ?)`)
          .bind(courseEvidenceId, runId, decisionId, courseEvidenceKey, courseUri, courseSummary, courseHash, actor, now),
        db
          .prepare(`INSERT INTO evidence_records (
            id, run_id, decision_id, evidence_key, kind, uri, summary, content_hash,
            source_authority, freshness, actor_email, created_at
          ) VALUES (?, ?, ?, ?, 'test', ?, ?, ?, 'bounded-local-verification', 'verified-2026-07-21', ?, ?)`)
          .bind(referenceEvidenceId, runId, decisionId, referenceEvidenceKey, referenceUri, referenceSummary, referenceHash, actor, now),
        db
          .prepare(`INSERT INTO evidence_records (
            id, run_id, decision_id, evidence_key, kind, uri, summary, content_hash,
            source_authority, freshness, actor_email, created_at
          ) VALUES (?, ?, ?, ?, 'artifact', ?, ?, ?, 'aeos-governing-record', 'version-1.0', ?, ?)`)
          .bind(runbookEvidenceId, runId, decisionId, runbookEvidenceKey, runbookUri, runbookSummary, runbookHash, actor, now),
        db
          .prepare(`INSERT INTO evidence_records (
            id, run_id, decision_id, evidence_key, kind, uri, summary, content_hash,
            source_authority, freshness, actor_email, created_at
          ) VALUES (?, ?, ?, ?, 'artifact', ?, ?, ?, 'aeos-execution-record', 'version-1.0', ?, ?)`)
          .bind(worksheetEvidenceId, runId, decisionId, worksheetEvidenceKey, worksheetUri, worksheetSummary, worksheetHash, actor, now),
      ]);

      return Response.json({
        run: { id: runId, external_key: externalKey, policy_version: policyVersion },
        initialized: true,
      }, { status: 201 });
    }

    if (action === "create_run") {
      const title = clean(body.title, 160);
      const objective = clean(body.objective, 2000);
      if (!title || !objective) {
        return Response.json({ error: "Run title and objective are required." }, { status: 400 });
      }

      const id = crypto.randomUUID();
      const externalKey = shortKey("MRDX-RUN");
      const now = new Date().toISOString();
      const record = {
        id,
        externalKey,
        title,
        objective,
        agentKey: clean(body.agentKey, 80) || "codex",
        policyVersion: clean(body.policyVersion, 80) || "MGEP-1.0",
        authorityScope: clean(body.authorityScope, 80) || "read-only",
        dataClassification: clean(body.dataClassification, 80) || "internal",
        tokenBudget: asPositiveInt(body.tokenBudget, 50000, 10_000_000),
        toolBudget: asPositiveInt(body.toolBudget, 12, 10000),
        sourceRef: clean(body.sourceRef, 1000),
      };

      await db
        .prepare(`INSERT INTO runs (
          id, external_key, system_key, ledger_namespace, title, objective, status, current_gate,
          owner_email, agent_key, policy_version, authority_scope, data_classification,
          token_budget, tool_budget, source_ref, created_at, updated_at
        ) VALUES (?, ?, 'mirdexx', 'mirdexx.shared', ?, ?, 'review', 'REVIEW', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`) 
        .bind(
          record.id,
          record.externalKey,
          record.title,
          record.objective,
          actor,
          record.agentKey,
          record.policyVersion,
          record.authorityScope,
          record.dataClassification,
          record.tokenBudget,
          record.toolBudget,
          record.sourceRef,
          now,
          now,
        )
        .run();

      return Response.json({ run: { ...record, ownerEmail: actor, createdAt: now } }, { status: 201 });
    }

    if (action === "record_decision") {
      const runId = clean(body.runId, 120);
      const run = await ownedRun(runId, actor);
      if (!run) return Response.json({ error: "Run not found in this workspace scope." }, { status: 404 });
      if (!isGate(body.gate)) return Response.json({ error: "Decision gate must be ALLOW, REVIEW, or HALT." }, { status: 400 });

      const rationale = clean(body.rationale, 4000);
      if (!rationale) return Response.json({ error: "Decision rationale is required." }, { status: 400 });

      const latest = await db
        .prepare("SELECT sequence, event_hash FROM decisions WHERE run_id = ? ORDER BY sequence DESC LIMIT 1")
        .bind(runId)
        .first<{ sequence: number; event_hash: string }>();
      const sequence = (latest?.sequence ?? 0) + 1;
      const previousHash = latest?.event_hash ?? "GENESIS";
      const id = crypto.randomUUID();
      const decisionKey = shortKey("MRDX-DEC");
      const now = new Date().toISOString();
      const gate = body.gate;
      const event = {
        id,
        runId,
        decisionKey,
        sequence,
        gate,
        rationale,
        evidenceSummary: clean(body.evidenceSummary, 4000),
        assumptions: clean(body.assumptions, 4000),
        risk: clean(body.risk, 40) || "medium",
        actor,
        reviewerEmail: clean(body.reviewerEmail, 320).toLowerCase(),
        policyVersion: run.policy_version,
        scope: clean(body.scope, 80) || "execution",
        nextGate: clean(body.nextGate, 500),
        previousHash,
        createdAt: now,
      };
      const eventHash = await sha256(JSON.stringify(event));
      const requestedStatus = isRunStatus(body.status) ? body.status : statusForGate(gate);
      const nextStatus: RunStatus = gate === "HALT"
        ? "blocked"
        : gate === "REVIEW"
          ? "review"
          : requestedStatus === "completed"
            ? "completed"
            : "active";
      const completedAt = nextStatus === "completed" ? now : null;

      await db.batch([
        db
          .prepare(`INSERT INTO decisions (
            id, run_id, decision_key, sequence, gate, rationale, evidence_summary, assumptions,
            risk, actor_email, reviewer_email, policy_version, scope, next_gate,
            previous_hash, event_hash, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`) 
          .bind(
            id, runId, decisionKey, sequence, gate, rationale, event.evidenceSummary,
            event.assumptions, event.risk, actor, event.reviewerEmail, event.policyVersion,
            event.scope, event.nextGate, previousHash, eventHash, now,
          ),
        db
          .prepare("UPDATE runs SET current_gate = ?, status = ?, updated_at = ?, completed_at = ? WHERE id = ? AND owner_email = ?")
          .bind(gate, nextStatus, now, completedAt, runId, actor),
      ]);

      return Response.json({ decision: { ...event, eventHash }, status: nextStatus }, { status: 201 });
    }

    if (action === "attach_evidence") {
      const runId = clean(body.runId, 120);
      const run = await ownedRun(runId, actor);
      if (!run) return Response.json({ error: "Run not found in this workspace scope." }, { status: 404 });
      const summary = clean(body.summary, 4000);
      if (!summary) return Response.json({ error: "Evidence summary is required." }, { status: 400 });

      const id = crypto.randomUUID();
      const evidenceKey = shortKey("MRDX-EVD");
      const now = new Date().toISOString();
      const uri = clean(body.uri, 1200);
      const kind = clean(body.kind, 80) || "artifact";
      const contentHash = await sha256(`${kind}\n${uri}\n${summary}`);
      const decisionId = clean(body.decisionId, 120) || null;
      if (decisionId) {
        const linkedDecision = await db
          .prepare("SELECT id FROM decisions WHERE id = ? AND run_id = ? LIMIT 1")
          .bind(decisionId, runId)
          .first<{ id: string }>();
        if (!linkedDecision) {
          return Response.json({ error: "Evidence decision link is outside this run." }, { status: 400 });
        }
      }

      await db
        .prepare(`INSERT INTO evidence_records (
          id, run_id, decision_id, evidence_key, kind, uri, summary, content_hash,
          source_authority, freshness, actor_email, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`) 
        .bind(
          id,
          runId,
          decisionId,
          evidenceKey,
          kind,
          uri,
          summary,
          contentHash,
          clean(body.sourceAuthority, 120) || "workspace",
          clean(body.freshness, 120) || "current-run",
          actor,
          now,
        )
        .run();

      return Response.json({ evidence: { id, evidenceKey, contentHash, createdAt: now } }, { status: 201 });
    }

    return Response.json({ error: "Unknown operations action." }, { status: 400 });
  } catch (error) {
    return errorResponse(error);
  }
}
