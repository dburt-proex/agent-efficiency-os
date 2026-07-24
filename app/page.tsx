"use client";

import { useMemo, useState } from "react";
import OperationsConsole from "./operations-console";

const operatingSteps = [
  {
    id: "01",
    title: "Frame",
    copy: "Lock the outcome, authority, constraints, evidence standard, and definition of done before work begins.",
    output: "Bounded execution contract",
  },
  {
    id: "02",
    title: "Discover",
    copy: "Load only the tools and source context required for the current job. Keep the rest available on demand.",
    output: "Minimal working context",
  },
  {
    id: "03",
    title: "Build",
    copy: "Complete the artifact in one coherent pass whenever risk and scope allow. Persist decisions in the artifact.",
    output: "Usable artifact",
  },
  {
    id: "04",
    title: "Verify",
    copy: "Run deterministic checks, scenario evals, and policy gates in proportion to the impact of the work.",
    output: "Test evidence",
  },
  {
    id: "05",
    title: "Record",
    copy: "Attach sources, assumptions, decisions, approvals, and recovery instructions so the run can be audited.",
    output: "Evidence trail",
  },
];

const efficiencyTactics = [
  {
    code: "T-01",
    title: "Defer tool definitions",
    rule: "Keep high-frequency tools loaded. Discover the rest only when the job requires them.",
    use: "Best when 10+ tools or tool schemas exceed roughly 10k tokens.",
  },
  {
    code: "T-02",
    title: "Cache stable prefixes",
    rule: "Place durable instructions, examples, and tool contracts before volatile run data.",
    use: "Reduces repeat processing cost and latency; it does not make poor context useful.",
  },
  {
    code: "T-03",
    title: "Externalize recoverable state",
    rule: "Store events, decisions, and artifacts outside the active context, then retrieve precise slices.",
    use: "Preserves auditability while keeping the model’s working set small.",
  },
  {
    code: "T-04",
    title: "Route depth by risk",
    rule: "Use the least expensive model and reasoning depth that meets the evidence and risk requirement.",
    use: "Escalate only on uncertainty, material impact, or failed verification.",
  },
  {
    code: "T-05",
    title: "Parallelize reads, serialize writes",
    rule: "Run independent retrieval and inspection together. Order state-changing actions behind a gate.",
    use: "Cuts latency without creating write conflicts or approval ambiguity.",
  },
  {
    code: "T-06",
    title: "Compute before narrating",
    rule: "Use code, queries, or deterministic transforms for aggregation; send the model the result.",
    use: "Fewer tokens, fewer arithmetic errors, and clearer evidence.",
  },
];

const artifactContract = [
  ["Outcome", "The exact artifact and decision the run must produce"],
  ["Authority", "Allowed tools, sources, writes, and approval boundaries"],
  ["Inputs", "Canonical files, records, constraints, and freshness rules"],
  ["Acceptance", "Tests, evidence, and observable definition of done"],
  ["Delivery", "Usable file, site, patch, record, or decision—not a tutorial"],
  ["Recovery", "Failure state, rollback path, and unresolved next gate"],
];

const trendSignals = [
  {
    date: "MAR 2025",
    title: "Agent platforms unify tools with observability",
    copy: "Built-in search, file retrieval, computer use, orchestration, tracing, and evaluations are consolidating into integrated agent development surfaces.",
    href: "https://openai.com/index/new-tools-for-building-agents/",
    source: "OpenAI",
  },
  {
    date: "SEP 2025",
    title: "Context engineering replaces prompt accumulation",
    copy: "Teams are optimizing the entire inference state—tools, memory, history, and retrieved data—not merely rewriting the system prompt.",
    href: "https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents",
    source: "Anthropic",
  },
  {
    date: "NOV 2025",
    title: "Tool libraries become searchable",
    copy: "Deferred tool discovery reduces schema load and can improve selection accuracy when an agent has access to many servers and actions.",
    href: "https://www.anthropic.com/engineering/advanced-tool-use",
    source: "Anthropic",
  },
  {
    date: "NOV 2025",
    title: "MCP hardens authorization and long-running work",
    copy: "The protocol added task-oriented workflows while reinforcing consent, audience-bound tokens, access control, and tool-safety requirements.",
    href: "https://modelcontextprotocol.io/specification/2025-11-25",
    source: "MCP specification",
  },
  {
    date: "DEC 2025",
    title: "Least agency becomes a security control",
    copy: "Agentic security guidance now treats unnecessary autonomy, over-scoped tools, inherited identity, poisoned memory, and cascading failure as first-class risks.",
    href: "https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/",
    source: "OWASP",
  },
  {
    date: "JAN 2026",
    title: "Evals grade trajectories, not only answers",
    copy: "Multi-turn agents require environment checks, tool-path inspection, state validation, and graders that reflect real completion evidence.",
    href: "https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents",
    source: "Anthropic",
  },
  {
    date: "APR 2026",
    title: "Durable sessions decouple context from execution",
    copy: "Recoverable event history can live outside the context window while a harness curates only the state needed for the next decision.",
    href: "https://www.anthropic.com/engineering/managed-agents",
    source: "Anthropic",
  },
  {
    date: "JUL 2026",
    title: "Agentic retrieval plans and fans out queries",
    copy: "Production RAG is moving toward query decomposition, parallel hybrid retrieval, reranking, access-aware sources, and retained citations.",
    href: "https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview",
    source: "Microsoft Learn",
  },
];

const orchestrationControls = [
  ["Intent capsule", "Bind goal, constraints, user authority, and active policy to the run."],
  ["Least agency", "Grant the narrowest tool, data, rate, duration, and delegation scope."],
  ["Pre-execution gate", "Validate planned action, arguments, recipient, and impact before execution."],
  ["Budgets + depth", "Cap tokens, cost, tool calls, retries, time, and handoff depth."],
  ["Immutable trace", "Record goal state, tool inputs, decisions, approvals, outputs, and hashes."],
  ["Kill + recover", "Stop on drift, preserve state, revoke credentials, and route to a named owner."],
];

const ragPipeline = [
  "Ingest",
  "Parse",
  "Normalize",
  "Chunk",
  "Enrich",
  "Embed",
  "Retrieve",
  "Rerank",
  "Ground",
  "Evaluate",
];

const releaseTests = [
  { id: "schema", label: "Tool and output schemas validate", critical: true },
  { id: "permissions", label: "Forbidden-action cases halt", critical: true },
  { id: "retrieval", label: "Retrieval set meets target quality", critical: false },
  { id: "trajectory", label: "End-to-end task reaches valid state", critical: false },
  { id: "adversarial", label: "Injection and poisoning cases contained", critical: true },
  { id: "replay", label: "Trace can be replayed and explained", critical: false },
];

function formatTokens(value: number) {
  return value >= 1000 ? `${Math.round(value / 100) / 10}k` : `${value}`;
}

export default function Home() {
  const [turns, setTurns] = useState(6);
  const [stableContext, setStableContext] = useState(12000);
  const [fullToolSchemas, setFullToolSchemas] = useState(30000);
  const [activeToolSchemas, setActiveToolSchemas] = useState(4000);
  const [siteGoal, setSiteGoal] = useState("governed research hub");
  const [sourceMode, setSourceMode] = useState("authoritative sources only");
  const [actionMode, setActionMode] = useState("read-only tools");
  const [copyState, setCopyState] = useState("Copy directive");
  const [writeAuthority, setWriteAuthority] = useState("none");
  const [dataClass, setDataClass] = useState("public");
  const [confidence, setConfidence] = useState("high");
  const [checkedTests, setCheckedTests] = useState<Set<string>>(
    () => new Set(["schema", "permissions", "retrieval"]),
  );

  const model = useMemo(() => {
    const baseline = turns * (stableContext + fullToolSchemas);
    const carriedState = stableContext * 0.25;
    const optimized =
      stableContext +
      activeToolSchemas +
      Math.max(0, turns - 1) * (carriedState + activeToolSchemas);
    const avoided = Math.max(0, baseline - optimized);
    const percent = baseline ? Math.round((avoided / baseline) * 100) : 0;
    return { baseline, optimized, avoided, percent };
  }, [activeToolSchemas, fullToolSchemas, stableContext, turns]);

  const siteDirective = `Use @Sites to build a ${siteGoal}. Use ${sourceMode}. Permission boundary: ${actionMode}. Complete the artifact in one bounded build: inspect the available context, call only the necessary tools, preserve citations and decisions, validate the primary interactions, and return the finished Site plus verification evidence. Do not claim that deployed runtime actions exist unless they have an explicit backend, authentication, and approval path.`;

  const orchestrationGate = useMemo(() => {
    if (
      (writeAuthority === "external" && dataClass === "sensitive") ||
      (writeAuthority === "external" && confidence === "low")
    ) {
      return {
        gate: "HALT",
        reason: "High-impact authority is paired with sensitive data or low confidence.",
      };
    }
    if (
      writeAuthority === "external" ||
      dataClass === "sensitive" ||
      confidence === "low" ||
      (writeAuthority === "reversible" && dataClass === "internal")
    ) {
      return {
        gate: "REVIEW",
        reason: "A human must confirm scope, recipient, evidence, or rollback before execution.",
      };
    }
    return {
      gate: "ALLOW",
      reason: "Authority is bounded, impact is reversible or read-only, and confidence is sufficient.",
    };
  }, [confidence, dataClass, writeAuthority]);

  const releaseGate = useMemo(() => {
    const missingCritical = releaseTests.some(
      (test) => test.critical && !checkedTests.has(test.id),
    );
    if (missingCritical) {
      return { gate: "HALT", note: "A critical safety or contract test is missing." };
    }
    if (checkedTests.size < releaseTests.length) {
      return { gate: "REVIEW", note: "Critical controls pass; completion evidence is still partial." };
    }
    return { gate: "ALLOW", note: "All release evidence is present for this bounded test set." };
  }, [checkedTests]);

  async function copyDirective() {
    try {
      await navigator.clipboard.writeText(siteDirective);
      setCopyState("Copied");
      window.setTimeout(() => setCopyState("Copy directive"), 1800);
    } catch {
      setCopyState("Select + copy");
    }
  }

  function toggleTest(id: string) {
    setCheckedTests((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <main id="top">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="Agent Efficiency OS home">
          <span className="wordmark-mark" aria-hidden="true">
            +
          </span>
          <span>Agent Efficiency OS</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#operations">Console</a>
          <span aria-hidden="true">•</span>
          <a href="#operating-model">Operating Model</a>
          <span aria-hidden="true">•</span>
          <a href="#diagnostic">Diagnostic</a>
          <span aria-hidden="true">•</span>
          <a href="#tooling">Tooling</a>
          <span aria-hidden="true">•</span>
          <a href="#orchestration">Orchestration</a>
          <span aria-hidden="true">•</span>
          <a href="#rag">RAG</a>
          <span aria-hidden="true">•</span>
          <a href="#tests">Tests</a>
        </nav>
        <span className="header-status">
          <i aria-hidden="true" /> system online
        </span>
      </header>

      <div id="main-content">
        <section className="hero shell" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">Field guide · updated July 2026</p>
            <h1 id="hero-title">
              Govern the run.
              <span>Preserve the decision.</span>
            </h1>
            <p className="hero-deck">
              A governed operating system for token-efficient tool use,
              complete artifact delivery, controlled agent orchestration,
              retrieval, and test evidence.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#operations">
                Open the operations console <span aria-hidden="true">→</span>
              </a>
              <a className="button button-secondary" href="#operating-model">
                Explore the operating model <span aria-hidden="true">→</span>
              </a>
            </div>
            <p className="proof-line">
              <span aria-hidden="true">[ + ]</span> 1 artifact <i>•</i> 1 bounded
              run <i>•</i> evidence attached.
            </p>
          </div>

          <div className="hero-console" aria-label="Governed execution flow">
            <div className="console-corners" aria-hidden="true">
              <span>+</span><span>+</span><span>+</span><span>+</span>
            </div>
            <div className="console-label">
              <span>RUN / 001</span>
              <span>POLICY / EFF-V1</span>
            </div>
            <ol className="flow-list">
              <li>
                <span className="flow-icon">+</span>
                <span className="flow-rule" />
                <strong>Intent</strong>
                <small>bounded</small>
              </li>
              <li>
                <span className="flow-icon">↔</span>
                <span className="flow-rule" />
                <strong>Route</strong>
                <small>least tool</small>
              </li>
              <li>
                <span className="flow-icon">≡</span>
                <span className="flow-rule" />
                <strong>Evidence</strong>
                <small>attached</small>
              </li>
              <li className="is-allow">
                <span className="flow-icon">✓</span>
                <span className="flow-rule" />
                <strong>Allow</strong>
                <small>verified</small>
              </li>
            </ol>
            <div className="context-meter">
              <span className="meter-bars" aria-hidden="true">
                <i /><i /><i /><i /><i /><i /><i /><i />
              </span>
              <strong>CURATED CONTEXT</strong>
            </div>
          </div>
        </section>

        <OperationsConsole />

        <section className="diagnostic section shell" id="diagnostic" aria-labelledby="diagnostic-title">
          <div className="section-heading">
            <p className="section-index">01 / Efficiency diagnostic</p>
            <h2 id="diagnostic-title">Measure the context you can stop loading.</h2>
            <p>
              Model the effect of deferred tool discovery, bounded runs, and
              compacted working state. This is a directional context-load model,
              not a provider billing estimate.
            </p>
          </div>

          <div className="diagnostic-grid">
            <form className="diagnostic-controls">
              <label>
                <span>Average turns per deliverable</span>
                <output>{turns}</output>
                <input
                  type="range"
                  min="2"
                  max="12"
                  value={turns}
                  onChange={(event) => setTurns(Number(event.target.value))}
                />
              </label>
              <label>
                <span>Stable instructions + reference</span>
                <output>{formatTokens(stableContext)}</output>
                <input
                  type="range"
                  min="2000"
                  max="30000"
                  step="1000"
                  value={stableContext}
                  onChange={(event) => setStableContext(Number(event.target.value))}
                />
              </label>
              <label>
                <span>All available tool schemas</span>
                <output>{formatTokens(fullToolSchemas)}</output>
                <input
                  type="range"
                  min="5000"
                  max="80000"
                  step="1000"
                  value={fullToolSchemas}
                  onChange={(event) => setFullToolSchemas(Number(event.target.value))}
                />
              </label>
              <label>
                <span>Tools required for this job</span>
                <output>{formatTokens(activeToolSchemas)}</output>
                <input
                  type="range"
                  min="1000"
                  max="15000"
                  step="500"
                  value={activeToolSchemas}
                  onChange={(event) => setActiveToolSchemas(Number(event.target.value))}
                />
              </label>
            </form>

            <div className="diagnostic-result" aria-live="polite">
              <p>Modeled context avoided</p>
              <strong>{model.percent}%</strong>
              <div className="result-bar" aria-hidden="true">
                <span style={{ width: `${model.percent}%` }} />
              </div>
              <dl>
                <div>
                  <dt>Naive load</dt>
                  <dd>{formatTokens(model.baseline)} tokens</dd>
                </div>
                <div>
                  <dt>Curated load</dt>
                  <dd>{formatTokens(model.optimized)} tokens</dd>
                </div>
                <div>
                  <dt>Avoidable load</dt>
                  <dd>{formatTokens(model.avoided)} tokens</dd>
                </div>
              </dl>
              <p className="result-note">
                Assumes 25% of stable context is carried forward as working
                state after the first turn. Measure your own traces before
                setting a production target.
              </p>
            </div>
          </div>
        </section>

        <section className="operating-model section shell" id="operating-model" aria-labelledby="model-title">
          <div className="section-heading compact">
            <p className="section-index">02 / Operating model</p>
            <h2 id="model-title">One bounded loop. Five durable outputs.</h2>
          </div>
          <div className="step-grid">
            {operatingSteps.map((step) => (
              <article key={step.id}>
                <span>{step.id}</span>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
                <strong>{step.output}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className="tooling section shell" id="tooling" aria-labelledby="tooling-title">
          <div className="section-heading">
            <p className="section-index">03 / Token-efficient tooling</p>
            <h2 id="tooling-title">Spend context where it changes the decision.</h2>
            <p>
              Token efficiency is not terse output. It is the deliberate control
              of instructions, tools, state, retrieval, and reasoning depth so
              every loaded token has a job.
            </p>
          </div>

          <div className="tactic-grid">
            {efficiencyTactics.map((tactic) => (
              <article key={tactic.code}>
                <span>{tactic.code}</span>
                <h3>{tactic.title}</h3>
                <p>{tactic.rule}</p>
                <small>{tactic.use}</small>
              </article>
            ))}
          </div>

          <div className="triage-panel">
            <div>
              <span>01</span>
              <h3>Cache</h3>
              <p>Stable instructions, examples, policy text, common schemas.</p>
              <strong>Same prefix · repeated use</strong>
            </div>
            <div>
              <span>02</span>
              <h3>Retrieve</h3>
              <p>Source passages, prior decisions, current records, run evidence.</p>
              <strong>Large corpus · selective relevance</strong>
            </div>
            <div>
              <span>03</span>
              <h3>Compute</h3>
              <p>Counts, joins, scoring, transforms, validation, and comparisons.</p>
              <strong>Deterministic operation · exact result</strong>
            </div>
            <div>
              <span>04</span>
              <h3>Reason</h3>
              <p>Ambiguous trade-offs, synthesis, policy interpretation, decisions.</p>
              <strong>Judgment required · evidence supplied</strong>
            </div>
          </div>

          <div className="artifact-build" aria-labelledby="artifact-title">
            <div className="artifact-copy">
              <p className="mini-label">Complete-artifact protocol</p>
              <h3 id="artifact-title">Replace conversational steps with an execution contract.</h3>
              <p>
                Ask for the finished build, its verification, and its remaining
                gate in one request. Use multiple turns only when approval,
                missing authority, or a material design decision genuinely blocks
                safe progress.
              </p>
              <blockquote>
                “Complete the maximum safe scope now. Return the finished
                artifact, validation evidence, assumptions, and the exact next
                gate—without turning implementation into a tutorial.”
              </blockquote>
            </div>
            <dl className="contract-list">
              {artifactContract.map(([term, definition]) => (
                <div key={term}>
                  <dt>{term}</dt>
                  <dd>{definition}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="sites-surface" aria-labelledby="sites-title">
            <div className="sites-copy">
              <p className="mini-label">Sites as an execution surface</p>
              <h3 id="sites-title">Use the build request to orchestrate tools. Keep runtime authority explicit.</h3>
              <p>
                During development, a Sites request can direct ChatGPT to call
                connected tools for research, retrieval, inspection, and
                publishing. A deployed Site does not automatically inherit those
                tools. Runtime actions require an explicit backend, authentication,
                scoped permissions, and approval design.
              </p>
              <ul>
                <li><strong>Development:</strong> call tools through the Sites build request.</li>
                <li><strong>Runtime:</strong> expose only declared APIs and governed actions.</li>
                <li><strong>Audit:</strong> preserve sources, tool results, decisions, and versions.</li>
              </ul>
            </div>

            <div className="directive-builder">
              <div className="builder-head">
                <span>BUILD DIRECTIVE / COMPOSER</span>
                <i aria-hidden="true">● ready</i>
              </div>
              <label>
                <span>Site outcome</span>
                <select value={siteGoal} onChange={(event) => setSiteGoal(event.target.value)}>
                  <option value="governed research hub">Governed research hub</option>
                  <option value="decision and evidence portal">Decision + evidence portal</option>
                  <option value="operational playbook">Operational playbook</option>
                  <option value="source-backed public knowledge site">Public knowledge site</option>
                </select>
              </label>
              <label>
                <span>Source policy</span>
                <select value={sourceMode} onChange={(event) => setSourceMode(event.target.value)}>
                  <option value="authoritative sources only">Authoritative sources only</option>
                  <option value="the user-supplied source of truth">User source of truth</option>
                  <option value="mixed sources with visible citations">Mixed + cited sources</option>
                </select>
              </label>
              <label>
                <span>Action boundary</span>
                <select value={actionMode} onChange={(event) => setActionMode(event.target.value)}>
                  <option value="read-only tools">Read-only tools</option>
                  <option value="reversible writes with recorded evidence">Reversible writes</option>
                  <option value="writes only after explicit human approval">Approval-gated writes</option>
                </select>
              </label>
              <div className="directive-output">
                <p>{siteDirective}</p>
              </div>
              <button type="button" className="button button-primary" onClick={copyDirective}>
                {copyState} <span aria-hidden="true">↗</span>
              </button>
              <small>This composer creates a request; it does not invoke tools from the deployed Site.</small>
            </div>
          </div>
        </section>

        <section className="trends section shell" id="trends" aria-labelledby="trends-title">
          <div className="section-heading">
            <p className="section-index">04 / Current signal</p>
            <h2 id="trends-title">The 2026 operating edge.</h2>
            <p>
              Current practices are converging on smaller working context,
              stronger harnesses, standardized tool interfaces, explicit
              authorization, trace-level evaluation, and retrieval with provenance.
            </p>
          </div>
          <div className="trend-grid">
            {trendSignals.map((signal) => (
              <article key={`${signal.date}-${signal.title}`}>
                <span>{signal.date}</span>
                <h3>{signal.title}</h3>
                <p>{signal.copy}</p>
                <a href={signal.href} target="_blank" rel="noreferrer">
                  Primary source · {signal.source} <span aria-hidden="true">↗</span>
                </a>
              </article>
            ))}
          </div>
        </section>

        <section className="orchestration section shell" id="orchestration" aria-labelledby="orchestration-title">
          <div className="section-heading">
            <p className="section-index">05 / Governed orchestration</p>
            <h2 id="orchestration-title">Control the action chain, not only the model.</h2>
            <p>
              Every handoff can multiply ambiguity, privilege, cost, and failure.
              Govern intent, identity, tools, state transitions, and evidence at
              each boundary.
            </p>
          </div>

          <div className="gate-lab">
            <div className="gate-controls">
              <p className="mini-label">Scenario router</p>
              <label>
                <span>Write authority</span>
                <select value={writeAuthority} onChange={(event) => setWriteAuthority(event.target.value)}>
                  <option value="none">None / read-only</option>
                  <option value="reversible">Bounded + reversible</option>
                  <option value="external">External or irreversible</option>
                </select>
              </label>
              <label>
                <span>Data classification</span>
                <select value={dataClass} onChange={(event) => setDataClass(event.target.value)}>
                  <option value="public">Public</option>
                  <option value="internal">Internal</option>
                  <option value="sensitive">Sensitive / regulated</option>
                </select>
              </label>
              <label>
                <span>Decision confidence</span>
                <select value={confidence} onChange={(event) => setConfidence(event.target.value)}>
                  <option value="high">High + evidenced</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low / conflicting</option>
                </select>
              </label>
            </div>
            <div className={`gate-result gate-${orchestrationGate.gate.toLowerCase()}`} aria-live="polite">
              <span>ROUTE DECISION</span>
              <strong>{orchestrationGate.gate}</strong>
              <p>{orchestrationGate.reason}</p>
              <dl>
                <div><dt>Intent</dt><dd>validated</dd></div>
                <div><dt>Authority</dt><dd>{writeAuthority}</dd></div>
                <div><dt>Data</dt><dd>{dataClass}</dd></div>
                <div><dt>Confidence</dt><dd>{confidence}</dd></div>
              </dl>
            </div>
          </div>

          <div className="control-grid">
            {orchestrationControls.map(([title, copy], index) => (
              <article key={title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>

          <div className="risk-strip">
            <div>
              <p className="mini-label">2026 threat baseline</p>
              <h3>Test the boundaries OWASP says agents are crossing.</h3>
            </div>
            <p>
              Goal hijack · tool misuse · identity abuse · supply-chain risk ·
              unexpected code execution · memory poisoning · insecure inter-agent
              communication · cascading failure · trust exploitation · rogue agents.
            </p>
            <a href="https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/" target="_blank" rel="noreferrer">
              OWASP Agentic Top 10 <span aria-hidden="true">↗</span>
            </a>
          </div>
        </section>

        <section className="rag section shell" id="rag" aria-labelledby="rag-title">
          <div className="section-heading">
            <p className="section-index">06 / Vector database + RAG</p>
            <h2 id="rag-title">Retrieve evidence. Do not dump a corpus.</h2>
            <p>
              A vector database is an index, not a truth engine. Quality comes
              from corpus governance, hybrid retrieval, metadata, access control,
              reranking, citations, and evaluation.
            </p>
          </div>

          <div className="rag-pipeline" aria-label="Production RAG pipeline">
            {ragPipeline.map((step, index) => (
              <div key={step}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{step}</strong>
              </div>
            ))}
          </div>

          <div className="rag-decision">
            <article>
              <span>USE RAG</span>
              <h3>Private or changing knowledge</h3>
              <p>Large unstructured corpus, question-time evidence, provenance required.</p>
            </article>
            <article>
              <span>USE LONG CONTEXT</span>
              <h3>Small bounded source set</h3>
              <p>A few documents fit comfortably and must be reasoned over together.</p>
            </article>
            <article>
              <span>USE SQL / GRAPH</span>
              <h3>Exact structured relationships</h3>
              <p>Counts, joins, filters, permissions, and entity relationships must be exact.</p>
            </article>
            <article>
              <span>USE FINE-TUNING</span>
              <h3>Stable behavior or format</h3>
              <p>Teach recurring style or task behavior; do not use it as a freshness layer.</p>
            </article>
          </div>

          <div className="rag-spec">
            <div>
              <p className="mini-label">Minimum viable retrieval contract</p>
              <h3>What every indexed chunk must carry.</h3>
            </div>
            <dl>
              <div><dt>Identity</dt><dd>source_id · document_id · chunk_id · content hash</dd></div>
              <div><dt>Authority</dt><dd>owner · source class · ACL · permitted audience</dd></div>
              <div><dt>Freshness</dt><dd>version · updated_at · effective_from · expires_at</dd></div>
              <div><dt>Structure</dt><dd>title · section · page · parent-child relationship</dd></div>
              <div><dt>Retrieval</dt><dd>embedding version · keywords · language · content type</dd></div>
            </dl>
          </div>

          <div className="rag-practices">
            <article>
              <span>01</span>
              <h3>Chunk on meaning</h3>
              <p>Start with semantic sections. Tune size and overlap against a representative query set instead of copying a universal token number.</p>
            </article>
            <article>
              <span>02</span>
              <h3>Retrieve hybrid</h3>
              <p>Combine lexical and vector recall, apply metadata and ACL filters, then rerank before context assembly.</p>
            </article>
            <article>
              <span>03</span>
              <h3>Ground with provenance</h3>
              <p>Return citations and source versions. Refuse or qualify when evidence is missing, stale, or contradictory.</p>
            </article>
            <article>
              <span>04</span>
              <h3>Evaluate retrieval separately</h3>
              <p>Measure recall@k, ranking quality, citation correctness, answer faithfulness, latency, and access-control leakage.</p>
            </article>
          </div>

          <a className="source-callout" href="https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview" target="_blank" rel="noreferrer">
            Production guidance: hybrid search, semantic reranking, query planning, access-aware sources, and citation tracking · Microsoft Learn <span aria-hidden="true">↗</span>
          </a>
        </section>

        <section className="tests section shell" id="tests" aria-labelledby="tests-title">
          <div className="section-heading">
            <p className="section-index">07 / Test development</p>
            <h2 id="tests-title">Ship against evidence, not a good demo.</h2>
            <p>
              Agent testing combines deterministic software checks with
              multi-turn task evaluation, safety cases, trace inspection, and
              production canaries.
            </p>
          </div>

          <div className="test-ladder">
            <article><span>01</span><h3>Unit</h3><p>Parsers, schemas, routing rules, scoring, permissions.</p></article>
            <article><span>02</span><h3>Contract</h3><p>Tool inputs, outputs, error behavior, authorization, retries.</p></article>
            <article><span>03</span><h3>Retrieval</h3><p>Recall, ranking, filters, citations, freshness, ACL leakage.</p></article>
            <article><span>04</span><h3>Trajectory</h3><p>Tool path, intermediate state, completion, side effects, cost.</p></article>
            <article><span>05</span><h3>Adversarial</h3><p>Injection, poisoning, privilege escalation, loops, collusion.</p></article>
            <article><span>06</span><h3>Canary</h3><p>Shadow traffic, drift thresholds, rollback, replay, owner alert.</p></article>
          </div>

          <div className="release-lab">
            <div className="release-checks">
              <p className="mini-label">Interactive release evidence</p>
              {releaseTests.map((test) => (
                <label key={test.id}>
                  <input
                    type="checkbox"
                    checked={checkedTests.has(test.id)}
                    onChange={() => toggleTest(test.id)}
                  />
                  <span>{test.label}</span>
                  {test.critical && <strong>critical</strong>}
                </label>
              ))}
            </div>
            <div className={`release-result gate-${releaseGate.gate.toLowerCase()}`} aria-live="polite">
              <span>RELEASE GATE</span>
              <strong>{releaseGate.gate}</strong>
              <p>{releaseGate.note}</p>
              <div className="evidence-count">
                <i style={{ width: `${(checkedTests.size / releaseTests.length) * 100}%` }} />
              </div>
              <small>{checkedTests.size} / {releaseTests.length} evidence checks present</small>
            </div>
          </div>

          <div className="test-rules">
            <article>
              <h3>Build the eval before the feature is “done.”</h3>
              <p>Freeze representative success, boundary, and failure cases. Version the set with the policy and tool contracts it tests.</p>
            </article>
            <article>
              <h3>Grade the environment after the run.</h3>
              <p>Verify records, files, permissions, recipients, and state changes—not only the natural-language response.</p>
            </article>
            <article>
              <h3>Retain the full trace for diagnosis.</h3>
              <p>Store tool calls, errors, approvals, timing, cost, model version, and evidence so regressions can be reproduced.</p>
            </article>
          </div>

          <a className="source-callout" href="https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents" target="_blank" rel="noreferrer">
            Current guidance: multi-turn agents need task, environment, and trajectory-aware evaluation · Anthropic <span aria-hidden="true">↗</span>
          </a>
        </section>

        <section className="governance-standard shell" aria-labelledby="standard-title">
          <div>
            <p className="mini-label">Governance standard</p>
            <h2 id="standard-title">Govern · Map · Measure · Manage</h2>
          </div>
          <p>
            Apply controls in proportion to intent, authority, evidence,
            reversibility, data sensitivity, and external impact. Keep policy,
            evaluation, approval, and audit records tied to the system version.
          </p>
          <a href="https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence" target="_blank" rel="noreferrer">
            NIST AI 600-1 <span aria-hidden="true">↗</span>
          </a>
        </section>

        <footer className="site-footer shell">
          <div>
            <span className="wordmark-mark" aria-hidden="true">+</span>
            <strong>Agent Efficiency OS</strong>
          </div>
          <p>Field guide · source-backed through July 20, 2026</p>
          <nav aria-label="Footer links">
            <a href="#top">Top</a>
            <a href="#operations">Console</a>
            <a href="#tooling">Tooling</a>
            <a href="#orchestration">Governance</a>
            <a href="#rag">RAG</a>
            <a href="#tests">Tests</a>
          </nav>
        </footer>
      </div>
    </main>
  );
}
