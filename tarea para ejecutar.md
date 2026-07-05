Contexto: Postrapi, POS React Native/Expo con SQLite (Drizzle) local + Supabase.

Ya existen: getHistorialCajas() en ventas.service.ts, getVentasEnRango(desde, hasta)

y getGastosEnRango(desde, hasta). La pantalla principal de Resumen está en

app/(tabs)/index.tsx y muestra "Ventas hoy", "Gastos hoy", "Ganancia est." calculados

sobre el día calendario completo (esto NO debe cambiar).



OBJETIVO: agregar un botón en la pantalla de Resumen (app/(tabs)/index.tsx) que

lleve a una pantalla nueva mostrando un resumen de TODAS las cajas del día de hoy

(abiertas y cerradas), una debajo de otra.



LO QUE NECESITO QUE HAGAS:



1\. En ventas.service.ts, agrega una función nueva:

&#x20;  getCajasDeHoy() → trae todas las filas de caja\_diaria cuyo created\_at

&#x20;  corresponda a la fecha de hoy (mismo criterio de fecha que ya usa

&#x20;  getTotalVentasHoy), sin importar si están abiertas o cerradas. Ordenadas por

&#x20;  created\_at ascendente (la primera caja del día arriba).



2\. Crea una pantalla nueva: app/(tabs)/resumen-cajas.tsx (o donde corresponda

&#x20;  según cómo esté organizado el routing de Resumen — revisa primero la

&#x20;  estructura de carpetas antes de decidir la ruta).

&#x20;  Debe listar cada caja de hoy mostrando lo mismo que ya se ve en

&#x20;  historial-cajas.tsx (apertura, cierre o "ABIERTA" si sigue activa, monto

&#x20;  inicial, esperado, contado si ya cerró, diferencia con color) — reutiliza el

&#x20;  mismo componente o lógica visual de historial-cajas.tsx, no dupliques código

&#x20;  si se puede evitar.



3\. Agrega un botón simple en app/(tabs)/index.tsx (Resumen), cerca de las cards

&#x20;  existentes, tipo "Ver cajas de hoy" que navegue a esta pantalla nueva.



4\. NO modifiques ningún cálculo existente en index.tsx (Ventas hoy, Gastos hoy,

&#x20;  Ganancia est. siguen igual, sumando el día completo).



5\. NO modifiques caja.tsx ni historial-cajas.tsx más allá de reutilizar su lógica

&#x20;  si aplica.



6\. Al terminar, dame un resumen de: qué archivos creaste/modificaste, cómo

&#x20;  quedó getCajasDeHoy() exactamente, y confirma que index.tsx no tuvo cambios

&#x20;  en su lógica de cálculo, solo el botón nuevo.

