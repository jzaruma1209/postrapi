ALTER TABLE `ventas` ADD COLUMN `subtotal` REAL NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `ventas` ADD COLUMN `descuento_tipo` TEXT;
--> statement-breakpoint
ALTER TABLE `ventas` ADD COLUMN `descuento_valor` REAL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `ventas` ADD COLUMN `anulada` INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `ventas` ADD COLUMN `anulada_at` TEXT;
--> statement-breakpoint
ALTER TABLE `ventas` ADD COLUMN `motivo_anulacion` TEXT;
--> statement-breakpoint
ALTER TABLE `pedidos` ADD COLUMN `anulado_at` TEXT;
--> statement-breakpoint
ALTER TABLE `pedidos` ADD COLUMN `motivo_anulacion` TEXT;
