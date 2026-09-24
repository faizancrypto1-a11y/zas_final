export function formatINR(amount) {
  const number = Number(amount);
  if (isNaN(number)) return '₹0';

  return '₹' + new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(Math.round(number));
}
