export function calcularGanancia(
  totalVentas: number,
  totalGastos: number,
  costoIngredientes: number
): number {
  return totalVentas - totalGastos - costoIngredientes;
}

export function formatearGanancia(ganancia: number, moneda = "$"): string {
  const signo = ganancia >= 0 ? "+" : "";
  return `${signo}${moneda}${Math.abs(ganancia).toFixed(2)}`;
}
