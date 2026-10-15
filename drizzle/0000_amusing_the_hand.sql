CREATE TABLE `ai_usage` (
	`owner` text NOT NULL,
	`day` text NOT NULL,
	`count` real NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_ai_usage_owner_day` ON `ai_usage` (`owner`,`day`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`owner` text PRIMARY KEY NOT NULL,
	`name` text DEFAULT 'Player' NOT NULL,
	`threshold` real DEFAULT 40 NOT NULL,
	`goal` text DEFAULT 'Build consistent habits in LMS' NOT NULL,
	`completed` text DEFAULT '[]' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`title` text NOT NULL,
	`game` text NOT NULL,
	`mode` text NOT NULL,
	`outcome` text NOT NULL,
	`duration` real NOT NULL,
	`events` text NOT NULL,
	`review` text NOT NULL,
	`parts` text DEFAULT '[]' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`ai` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_owner_created` ON `sessions` (`owner`,`created_at`);