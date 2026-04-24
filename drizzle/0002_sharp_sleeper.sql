CREATE TABLE `category` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `category_name_unique` ON `category` (`name`);--> statement-breakpoint
CREATE TABLE `expense` (
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
CREATE UNIQUE INDEX `expense_recurring_occurrence_unique` ON `expense` (`recurringId`,`occurrenceDate`) WHERE "expense"."recurringId" IS NOT NULL;--> statement-breakpoint
CREATE TABLE `expenseTag` (
	`expenseId` text NOT NULL,
	`tagId` text NOT NULL,
	PRIMARY KEY(`expenseId`, `tagId`),
	FOREIGN KEY (`expenseId`) REFERENCES `expense`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tagId`) REFERENCES `tag`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `recurring` (
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
CREATE TABLE `recurringTag` (
	`recurringId` text NOT NULL,
	`tagId` text NOT NULL,
	PRIMARY KEY(`recurringId`, `tagId`),
	FOREIGN KEY (`recurringId`) REFERENCES `recurring`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tagId`) REFERENCES `tag`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `tag` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tag_name_unique` ON `tag` (`name`);