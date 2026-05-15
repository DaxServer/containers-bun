CREATE TABLE `batches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userid` varchar(255) NOT NULL,
	`edit_group_id` varchar(12),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `batches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `presets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userid` varchar(255) NOT NULL,
	`handler` varchar(50) NOT NULL,
	`title` varchar(255) NOT NULL,
	`title_template` varchar(500) NOT NULL,
	`labels` json,
	`categories` varchar(500),
	`exclude_from_date_category` boolean NOT NULL DEFAULT false,
	`is_default` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `presets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `upload_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`batchid` int NOT NULL,
	`userid` varchar(255) NOT NULL,
	`status` varchar(50) NOT NULL,
	`key` varchar(255) NOT NULL,
	`handler` varchar(255) NOT NULL,
	`collection` varchar(255),
	`access_token` text,
	`filename` varchar(255) NOT NULL,
	`wikitext` text NOT NULL,
	`copyright_override` boolean NOT NULL DEFAULT false,
	`labels` json,
	`result` text,
	`error` json,
	`success` text,
	`celery_task_id` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `upload_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`userid` varchar(255) NOT NULL,
	`username` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_userid` PRIMARY KEY(`userid`)
);
--> statement-breakpoint
CREATE INDEX `batches_userid_idx` ON `batches` (`userid`);--> statement-breakpoint
CREATE INDEX `batches_created_at_idx` ON `batches` (`created_at`);--> statement-breakpoint
CREATE INDEX `batches_updated_at_idx` ON `batches` (`updated_at`);--> statement-breakpoint
CREATE INDEX `presets_userid_idx` ON `presets` (`userid`);--> statement-breakpoint
CREATE INDEX `presets_handler_idx` ON `presets` (`handler`);--> statement-breakpoint
CREATE INDEX `presets_is_default_idx` ON `presets` (`is_default`);--> statement-breakpoint
CREATE INDEX `upload_requests_batchid_idx` ON `upload_requests` (`batchid`);--> statement-breakpoint
CREATE INDEX `upload_requests_userid_idx` ON `upload_requests` (`userid`);--> statement-breakpoint
CREATE INDEX `upload_requests_status_idx` ON `upload_requests` (`status`);--> statement-breakpoint
CREATE INDEX `upload_requests_key_idx` ON `upload_requests` (`key`);--> statement-breakpoint
CREATE INDEX `upload_requests_handler_idx` ON `upload_requests` (`handler`);--> statement-breakpoint
CREATE INDEX `upload_requests_filename_idx` ON `upload_requests` (`filename`);--> statement-breakpoint
CREATE INDEX `upload_requests_created_at_idx` ON `upload_requests` (`created_at`);--> statement-breakpoint
CREATE INDEX `upload_requests_updated_at_idx` ON `upload_requests` (`updated_at`);--> statement-breakpoint
CREATE INDEX `users_username_idx` ON `users` (`username`);