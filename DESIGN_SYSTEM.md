# POSTRAPI — DESIGN SYSTEM v1.0
> Referencia de diseño para implementar con NativeWind (Tailwind para React Native).
> Leer este archivo antes de construir cualquier pantalla o componente.

---

## Filosofía de diseño
- Dark mode obligatorio en toda la app
- Operación rápida con una mano, dedos, pantalla sucia
- Botones grandes, texto legible, números prominentes
- Cards flotantes con sombra y borde izquierdo de color (estilo WhatsApp)
- Sin gradientes, sin efectos complejos, flat y limpio

---

## Colores base

```
Background principal:     #141414   (fondo de pantalla)
Background card:          #1e1e1e   (cards y elementos)
Background elevado:       #2a2a2a   (chips, íconos, inputs)
Border sutil:             #2a2a2a   (bordes de cards)
Border muy sutil:         #222222   (separadores internos)

Acento principal:         #F97316   (naranja — botones, precios, activos)
Acento info:              #38bdf8   (azul claro — estado Preparando)
Acento éxito:             #22c55e   (verde — stock ok, Entregado, ganancia)
Acento peligro:           #ef4444   (rojo — stock bajo, gastos, alertas)

Texto primario:           #ffffff
Texto secundario:         #cccccc
Texto muted:              #888888
Texto muy muted:          #555555
```

---

## Tipografía

```
Font:           System default (Expo usa Inter en Android/iOS)
Tamaños:
  Título pantalla:    16px  font-weight 500
  Subtítulo:          12px  color #888
  Card título:        13px  font-weight 500  color #fff
  Card subtítulo:     11px  color #666
  Precio / métrica:   18-24px  font-weight 500  color #F97316
  Label muted:        10px  color #666
  Badge:              10px  font-weight 500
  Botón:              13px  font-weight 500
```

---

## Espaciado

```
Padding pantalla:       horizontal 16px
Gap entre cards:        8px
Padding card interno:   12px horizontal, 10px vertical
Gap entre elementos:    6-8px
Border radius card:     14px
Border radius botón:    10px
Border radius chip:     20px (pill)
Border radius badge:    20px (pill)
Border radius ícono:    8px
```

---

## Componentes

### Tab bar (navegación principal)
- Fijo en la parte inferior
- Background: #1a1a1a
- Border top: 0.5px solid #2a2a2a
- 5 tabs: Resumen, Ventas, Pedidos, Bodega, Gestión
- Tab inactivo: ícono + label color #555
- Tab activo: ícono + label color #F97316
- Íconos sugeridos (usar librería de íconos de Expo/RN):
  - Resumen → LayoutDashboard
  - Ventas → ShoppingCart
  - Pedidos → ClipboardList
  - Bodega → Package
  - Gestión → Settings

---

### Top bar
- Background: #141414 (mismo que pantalla, sin separador visible)
- Título a la izquierda: 16px font-weight 500 color #fff
- Acción a la derecha: botón pill naranja o ícono gris

---

### Card flotante
```
background:     #1e1e1e
border-radius:  14px
border:         0.5px solid #2a2a2a
padding:        10px 12px
margin-bottom:  8px

Variantes por borde izquierdo (3px):
  orange:   border-left: 3px solid #F97316   (pendiente / activo)
  blue:     border-left: 3px solid #38bdf8   (preparando)
  green:    border-left: 3px solid #22c55e   (entregado / ok)
  red:      border-left: 3px solid #ef4444   (alerta / error)
  none:     sin borde izquierdo               (neutro)
```

---

### Botón primario
```
background:     #F97316
border-radius:  10px
padding:        10px 16px
color:          #ffffff
font-size:      13px
font-weight:    500
```

### Botón outline
```
background:     #1e1e1e
border:         1px solid #F97316
border-radius:  10px
padding:        10px 16px
color:          #F97316
font-size:      13px
font-weight:    500
```

### Botón peligro
```
background:     #ef4444
border-radius:  10px
padding:        10px 16px
color:          #ffffff
font-size:      13px
font-weight:    500
```

---

### Chip / filtro horizontal
```
background activo:    #F97316
color activo:         #ffffff
background inactivo:  #2a2a2a
color inactivo:       #888888
border:               0.5px solid #333
border-radius:        20px
padding:              4px 10px
font-size:            11px
```

---

### Badge de estado
```
Pendiente:
  background: #2a1a00   color: #F97316

Preparando:
  background: #001a2a   color: #38bdf8

Entregado:
  background: #001a10   color: #22c55e

border-radius: 20px
padding: 3px 8px
font-size: 10px
font-weight: 500
```

---

### Métricas (pantalla Resumen)
```
background:     #1e1e1e
border-radius:  10px
border:         0.5px solid #2a2a2a
padding:        10px

Label:   10px  color #666
Valor:   18-20px  font-weight 500

Colores por tipo:
  Ventas:         #F97316  (naranja)
  Gastos:         #ef4444  (rojo)
  Ganancia:       #22c55e  (verde)
  Pendientes:     #38bdf8  (azul)
```

---

### Barra de progreso (inventario)
```
Contenedor:
  height: 4px
  background: #2a2a2a
  border-radius: 2px
  width: 60px

Barra:
  height: 4px
  border-radius: 2px
  color ok (>50%):   #22c55e
  color low (<30%):  #ef4444
  color medio:       #F97316
```

---

### Aviso de PIN
```
background:     #1a1a00
border:         0.5px solid #333
border-radius:  10px
padding:        10px 12px
ícono:          candado, color #F97316, tamaño 16px
texto:          12px  color #aaa
```

---

### Modal de PIN
```
Overlay:        rgba(0,0,0,0.85)
Card modal:
  background:     #1e1e1e
  border-radius:  20px
  border:         0.5px solid #2a2a2a
  padding:        24px

Título:         16px  font-weight 500  color #fff  centrado
Display PIN:    círculos ●○○○ (rellenos = dígitos ingresados)
Teclado numérico: grid 3x4, botones cuadrados grandes
  Botón:        background #2a2a2a  border-radius 12px  color #fff  font-size 20px
  Botón delete: color #F97316
```

---

### Grid de productos (Nueva venta)
```
2 columnas, gap 8px

Card producto:
  background:     #1e1e1e
  border-radius:  12px
  border:         0.5px solid #2a2a2a
  padding:        10px 8px
  texto centrado

Ícono producto:
  width/height:   36px
  background:     #2a2a2a
  border-radius:  8px
  color ícono:    #F97316

Nombre:   11px  color #ccc
Precio:   12px  font-weight 500  color #F97316

Botón añadir (sin unidades):
  background: #F97316  border-radius 6px  padding 4px  ícono + blanco

Botón añadir (con unidades):
  background: #2a2a2a  border 0.5px solid #F97316  border-radius 6px
  mostrar: [-] cantidad [+]  color #F97316
```

---

## Pantallas y su estructura

### Resumen
```
StatusBar
TopBar (título + ícono campana)
  Grid 2x2 métricas (ventas, gastos, ganancia, pendientes)
  Card alerta inventario bajo (si hay)
  Card top 3 productos
TabBar
```

### Ventas / Nueva venta
```
StatusBar
TopBar (título + pill con total actual)
  Chips de categoría
  Grid 2 col de productos
  Fijo abajo: botones "Cobrar ahora" + "Registrar pedido"
TabBar
```

### Pedidos
```
StatusBar
TopBar (título + botón "+ Nuevo" naranja)
  Chips filtro estado
  Lista de cards flotantes con borde de color por estado
  Cada card: nombre, origen, badge estado, items, botón de acción
TabBar
```

### Bodega / Inventario
```
StatusBar
TopBar (título + ícono ajustes)
  Chips: Inventario / Compras / Ingredientes
  Card con lista de ingredientes + barra de progreso + stock
  Aviso de PIN al fondo
TabBar
```

### Gastos
```
StatusBar
TopBar (título + botón "+ Gasto" naranja)
  Chips filtro categoría
  Lista de cards con concepto, monto, categoría, fecha
  Total del día visible
TabBar
```

### Gestión
```
Al entrar: Modal de PIN (siempre)
  Lista de secciones: Productos, Recetas, PIN y Acceso, Configuración
  Cada sección como row con ícono + título + chevron derecho
```

---

## Notas para implementación con NativeWind

- Usar `bg-[#141414]` para fondos, `bg-[#1e1e1e]` para cards
- Usar `text-[#F97316]` para acento naranja
- Usar `rounded-[14px]` para cards, `rounded-full` para chips y badges
- Los `border-l-[3px]` de las cards se hacen con `borderLeftWidth: 3` en StyleSheet si NativeWind no lo soporta directamente
- El TabBar usar `position: absolute; bottom: 0` o el tab navigator de Expo Router con estilo personalizado
- Fuente del sistema, no importar fuentes externas en v1
- Todos los ScrollView con `showsVerticalScrollIndicator={false}`
- SafeAreaView en todas las pantallas

---
*Actualizar este archivo si el cliente aprueba cambios de diseño durante el desarrollo.*
