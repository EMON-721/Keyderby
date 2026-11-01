ALTER TABLE `attempts` ADD `paused_at` integer;--> statement-breakpoint
ALTER TABLE `attempts` ADD `paused_total` integer DEFAULT 0;--> statement-breakpoint
CREATE INDEX `attempts_user_finished_idx` ON `attempts` (`user_id`,`finished`);--> statement-breakpoint
CREATE INDEX `attempts_ranking_idx` ON `attempts` (`eligible`,`difficulty`,`duration`);--> statement-breakpoint
CREATE UNIQUE INDEX `attempts_room_user_idx` ON `attempts` (`room_id`,`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `participants_room_user_idx` ON `participants` (`room_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `participants_room_idx` ON `participants` (`room_id`);--> statement-breakpoint
CREATE INDEX `passages_filters_idx` ON `passages` (`status`,`difficulty`);--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expiry_idx` ON `sessions` (`expires`);