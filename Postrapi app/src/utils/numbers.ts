export function parseNumber(str: string): number {
  return Number(str.replace(",", "."));
}
