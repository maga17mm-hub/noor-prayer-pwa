CREATE TABLE `noor_config` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `noor_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`sent` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `noor_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`subscription` text NOT NULL,
	`place` text NOT NULL,
	`settings` text NOT NULL,
	`updated` integer NOT NULL
);
