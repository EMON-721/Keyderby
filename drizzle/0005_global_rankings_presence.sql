ALTER TABLE `users` ADD `last_active` integer DEFAULT 0 NOT NULL;
CREATE INDEX `users_last_active_idx` ON `users` (`last_active`);