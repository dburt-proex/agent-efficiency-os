# AEOS OpenAI Secure MCP Tunnel v0.1

## Decision

AEOS owns orchestration and tunnel lifecycle. The tunnel is transport only. Every exposed tool remains subject to an independent authorization gate, least-privilege policy, post-call verification, and decision-ledger receipt.

## Objective

Connect a private AEOS MCP gateway to supported OpenAI products without opening inbound firewall ports or publishing the MCP server.

## Trust boundary

```text
OpenAI product
  -> OpenAI-hosted tunnel endpoint
  -> outbound HTTPS session from tunnel-client
  -> private AEOS MCP gateway
  -> authorization gate: ALLOW | REVIEW | HALT
  -> bounded adapter
  -> post-call verification
  -> decision receipt
```

## v0.1 scope

Included:

- Private MCP transport scaffold.
- Explicit tool classification and approval defaults.
- Read-only canary tool as the first admissible capability.
- Configuration validation before tunnel startup.
- Separation between transport identity, tool authority, and operator approval.
- Evidence requirements for every verification run.

Not included:

- Public plugin submission.
- Autonomous repository writes.
- Secrets, credential, billing, deployment, or destructive tools.
- Cross-project adapters for CASA, DiffWall, PromptBP, Operator Intelligence, or Mirdexx.
- Production service installation or unattended startup.

## Required external prerequisites

1. An OpenAI Platform `tunnel_id`.
2. A runtime API key with tunnel use permission.
3. ChatGPT developer-mode permission where ChatGPT will consume the tunnel.
4. A private MCP server reachable locally over HTTP or stdio.
5. Outbound HTTPS access to the OpenAI tunnel service.

Never commit the API key, tunnel identity, access token, or generated runtime state.

## Configuration

Copy `.env.tunnel.example` to `.env.tunnel.local` (ignored) and provide the real values outside version control.

If you use a different filename/location, pass it via `-EnvironmentFile` when running the validator.

```text
aeos.system.health
```

Contract:

- Read-only.
- No filesystem mutation.
- No network fan-out.
- No repository access.
- Returns gateway version, policy version, health status, timestamp, and correlation ID.

## Governance policy

The canonical v0.1 policy is `policy.v0.1.yaml`.

Default behavior:

- Unknown tool: HALT.
- Missing identity, correlation ID, or policy version: HALT.
- Read-only canary: ALLOW.
- Any mutation: REVIEW until a specific adapter policy and post-call verifier exist.
- Credential, permission, billing, deployment, deletion, or destructive action: HALT in v0.1.

OpenAI-side MCP approval settings are defense in depth. They do not replace the gateway authorization decision.

## Verification sequence

1. Run `scripts/validate-tunnel-config.ps1` from PowerShell.
2. Start the private MCP gateway on the configured loopback address.
3. Confirm the gateway is not listening on a public interface.
4. Start OpenAI `tunnel-client` using the official current command and the local environment values.
5. Connect the tunnel from the intended OpenAI organization or ChatGPT workspace.
6. Invoke only `aeos.system.health`.
7. Confirm the response contains a correlation ID and policy version.
8. Confirm a decision receipt was written locally.
9. Attempt an unknown tool and confirm HALT.
10. Stop the tunnel and verify the private MCP server remains unreachable from the public internet.

## Completion evidence

A v0.1 run is accepted only when the operator retains:

- Tunnel identifier fingerprint, not the secret value.
- Gateway bind address.
- Policy version and commit SHA.
- Health-tool request and response.
- ALLOW receipt for the canary.
- HALT receipt for an unknown tool.
- Confirmation that no inbound firewall rule or public endpoint was created.

## Next gate

Do not add write-capable adapters until the canary passes and the gateway has:

- authenticated caller context,
- strict input schemas,
- per-tool permission scopes,
- idempotency controls,
- post-call state verification,
- immutable or hash-chained receipts,
- timeout and circuit-breaker behavior,
- explicit operator review handling.
