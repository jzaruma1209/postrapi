# Flujo de Postrapi (estado al 2026-10-07)

Los diagramas usan Mermaid; se ven en GitHub y en la vista previa de VS Code.
En rojo, los puntos con fallas conocidas (ver `TAREAS.md`).

## 1. Arquitectura

```mermaid
flowchart LR
  subgraph Telefono["Teléfono (funciona sin internet)"]
    UI["Pantallas<br/>Resumen · Ventas · Pedidos<br/>Bodega · Gastos · Gestión"]
    SRV["Servicios<br/>ventas · pedidos · inventario<br/>anulacion · pin · sync"]
    DB[("SQLite local<br/>postrapi.db")]
    UI --> SRV --> DB
  end
  SYNC["Sync cada 60 s<br/>solo SUBE filas con synced = 0"]
  SB[("Supabase<br/>respaldo en la nube")]
  DB --> SYNC -->|"upsert por id"| SB
  SB -. "no baja nada<br/>(no hay restauración ni multi-dispositivo)" .-> DB

  classDef falla fill:#7f1d1d,stroke:#ef4444,color:#fff
  class SYNC falla
```

## 2. Arranque de la app

```mermaid
flowchart TD
  A["Abrir app"] --> B["runMigrations<br/>crea/actualiza tablas"]
  B --> C{"¿Hay productos?"}
  C -- "No" --> D["runSeeds<br/>productos e ingredientes de ejemplo<br/>con IDs fijos"]
  C -- "Sí" --> E
  D --> E["Cargar tema guardado"]
  E --> F["Mostrar pestañas"]
  F --> G["Iniciar sync automático (60 s)"]
  B -. "si falla: carga infinita" .-> X["⚠ T-11"]

  classDef falla fill:#7f1d1d,stroke:#ef4444,color:#fff
  class X,D falla
```

## 3. Venta directa (pestaña Ventas)

```mermaid
flowchart TD
  A["Abrir caja<br/>monto inicial"] --> B["Elegir productos<br/>filtro por categoría"]
  B --> C["Cobrar ahora"]
  C --> D{"¿Descuento?"}
  D -- "monto o %<br/>⚠ sin PIN (T-04)" --> E
  D -- "no" --> E["Método: efectivo o transferencia"]
  E --> F{"¿Hay caja abierta?"}
  F -- "No" --> G["Error: abrir caja primero"]
  F -- "De 'otro día'" --> H["Pide PIN para seguir<br/>⚠ después de 19:00 por UTC (T-01)"]
  F -- "Sí" --> I["crearVenta<br/>⚠ sin transacción (T-03)"]
  H --> I
  I --> J["Guardar venta + items"]
  J --> K["Por cada ingrediente de la receta:<br/>movimiento 'descuento_venta'<br/>y restar stock"]
  K --> L["Ticket con número de venta"]
  L --> M["Se refleja en Caja, Historial y Resumen"]

  classDef falla fill:#7f1d1d,stroke:#ef4444,color:#fff
  class H,I falla
```

## 4. Pedido (pestaña Pedidos)

```mermaid
stateDiagram-v2
  [*] --> pendiente: Nuevo pedido<br/>cliente · nota · origen (persona / WhatsApp / llamada)
  pendiente --> preparando: botón Preparado
  preparando --> entregado: Entregar y cobrar<br/>(descuento + método de pago)<br/>crea una venta (flujo 3)
  pendiente --> anulado: Anular (PIN + motivo)
  preparando --> anulado: Anular (PIN + motivo)
  entregado --> anulado: solo desde Gestión → Anulación<br/>devuelve ingredientes
  entregado --> [*]
  anulado --> [*]
```

## 5. Caja diaria

```mermaid
flowchart TD
  A["Abrir caja<br/>fecha = día UTC ⚠"] --> B["Durante el día:<br/>ventas efectivo · ventas transferencia · gastos"]
  B --> C["Esperado en efectivo =<br/>inicial + ventas efectivo − gastos"]
  C --> D["Cerrar caja:<br/>declarar efectivo contado y transferencias"]
  D --> E["Historial de Cajas<br/>(solo muestra cerradas)"]
  D -. "⚠ el cierre no sube a la nube (T-02)" .-> X["Supabase"]

  classDef falla fill:#7f1d1d,stroke:#ef4444,color:#fff
  class X falla
```

## 6. Bodega, gastos y gestión

```mermaid
flowchart LR
  subgraph Bodega
    B1["Inventario<br/>stock por ingrediente"]
    B2["Compras<br/>suma stock + guarda costo"]
    B3["Ajuste de stock<br/>requiere PIN"]
  end
  subgraph Gastos
    G1["Registrar gasto<br/>concepto · monto · categoría<br/>requiere PIN"]
  end
  subgraph Gestion["Gestión (todo con PIN)"]
    P1["Productos"]
    P2["Recetas<br/>producto ↔ ingredientes"]
    P3["PIN y acceso<br/>+ recuperación con código diario"]
    P4["Anulación<br/>ventas y pedidos por fecha"]
    P5["Respaldo<br/>estado del sync"]
    P6["Configuración<br/>nombre · moneda · tema · impresora"]
  end
  B2 -->|"costo promedio"| R["Resumen<br/>ventas · gastos · ganancia est.<br/>pedidos pendientes · top productos"]
  G1 --> R
  P2 -->|"define qué se descuenta al vender"| B1
```
