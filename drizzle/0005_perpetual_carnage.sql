CREATE TABLE `submissionKey` (
	`key` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`outcome` text NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
