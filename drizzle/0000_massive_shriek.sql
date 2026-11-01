CREATE TABLE `attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`passage_id` text,
	`snapshot` text NOT NULL,
	`title` text NOT NULL,
	`difficulty` text NOT NULL,
	`mode` text NOT NULL,
	`duration` integer NOT NULL,
	`started` integer,
	`finished` integer,
	`typed` text,
	`wpm` real,
	`raw` real,
	`accuracy` real,
	`first_accuracy` real,
	`errors` integer,
	`corrected` integer,
	`elapsed` real,
	`eligible` integer DEFAULT 0,
	`mistakes` text,
	`room_id` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`detail` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `features` (
	`id` text PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`value` text
);
--> statement-breakpoint
CREATE TABLE `goals` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`target` integer NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `limits` (
	`id` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`reset` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `participants` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`user_id` text NOT NULL,
	`ready` integer DEFAULT 0,
	`progress` real DEFAULT 0,
	`last_seen` integer NOT NULL,
	`result_id` text,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `passages` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`text` text NOT NULL,
	`difficulty` text NOT NULL,
	`category` text NOT NULL,
	`words` integer NOT NULL,
	`status` text DEFAULT 'published',
	`created` integer NOT NULL,
	`updated` integer NOT NULL,
	`provenance` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`message` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`host` text NOT NULL,
	`name` text NOT NULL,
	`visibility` text NOT NULL,
	`difficulty` text NOT NULL,
	`capacity` integer NOT NULL,
	`passage_id` text NOT NULL,
	`state` text DEFAULT 'waiting' NOT NULL,
	`start_at` integer,
	`created` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`token` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires` integer NOT NULL,
	`admin` integer DEFAULT 0,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`username` text,
	`recovery` text,
	`created` integer NOT NULL,
	`settings` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`guest` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);