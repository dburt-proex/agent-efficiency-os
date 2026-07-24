"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Gate = "ALLOW" | "REVIEW" | "HALT";
type Run = {
  id: string;
  external_key: string;
  system_key: string;
  ledger_namespace: string;
  title: string;
  objective: string;
  status: string;
  current_gate: Gate;
  agent_key: string;
  policy_version: string;
  authority_scope: string;
  data_classification: string;
  token_budget: number;
  tool_budget: number;
  source_ref: string;
  created_at: string;
  updated_at: string;
};

type Decision = {
  id: string;
  decision_key: string;
  sequence: number;
  gate: Gate;
  rationale: string;
  evidence_summary: string;
  assumptions: string;
  risk: string;
  scope: string;
  next_gate: string;
  previous_hash: string;
  event_hash: string;
  created_at: string;
};

type Evidence = {
  id: string;
  evidence_key: string;
  kind: string;
  uri: string;
  summary: string;
  content_hash: string;
  source_authority: string;
  freshness: string;
  created_at: string;
};

type ConsoleData = {
  actor: string;
  runs: Run[];
  selectedRunId: string;
  decisions: Decision[];
  evidence: Evidence[];
  metrics: {
    totalRuns: number;
    activeRuns: number;
    blockedRuns: number;
    recordedDecisions: number;
  };
};

const protocolGates = [
  { code: "G-01", title: "Execution protocol", copy: "Frame outcome, authority, budget, owner, and definition of done.", href: "#operating-model" },
  { code: "G-02", title: "Directive generator", copy: "Compile the bounded artifact instruction and permission boundary.", href: "#tooling" },
  { code: "G-03", title: "RAG architecture gate", copy: "Choose RAG, long context, SQL/graph, or behavior tuning from evidence needs.", href: "#rag" },
  { code: "G-04", title: "Orchestration router", copy: "Route authority and uncertainty through ALLOW, REVIEW, or HALT.", href: "#orchestration" },
  { code: "G-05", title: "Release checklist", copy: "Require critical contracts, safety cases, trajectory evidence, and replay.", href: "#tests" },
];

const literacyPolicy = "AEOS-LIT-1.0";

function compactHash(hash: string) {
  if (!hash || hash === "GENESIS") return hash || "—";
  return `${hash.slice(0, 10)}…${hash.slice(-8)}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function actorLabel(email: string) {
  if (email === "preview@local") return "LOCAL PREVIEW";
  return email.split("@")[0]?.toUpperCase() || "WORKSPACE OWNER";
}

export default function OperationsConsole() {
  const [data, setData] = useState<ConsoleData | null>(null);
  const [selectedRunId, setSelectedRunId] = useState("");
  const [mode, setMode] = useState<"decision" | "evidence">("decision");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("Connecting to the governed ledger…");

  const loadConsole = useCallback(async (runId = "") => {
    try {
      const query = runId ? `?run_id=${encodeURIComponent(runId)}` : "";
      const response = await fetch(`/api/operations${query}`, { cache: "no-store" });
      const payload = (await response.json()) as ConsoleData & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Unable to read the operations ledger.");
      setData(payload);
      setSelectedRunId(payload.selectedRunId);
      setNotice(payload.runs.length ? "Ledger synchronized." : "No runs yet. Create the first governed execution record.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to read the operations ledger.");
    }
  }, []);

  useEffect(() => {
    const pending = window.setTimeout(() => void loadConsole(), 0);
    return () => window.clearTimeout(pending);
  }, [loadConsole]);

  const selectedRun = useMemo(
    () => data?.runs.find((run) => run.id === selectedRunId) ?? null,
    [data?.runs, selectedRunId],
  );

  const masteryRun = useMemo(
    () => data?.runs.find((run) => run.policy_version === literacyPolicy) ?? null,
    [data?.runs],
  );

  async function sendAction(payload: Record<string, unknown>, success: string) {
    setBusy(true);
    setNotice("Writing an authenticated ledger event…");
    try {
      const response = await fetch("/api/operations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { error?: string; run?: { id: string } };
      if (!response.ok) throw new Error(result.error || "The ledger rejected this event.");
      const nextRunId = result.run?.id || selectedRunId;
      await loadConsole(nextRunId);
      setNotice(success);
      return true;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The ledger rejected this event.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function createRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const created = await sendAction(
      {
        action: "create_run",
        title: form.get("title"),
        objective: form.get("objective"),
        agentKey: form.get("agentKey"),
        policyVersion: form.get("policyVersion"),
        authorityScope: form.get("authorityScope"),
        dataClassification: form.get("dataClassification"),
        tokenBudget: form.get("tokenBudget"),
        toolBudget: form.get("toolBudget"),
        sourceRef: form.get("sourceRef"),
      },
      "Run opened under MGEP-1 and mapped to the shared Mirdexx ledger contract.",
    );
    if (created && formElement.isConnected) formElement.reset();
  }

  async function recordDecision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRunId) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const recorded = await sendAction(
      {
        action: "record_decision",
        runId: selectedRunId,
        gate: form.get("gate"),
        scope: form.get("scope"),
        risk: form.get("risk"),
        rationale: form.get("rationale"),
        evidenceSummary: form.get("evidenceSummary"),
        assumptions: form.get("assumptions"),
        nextGate: form.get("nextGate"),
        reviewerEmail: form.get("reviewerEmail"),
        status: form.get("status"),
      },
      "Decision committed to the hash-linked ledger.",
    );
    if (recorded && formElement.isConnected) formElement.reset();
  }

  async function attachEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRunId) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const recorded = await sendAction(
      {
        action: "attach_evidence",
        runId: selectedRunId,
        kind: form.get("kind"),
        uri: form.get("uri"),
        summary: form.get("summary"),
        sourceAuthority: form.get("sourceAuthority"),
        freshness: form.get("freshness"),
      },
      "Evidence hashed and attached to the run.",
    );
    if (recorded && formElement.isConnected) formElement.reset();
  }

  async function initializeMasteryRun() {
    if (masteryRun) {
      await chooseRun(masteryRun.id);
      setNotice("Module 0 mastery run selected.");
      return;
    }

    await sendAction(
      { action: "initialize_mastery_run" },
      "Module 0 registered with its audit evidence, REVIEW gate, and mastery conditions.",
    );
  }

  async function chooseRun(runId: string) {
    setSelectedRunId(runId);
    await loadConsole(runId);
  }

  return (
    <section className="operations section shell" id="operations" aria-labelledby="operations-title">
      <div className="operations-masthead">
        <div>
          <p className="section-index">00 / Governed operations console</p>
          <h2 id="operations-title">Mirdexx Governed Execution Protocol</h2>
          <p>
            MGEP-1 turns this Site into the control plane for bounded directives,
            RAG routing, orchestration gates, release evidence, and replayable decisions.
          </p>
        </div>
        <div className="protocol-identity">
          <span>PROTOCOL / MGEP-1.0</span>
          <strong>{data ? actorLabel(data.actor) : "AUTH CHECK"}</strong>
          <small>Owner-scoped D1 ledger · append-oriented decisions</small>
        </div>
      </div>

      <div className="protocol-router" aria-label="MGEP-1 control gates">
        {protocolGates.map((gate) => (
          <a key={gate.code} href={gate.href}>
            <span>{gate.code}</span>
            <strong>{gate.title}</strong>
            <small>{gate.copy}</small>
            <i aria-hidden="true">↘</i>
          </a>
        ))}
      </div>

      <div className="console-status" role="status" aria-live="polite">
        <span className={notice.includes("rejected") || notice.includes("Unable") || notice.includes("required") ? "status-error" : ""}>
          {busy ? "●" : "○"} {notice}
        </span>
        <span>MIRDEXX ADAPTER / CONTRACT READY · AUTOMATIC WRITEBACK NOT YET ENABLED</span>
      </div>

      <section className="mastery-control" aria-labelledby="mastery-control-title">
        <div className="mastery-control-copy">
          <p className="mini-label">ACTIVE CAPABILITY PILOT / {literacyPolicy}</p>
          <h3 id="mastery-control-title">Convert architecture fluency into independent runtime mastery.</h3>
          <p>
            The reference system exists and its baseline tests pass. The remaining proof is personal:
            reconstruct the Module 0 loop, break it safely, repair it, and defend every control without
            copying the reference implementation.
          </p>
        </div>
        <ol className="mastery-gates">
          <li><span>01</span><strong>Explain</strong><small>Draw and teach the full critical path.</small></li>
          <li><span>02</span><strong>Rebuild</strong><small>Create the smallest loop from a blank file.</small></li>
          <li><span>03</span><strong>Break + prove</strong><small>Show success, review, halt, and safe failure traces.</small></li>
        </ol>
        <div className="mastery-action">
          <span className={`run-gate gate-${(masteryRun?.current_gate ?? "REVIEW").toLowerCase()}`}>
            {masteryRun?.current_gate ?? "REVIEW"}
          </span>
          <p>
            {masteryRun
              ? `${masteryRun.external_key} · ${masteryRun.status}`
              : "Reference verified; learner evidence not yet accepted."}
          </p>
          <button type="button" className="button button-primary" onClick={() => void initializeMasteryRun()} disabled={busy}>
            {masteryRun ? "Open Module 0 run" : "Register Module 0 run"} <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>

      <div className="ops-metrics" aria-label="Operations ledger metrics">
        <article><span>Total runs</span><strong>{data?.metrics.totalRuns ?? "—"}</strong></article>
        <article><span>In motion</span><strong>{data?.metrics.activeRuns ?? "—"}</strong></article>
        <article><span>Blocked</span><strong>{data?.metrics.blockedRuns ?? "—"}</strong></article>
        <article><span>Selected-run decisions</span><strong>{data?.metrics.recordedDecisions ?? "—"}</strong></article>
      </div>

      <div className="operations-grid">
        <aside className="run-rail" aria-label="Governed runs">
          <div className="panel-heading">
            <div><span>RUN REGISTRY</span><strong>{data?.runs.length ?? 0} RECORDS</strong></div>
          </div>
          <div className="run-list">
            {data?.runs.map((run) => (
              <button
                key={run.id}
                type="button"
                className={run.id === selectedRunId ? "is-selected" : ""}
                onClick={() => void chooseRun(run.id)}
              >
                <span className={`gate-dot gate-${run.current_gate.toLowerCase()}`} />
                <span>
                  <strong>{run.title}</strong>
                  <small>{run.external_key}</small>
                </span>
                <em>{run.current_gate}</em>
              </button>
            ))}
            {!data?.runs.length && <p className="empty-records">The registry is empty. Open the first run at right.</p>}
          </div>
        </aside>

        <div className="run-workspace">
          {selectedRun ? (
            <>
              <div className="run-header">
                <div>
                  <p>{selectedRun.external_key} · {selectedRun.ledger_namespace}</p>
                  <h3>{selectedRun.title}</h3>
                  <span>{selectedRun.objective}</span>
                </div>
                <strong className={`run-gate gate-${selectedRun.current_gate.toLowerCase()}`}>{selectedRun.current_gate}</strong>
              </div>

              <dl className="run-contract">
                <div><dt>Status</dt><dd>{selectedRun.status}</dd></div>
                <div><dt>Policy</dt><dd>{selectedRun.policy_version}</dd></div>
                <div><dt>Agent route</dt><dd>{selectedRun.agent_key}</dd></div>
                <div><dt>Authority</dt><dd>{selectedRun.authority_scope}</dd></div>
                <div><dt>Data</dt><dd>{selectedRun.data_classification}</dd></div>
                <div><dt>Budgets</dt><dd>{selectedRun.token_budget.toLocaleString()} tok · {selectedRun.tool_budget} tools</dd></div>
                <div className="wide"><dt>Mirdexx ref</dt><dd>{selectedRun.source_ref || "Awaiting canonical source reference"}</dd></div>
              </dl>

              <div className="workspace-tabs" role="tablist" aria-label="Record type">
                <button type="button" role="tab" aria-selected={mode === "decision"} onClick={() => setMode("decision")}>Record decision</button>
                <button type="button" role="tab" aria-selected={mode === "evidence"} onClick={() => setMode("evidence")}>Attach evidence</button>
              </div>

              {mode === "decision" ? (
                <form key="decision-form" className="ledger-form" onSubmit={recordDecision}>
                  <label><span>Gate</span><select name="gate" defaultValue="REVIEW"><option>ALLOW</option><option>REVIEW</option><option>HALT</option></select></label>
                  <label><span>Scope</span><select name="scope" defaultValue="execution"><option value="execution">Execution</option><option value="directive">Directive</option><option value="rag">RAG architecture</option><option value="orchestration">Orchestration</option><option value="release">Release</option></select></label>
                  <label><span>Risk</span><select name="risk" defaultValue="medium"><option>low</option><option>medium</option><option>high</option><option>critical</option></select></label>
                  <label><span>Run status</span><select name="status" defaultValue="review"><option>queued</option><option>active</option><option>review</option><option>blocked</option><option>completed</option></select></label>
                  <label className="wide"><span>Rationale</span><textarea name="rationale" required placeholder="What was decided, why, and which boundary controls the outcome?" /></label>
                  <label className="wide"><span>Evidence summary</span><textarea name="evidenceSummary" placeholder="Tests, artifacts, source versions, and observed state." /></label>
                  <label><span>Assumptions</span><input name="assumptions" placeholder="Material assumptions" /></label>
                  <label><span>Next gate</span><input name="nextGate" placeholder="Owner, condition, or next checkpoint" /></label>
                  <label className="wide"><span>Reviewer</span><input name="reviewerEmail" type="email" placeholder="Optional reviewer identity" /></label>
                  <button className="button button-primary" type="submit" disabled={busy}>Commit decision <span aria-hidden="true">→</span></button>
                </form>
              ) : (
                <form key="evidence-form" className="ledger-form" onSubmit={attachEvidence}>
                  <label><span>Evidence kind</span><select name="kind" defaultValue="artifact"><option>artifact</option><option>test</option><option>trace</option><option>source</option><option>approval</option><option>release</option></select></label>
                  <label><span>Authority</span><input name="sourceAuthority" defaultValue="workspace" /></label>
                  <label><span>Freshness</span><input name="freshness" defaultValue="current-run" /></label>
                  <label><span>URI / ref</span><input name="uri" placeholder="Canonical path, URL, commit, or record ID" /></label>
                  <label className="wide"><span>Evidence summary</span><textarea name="summary" required placeholder="What this evidence proves and where its authority comes from." /></label>
                  <button className="button button-primary" type="submit" disabled={busy}>Hash + attach <span aria-hidden="true">→</span></button>
                </form>
              )}
            </>
          ) : (
            <form className="create-run-form" onSubmit={createRun}>
              <div>
                <p className="mini-label">Open a governed run</p>
                <h3>Create the first durable execution contract.</h3>
                <span>Records are owner-scoped and receive Mirdexx-compatible run, decision, evidence, policy, and source identifiers.</span>
              </div>
              <label className="wide"><span>Run title</span><input name="title" required placeholder="e.g. Release retrieval policy v2" /></label>
              <label className="wide"><span>Objective</span><textarea name="objective" required placeholder="The exact bounded outcome and definition of done." /></label>
              <label><span>Agent route</span><input name="agentKey" defaultValue="codex" /></label>
              <label><span>Policy version</span><input name="policyVersion" defaultValue="MGEP-1.0" /></label>
              <label><span>Authority</span><select name="authorityScope" defaultValue="read-only"><option>read-only</option><option>reversible-write</option><option>external-write</option></select></label>
              <label><span>Data class</span><select name="dataClassification" defaultValue="internal"><option>public</option><option>internal</option><option>sensitive</option><option>restricted</option></select></label>
              <label><span>Token budget</span><input name="tokenBudget" type="number" min="1000" defaultValue="50000" /></label>
              <label><span>Tool budget</span><input name="toolBudget" type="number" min="1" defaultValue="12" /></label>
              <label className="wide"><span>Mirdexx source ref</span><input name="sourceRef" placeholder="repo/issue/commit or shared-ledger record" /></label>
              <button className="button button-primary" type="submit" disabled={busy}>Open governed run <span aria-hidden="true">→</span></button>
            </form>
          )}
        </div>

        <aside className="ledger-rail" aria-label="Decision and evidence ledger">
          <div className="panel-heading">
            <div><span>DECISION LEDGER</span><strong>SHA-256 CHAIN</strong></div>
          </div>
          <div className="ledger-events">
            {data?.decisions.map((decision) => (
              <article key={decision.id} className={`event-${decision.gate.toLowerCase()}`}>
                <div><span>#{decision.sequence.toString().padStart(2, "0")} · {decision.scope}</span><strong>{decision.gate}</strong></div>
                <h4>{decision.decision_key}</h4>
                <p>{decision.rationale}</p>
                {decision.next_gate && <small>NEXT / {decision.next_gate}</small>}
                <code title={decision.event_hash}>{compactHash(decision.event_hash)}</code>
                <time>{formatDate(decision.created_at)}</time>
              </article>
            ))}
            {data?.evidence.map((record) => (
              <article key={record.id} className="event-evidence">
                <div><span>EVIDENCE · {record.kind}</span><strong>HASHED</strong></div>
                <h4>{record.evidence_key}</h4>
                <p>{record.summary}</p>
                <code title={record.content_hash}>{compactHash(record.content_hash)}</code>
                <time>{formatDate(record.created_at)}</time>
              </article>
            ))}
            {!data?.decisions.length && !data?.evidence.length && (
              <p className="empty-records">Select or create a run, then commit its first gate decision.</p>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
