CREATE TABLE `credit_ledger` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`at` integer NOT NULL,
	`endpoint` text NOT NULL,
	`request_key` text NOT NULL,
	`expected` integer NOT NULL,
	`cost` integer,
	`balance` integer,
	`http_status` integer,
	`settled_at` integer
);
--> statement-breakpoint
CREATE TABLE `player_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`endpoint` text NOT NULL,
	`status` text NOT NULL,
	`body` text,
	`fetched_at` integer NOT NULL,
	`expires_at` integer
);
