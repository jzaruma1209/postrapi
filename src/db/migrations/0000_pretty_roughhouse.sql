CREATE TABLE `caja_diaria` (
	`id` text PRIMARY KEY NOT NULL,
	`monto_inicial` real NOT NULL,
	`monto_declarado` real,
	`fecha` text NOT NULL,
	`cerrada_at` text,
	`created_at` text NOT NULL,
	`synced` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `compras` (
	`id` text PRIMARY KEY NOT NULL,
	`ingrediente_id` text NOT NULL,
	`cantidad` real NOT NULL,
	`costo_total` real NOT NULL,
	`fecha` text NOT NULL,
	`created_at` text NOT NULL,
	`synced` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`ingrediente_id`) REFERENCES `ingredientes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `configuracion` (
	`clave` text PRIMARY KEY NOT NULL,
	`valor` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `gastos` (
	`id` text PRIMARY KEY NOT NULL,
	`concepto` text NOT NULL,
	`monto` real NOT NULL,
	`categoria` text NOT NULL,
	`fecha` text NOT NULL,
	`created_at` text NOT NULL,
	`synced` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ingredientes` (
	`id` text PRIMARY KEY NOT NULL,
	`nombre` text NOT NULL,
	`unidad` text NOT NULL,
	`stock_actual` real DEFAULT 0 NOT NULL,
	`stock_minimo` real DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`synced` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `movimientos_inventario` (
	`id` text PRIMARY KEY NOT NULL,
	`ingrediente_id` text NOT NULL,
	`tipo` text NOT NULL,
	`cantidad` real NOT NULL,
	`motivo` text,
	`referencia_id` text,
	`created_at` text NOT NULL,
	`synced` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`ingrediente_id`) REFERENCES `ingredientes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pedido_items` (
	`id` text PRIMARY KEY NOT NULL,
	`pedido_id` text NOT NULL,
	`producto_id` text NOT NULL,
	`cantidad` integer NOT NULL,
	`created_at` text NOT NULL,
	`synced` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`pedido_id`) REFERENCES `pedidos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pedidos` (
	`id` text PRIMARY KEY NOT NULL,
	`cliente_nombre` text,
	`nota` text,
	`origen` text NOT NULL,
	`estado` text DEFAULT 'pendiente' NOT NULL,
	`created_at` text NOT NULL,
	`entregado_at` text,
	`synced` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `productos` (
	`id` text PRIMARY KEY NOT NULL,
	`nombre` text NOT NULL,
	`precio` real NOT NULL,
	`imagen_url` text,
	`activo` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`synced` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recetas` (
	`id` text PRIMARY KEY NOT NULL,
	`producto_id` text NOT NULL,
	`ingrediente_id` text NOT NULL,
	`cantidad` real NOT NULL,
	`created_at` text NOT NULL,
	`synced` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ingrediente_id`) REFERENCES `ingredientes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `venta_items` (
	`id` text PRIMARY KEY NOT NULL,
	`venta_id` text NOT NULL,
	`producto_id` text NOT NULL,
	`cantidad` integer NOT NULL,
	`precio_unitario` real NOT NULL,
	`subtotal` real NOT NULL,
	`created_at` text NOT NULL,
	`synced` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`venta_id`) REFERENCES `ventas`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `ventas` (
	`id` text PRIMARY KEY NOT NULL,
	`total` real NOT NULL,
	`metodo_pago` text NOT NULL,
	`pedido_id` text,
	`created_at` text NOT NULL,
	`synced` integer DEFAULT 0 NOT NULL
);
