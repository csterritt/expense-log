CREATE TABLE IF NOT EXISTS `account` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`accountId` text NOT NULL,
	`providerId` text NOT NULL,
	`accessToken` text,
	`refreshToken` text,
	`accessTokenExpiresAt` integer,
	`refreshTokenExpiresAt` integer,
	`scope` text,
	`idToken` text,
	`password` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `interestedEmail` (
	`email` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `interestedEmail_email_unique` ON `interestedEmail` (`email`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `session` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`token` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`ipAddress` text,
	`userAgent` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `singleUseCode` (
	`code` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`emailVerified` integer DEFAULT false NOT NULL,
	`image` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `user_name_unique` ON `user` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
ALTER TABLE `singleUseCode` ADD `email` text;CREATE TABLE IF NOT EXISTS `category` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `category_name_unique` ON `category` (`name`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `expense` (
	`id` text PRIMARY KEY NOT NULL,
	`description` text NOT NULL,
	`amountCents` integer NOT NULL,
	`categoryId` text NOT NULL,
	`date` text NOT NULL,
	`recurringId` text,
	`occurrenceDate` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`categoryId`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`recurringId`) REFERENCES `recurring`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `expense_recurring_occurrence_unique` ON `expense` (`recurringId`,`occurrenceDate`) WHERE "expense"."recurringId" IS NOT NULL;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `expenseTag` (
	`expenseId` text NOT NULL,
	`tagId` text NOT NULL,
	PRIMARY KEY(`expenseId`, `tagId`),
	FOREIGN KEY (`expenseId`) REFERENCES `expense`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tagId`) REFERENCES `tag`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `recurring` (
	`id` text PRIMARY KEY NOT NULL,
	`description` text NOT NULL,
	`amountCents` integer NOT NULL,
	`categoryId` text NOT NULL,
	`recurrence` text NOT NULL,
	`anchorDate` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`categoryId`) REFERENCES `category`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `recurringTag` (
	`recurringId` text NOT NULL,
	`tagId` text NOT NULL,
	PRIMARY KEY(`recurringId`, `tagId`),
	FOREIGN KEY (`recurringId`) REFERENCES `recurring`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tagId`) REFERENCES `tag`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `tag` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `tag_name_unique` ON `tag` (`name`);
DROP INDEX `category_name_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `category_name_lower_unique` ON `category` (lower("name"));
DROP INDEX `tag_name_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `tag_name_lower_unique` ON `tag` (lower("name"));
