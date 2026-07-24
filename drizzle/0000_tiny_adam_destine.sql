CREATE TABLE `decisions` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`decision_key` text NOT NULL,
	`sequence` integer NOT NULL,
	`gate` text NOT NULL,
	`rationale` text NOT NULL,
	`evidence_summary` text DEFAULT '' NOT NULL,
	`assumptions` text DEFAULT '' NOT NULL,
	`risk` text DEFAULT 'medium' NOT NULL,
	`actor_email` text NOT NULL,
	`reviewer_email` text DEFAULT '' NOT NULL,
	`policy_version` text NOT NULL,
	`scope` text DEFAULT 'execution' NOT NULL,
	`next_gate` text DEFAULT '' NOT NULL,
	`previous_hash` text NOT NULL,
	`event_hash` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `decisions_run_sequence_unique` ON `decisions` (`run_id`,`sequence`);--> statement-breakpoint
CREATE UNIQUE INDEX `decisions_decision_key_unique` ON `decisions` (`decision_key`);--> statement-breakpoint
CREATE INDEX `decisions_run_created_idx` ON `decisions` (`run_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `evidence_records` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`decision_id` text,
	`evidence_key` text NOT NULL,
	`kind` text DEFAULT 'artifact' NOT NULL,
	`uri` text DEFAULT '' NOT NULL,
	`summary` text NOT NULL,
	`content_hash` text NOT NULL,
	`source_authority` text DEFAULT 'workspace' NOT NULL,
	`freshness` text DEFAULT 'current-run' NOT NULL,
	`actor_email` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `runs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`decision_id`) REFERENCES `decisions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `evidence_records_key_unique` ON `evidence_records` (`evidence_key`);--> statement-breakpoint
CREATE INDEX `evidence_records_run_created_idx` ON `evidence_records` (`run_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `runs` (
	`id` text PRIMARY KEY NOT NULL,
	`external_key` text NOT NULL,
	`system_key` text DEFAULT 'mirdexx' NOT NULL,
	`ledger_namespace` text DEFAULT 'mirdexx.shared' NOT NULL,
	`title` text NOT NULL,
	`objective` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`current_gate` text DEFAULT 'REVIEW' NOT NULL,
	`owner_email` text NOT NULL,
	`agent_key` text DEFAULT 'codex' NOT NULL,
	`policy_version` text DEFAULT 'MGEP-1.0' NOT NULL,
	`authority_scope` text DEFAULT 'read-only' NOT NULL,
	`data_classification` text DEFAULT 'internal' NOT NULL,
	`token_budget` integer DEFAULT 50000 NOT NULL,
	`tool_budget` integer DEFAULT 12 NOT NULL,
	`source_ref` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`completed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `runs_external_key_unique` ON `runs` (`external_key`);--> statement-breakpoint
CREATE INDEX `runs_owner_updated_idx` ON `runs` (`owner_email`,`updated_at`);