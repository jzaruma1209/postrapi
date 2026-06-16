export const nowISO = (): string => new Date().toISOString();
export const todayDate = (): string => new Date().toISOString().split("T")[0];
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
