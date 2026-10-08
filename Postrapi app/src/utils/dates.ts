export const nowISO = (): string => new Date().toISOString();

// Fecha "AAAA-MM-DD" según la hora LOCAL del teléfono (no UTC). En Ecuador, con UTC
// el día cambiaba a las 19:00.
export const fechaLocal = (d: Date): string => {
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
};

export const todayDate = (): string => fechaLocal(new Date());

// Inicio y fin del día local "AAAA-MM-DD", en ISO UTC, para comparar con created_at.
export const inicioDia = (fecha: string): string => {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(a, m - 1, d, 0, 0, 0, 0).toISOString();
};
export const finDia = (fecha: string): string => {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(a, m - 1, d, 23, 59, 59, 999).toISOString();
};

export const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" });
};
export const formatTime = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" });
};
export const formatCurrency = (amount: number, symbol = "$"): string =>
  `${symbol}${amount.toFixed(2)}`;
