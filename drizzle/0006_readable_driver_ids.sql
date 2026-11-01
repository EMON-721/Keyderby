CREATE TABLE `driver_numbers` (`number` integer PRIMARY KEY AUTOINCREMENT NOT NULL, `user_id` text NOT NULL UNIQUE REFERENCES `users`(`id`));
--> statement-breakpoint
INSERT INTO `driver_numbers` (`user_id`) SELECT `id` FROM `users` ORDER BY `created`, `id`;
--> statement-breakpoint
ALTER TABLE `users` ADD COLUMN `public_id` text;
--> statement-breakpoint
UPDATE `users` SET `public_id` = 'KD-' || printf('%06d', (SELECT `number` FROM `driver_numbers` WHERE `user_id` = `users`.`id`));
--> statement-breakpoint
CREATE UNIQUE INDEX `users_public_id_unique` ON `users` (`public_id`);
