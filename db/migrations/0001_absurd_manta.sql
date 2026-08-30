CREATE TABLE `checkouts` (
	`id` char(36) NOT NULL,
	`throne_id` char(36),
	`proposed_throne` json,
	`name` varchar(40) NOT NULL,
	`url` varchar(2048) NOT NULL,
	`product_x_handle` varchar(40),
	`product_logo_url` varchar(2048),
	`offer_headline` varchar(120) NOT NULL,
	`offer_pitch` text NOT NULL,
	`cta_label` varchar(40) NOT NULL,
	`offer_expires_at` timestamp,
	`expected_previous_king` varchar(40),
	`expected_previous_stake_cents` int,
	`amount_cents` int NOT NULL,
	`status` enum('pending','paid','stale','canceled') NOT NULL DEFAULT 'pending',
	`client_ip` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `checkouts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` char(36) NOT NULL,
	`type` enum('throne_view','reign_view','throne_click','reign_click') NOT NULL,
	`throne_id` char(36),
	`reign_id` char(36),
	`visitor_day_hash` varchar(64) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reigns` (
	`id` char(36) NOT NULL,
	`public_id` varchar(24) NOT NULL,
	`throne_id` char(36) NOT NULL,
	`king_name` varchar(40) NOT NULL,
	`king_url` varchar(2048) NOT NULL,
	`product_x_handle` varchar(40),
	`product_logo_url` varchar(2048),
	`offer_headline` varchar(120),
	`offer_pitch` text,
	`cta_label` varchar(40),
	`offer_expires_at` timestamp,
	`amount_cents` int NOT NULL,
	`from_name` varchar(40),
	`from_url` varchar(2048),
	`from_stake_cents` int,
	`started_at` timestamp NOT NULL DEFAULT (now()),
	`ended_at` timestamp,
	`paid_at` timestamp NOT NULL DEFAULT (now()),
	`recorded_visits` int NOT NULL DEFAULT 0,
	`outbound_clicks` int NOT NULL DEFAULT 0,
	`status` enum('current','former','suspended') NOT NULL DEFAULT 'current',
	`checkout_id` char(36),
	CONSTRAINT `reigns_id` PRIMARY KEY(`id`),
	CONSTRAINT `reigns_public_id_unique` UNIQUE(`public_id`),
	CONSTRAINT `reigns_checkout_id_unique` UNIQUE(`checkout_id`)
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` char(36) NOT NULL,
	`throne_id` char(36),
	`reign_id` char(36),
	`reason` varchar(255) NOT NULL,
	`details` text,
	`status` enum('pending','reviewed','actioned') NOT NULL DEFAULT 'pending',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `thrones` (
	`id` char(36) NOT NULL,
	`slug` varchar(80) NOT NULL,
	`category` varchar(80) NOT NULL,
	`definition` varchar(255) NOT NULL DEFAULT '',
	`source` enum('seeded','user_created') NOT NULL DEFAULT 'seeded',
	`status` enum('live','suspended') NOT NULL DEFAULT 'live',
	`aliases` varchar(512),
	`default_king_name` varchar(40) NOT NULL,
	`default_king_url` varchar(2048) NOT NULL,
	`default_king_x_handle` varchar(40),
	`created_by_domain` varchar(255),
	`created_by_x_handle` varchar(40),
	`king_name` varchar(40) NOT NULL,
	`king_url` varchar(2048) NOT NULL,
	`stake_cents` int NOT NULL DEFAULT 0,
	`recorded_visits` int NOT NULL DEFAULT 0,
	`outbound_clicks` int NOT NULL DEFAULT 0,
	`reign_started_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `thrones_id` PRIMARY KEY(`id`),
	CONSTRAINT `thrones_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `checkouts` ADD CONSTRAINT `checkouts_throne_id_thrones_id_fk` FOREIGN KEY (`throne_id`) REFERENCES `thrones`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reigns` ADD CONSTRAINT `reigns_throne_id_thrones_id_fk` FOREIGN KEY (`throne_id`) REFERENCES `thrones`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `events_day_hash_idx` ON `events` (`visitor_day_hash`);--> statement-breakpoint
CREATE INDEX `events_throne_id_idx` ON `events` (`throne_id`);--> statement-breakpoint
CREATE INDEX `events_reign_id_idx` ON `events` (`reign_id`);--> statement-breakpoint
CREATE INDEX `reigns_throne_id_idx` ON `reigns` (`throne_id`);--> statement-breakpoint
CREATE INDEX `reigns_public_id_idx` ON `reigns` (`public_id`);