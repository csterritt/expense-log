DROP INDEX `category_name_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `category_name_lower_unique` ON `category` (lower("name"));