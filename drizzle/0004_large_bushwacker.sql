DROP INDEX `tag_name_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `tag_name_lower_unique` ON `tag` (lower("name"));