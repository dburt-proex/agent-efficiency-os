# Skill-Building Notes — governed repository rollout

Candidate skill name: `github-governed-agent-rollout`

## Trigger

Use when installing or refreshing DiffWall plus a GitHub custom-agent team across one or more repositories owned by the same operator.

## Inputs

- GitHub owner and repository scope.
- Pinned DiffWall release.
- Canonical agent-profile source.
- Per-repository default branch.
- Existing agent/workflow files that must be preserved.
- Review policy: draft PR by default.

## Procedure

1. Inventory repositories and classify active, empty, archived, and exceptional repos.
2. Inspect the DiffWall release README/action contract and pin an immutable release.
3. Verify the current GitHub custom-agent file format and tool aliases against GitHub Docs.
4. Build one reference branch with the seven agent profiles and consumer DiffWall workflow.
5. Open a draft PR and require real DiffWall evidence before replication.
6. Before each repository write, detect path collisions, especially `.github/workflows/diffwall.yml` and existing agent profiles.
7. Create a dedicated rollout branch. Never fall back to direct-default writes when ref creation fails.
8. Apply files sequentially within one repository. Parallelize only across independent repositories.
9. Open a draft PR.
10. Verify exact changed filenames.
11. Verify DiffWall workflow status and captured route evidence.
12. Record READY / BLOCKED / DEFERRED state with PR URL and exception evidence.
13. Human review/merge is a separate gate.

## Decision logic

- ALLOW: inventory/read checks, exact-scope verification, evidence collection.
- REVIEW: new workflow/security-policy files, agent edit permissions, missing evidence, existing-path collisions.
- HALT: default-branch bypass, credential exposure, permission escalation, unrelated file replacement, destructive ref manipulation, or DiffWall HALT.

## Required output

- authority matrix;
- routing contract;
- exact agent/tool scopes;
- DiffWall release/ref;
- repository rollout ledger;
- PR URLs;
- workflow result per repo;
- exceptions and next gate;
- screenshots of the reference PR, agent files, and DiffWall evidence.

## Lessons from this run

- Personal GitHub accounts do not inherit repository custom agents from a single profile-level file; repository-level profiles live under `.github/agents/`.
- The DiffWall repository is special: it already owns a self-scan workflow and must not receive a duplicate consumer workflow.
- Connector error payloads must be checked explicitly; do not treat a returned tool payload as success solely because the transport call completed.
- A path collision is a REVIEW event. Fetch and compare before create/update/delete.
- A failed branch/ref creation is a repository-local stop condition, not permission to write directly to the default branch.
- Preserve evidence that distinguishes prepared PRs from merged/default-branch installation.

## Screenshot catalog

Screenshots captured for this run should use these stable names:

- `01-reference-pr-diffwall-review.jpg`
- `02-agent-team-files.jpg`
- `03-diffwall-workflow-success.jpg`

They document the reference PR gate, native GitHub agent layout, and successful workflow execution for later skill authoring.
