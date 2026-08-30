CREATE TABLE `thrones` (
  `id` char(36) NOT NULL,
  `slug` varchar(80) NOT NULL,
  `category` varchar(80) NOT NULL,
  `king_name` varchar(40) NOT NULL,
  `king_url` varchar(2048) NOT NULL,
  `stake_cents` int NOT NULL DEFAULT 0,
  `status` enum('default', 'stolen') NOT NULL DEFAULT 'default',
  `clicks` int NOT NULL DEFAULT 0,
  `reign_started_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `thrones_slug_unique` (`slug`)
) ENGINE=InnoDB;
--> statement-breakpoint
CREATE TABLE `reigns` (
  `id` char(36) NOT NULL,
  `throne_id` char(36) NOT NULL,
  `king_name` varchar(40) NOT NULL,
  `king_url` varchar(2048) NOT NULL,
  `amount_cents` int NOT NULL,
  `from_name` varchar(40),
  `from_url` varchar(2048),
  `paid_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `checkout_id` char(36),
  PRIMARY KEY (`id`),
  UNIQUE KEY `reigns_checkout_id_unique` (`checkout_id`),
  CONSTRAINT `reigns_throne_id_thrones_id_fk` FOREIGN KEY (`throne_id`) REFERENCES `thrones` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;
--> statement-breakpoint
CREATE TABLE `checkouts` (
  `id` char(36) NOT NULL,
  `throne_id` char(36) NOT NULL,
  `name` varchar(40) NOT NULL,
  `url` varchar(2048) NOT NULL,
  `amount_cents` int NOT NULL,
  `status` enum('pending', 'paid', 'stale', 'canceled') NOT NULL DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `checkouts_throne_id_thrones_id_fk` FOREIGN KEY (`throne_id`) REFERENCES `thrones` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;
