// Pruebas del núcleo de facturación electrónica (sin dependencias). Uso: npm run probar:facturacion
import { modulo11, generarClaveAcceso, formatearSecuencial } from "../src/facturacion/claveAcceso.ts";
import { validarCedula, validarRuc, tipoIdentificacionDe } from "../src/facturacion/identificacion.ts";
import { calcularFactura } from "../src/facturacion/impuestos.ts";
import { construirXmlFactura } from "../src/facturacion/xmlFactura.ts";
let fallas = 0;
const ok = (cond: boolean, msg: string) => { console.log((cond ? "OK   " : "FALLA") + " " + msg); if (!cond) fallas++; };

// Clave de ejemplo publicada en la ficha técnica del SRI
const ejemplo = "2110201101179214673900110020010000000011234567813";
ok(modulo11(ejemplo.slice(0, 48)) === Number(ejemplo[48]), "dígito verificador de la clave de ejemplo del SRI");
const clave = generarClaveAcceso({ fechaEmision: "08/10/2026", tipoComprobante: "01", ruc: "1792146739001", ambiente: "1", estab: "001", ptoEmi: "001", secuencial: formatearSecuencial(1), codigoNumerico: "12345678", tipoEmision: "1" });
ok(clave.length === 49 && clave.startsWith("08102026011792146739001100100100000000112345678"), "clave generada: " + clave);

// Cédula: construir una válida y comprobar que la alterada falla
const base = "171003406"; const coef=[2,1,2,1,2,1,2,1,2]; let s=0; for (let i=0;i<9;i++){let v=+base[i]*coef[i]; if(v>9)v-=9; s+=v;} const ced = base + ((10 - s%10)%10);
ok(validarCedula(ced), "cédula válida " + ced);
ok(!validarCedula(base + ((+ced[9] + 1) % 10)), "cédula con dígito alterado se rechaza");
ok(validarRuc(ced + "001") && !validarRuc(ced + "000"), "RUC de persona natural");
ok(tipoIdentificacionDe("9999999999999") === "07" && tipoIdentificacionDe(ced) === "05", "tipo de identificación");

// Venta real de la prueba: 2 Salchipapa a 4.00 + 1 Gaseosa a 1.50 (IVA incluido)
const v1 = calcularFactura([{ codigo: "prod-salchipapa", descripcion: "Salchipapa", cantidad: 2, precio: 4 }, { codigo: "prod-gaseosa", descripcion: "Gaseosa", cantidad: 1, precio: 1.5 }], { tarifaIva: 15, codigoPorcentajeIva: "4", preciosIncluyenIva: true });
ok(Math.abs(v1.totales.importeTotal - 9.5) <= 0.01, "venta de 9.50 -> importeTotal " + v1.totales.importeTotal + " (base " + v1.totales.totalSinImpuestos + " + IVA " + v1.totales.impuestos[0].valor + ")");
// Pedido con 10% de descuento: 5.50 -> 4.95
const v2 = calcularFactura([{ codigo: "prod-papa-pollo", descripcion: "Papa con pollo", cantidad: 1, precio: 5.5 }], { tarifaIva: 15, codigoPorcentajeIva: "4", preciosIncluyenIva: true, descuentoTotal: 0.55 });
ok(Math.abs(v2.totales.importeTotal - 4.95) <= 0.01, "venta con descuento de 4.95 -> importeTotal " + v2.totales.importeTotal);

const xml = construirXmlFactura({ emisor: { ambiente: "1", ruc: "1792146739001", razonSocial: "Restaurante & Cía <Prueba>", dirMatriz: "Av. Principal", dirEstablecimiento: "Av. Principal", estab: "001", ptoEmi: "001", obligadoContabilidad: false, contribuyenteRimpe: "CONTRIBUYENTE RÉGIMEN RIMPE" }, comprador: { tipoIdentificacion: "07", identificacion: "9999999999999", razonSocial: "CONSUMIDOR FINAL" }, fechaEmision: "08/10/2026", secuencial: "000000001", claveAcceso: clave, lineas: v1.lineas, totales: v1.totales, pagos: [{ formaPago: "01", total: v1.totales.importeTotal }], infoAdicional: { Email: "cliente@ejemplo.com" } });
const pila: string[] = []; let balanceado = true;
for (const m of xml.replace(/<\?xml[^>]*\?>/, "").matchAll(/<(\/?)([a-zA-Z]+)[^>]*?(\/?)>/g)) { if (m[3]) continue; if (m[1]) { if (pila.pop() !== m[2]) balanceado = false; } else pila.push(m[2]); }
ok(balanceado && pila.length === 0, "XML con etiquetas balanceadas (" + xml.length + " caracteres)");
ok(xml.includes("Restaurante &amp; Cía &lt;Prueba&gt;"), "caracteres especiales escapados");
console.log("\n" + xml.slice(0, 700) + "...");
process.exit(fallas ? 1 : 0);
