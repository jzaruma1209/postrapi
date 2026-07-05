ALTER TABLE `caja_diaria` RENAME COLUMN `monto_declarado` TO `monto_declarado_efectivo`;
--> statement-breakpoint
ALTER TABLE `caja_diaria` ADD COLUMN `monto_declarado_transferencia` REAL;
