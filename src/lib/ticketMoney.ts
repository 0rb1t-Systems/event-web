export function formatTicketPrice(price: number, currency = "USD") {
  if (!price) return "Free";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(price);
  } catch {
    return `${currency} ${price}`;
  }
}

export function formatMoneyString(amount: string, currency = "USD") {
  const n = Number(amount);
  if (!Number.isFinite(n)) return `${currency} ${amount}`;
  return formatTicketPrice(n, currency);
}
