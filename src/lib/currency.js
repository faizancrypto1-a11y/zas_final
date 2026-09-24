export function formatINR(amount) {
  const number = Number(amount);
  if (isNaN(number)) return '₹0';
  const hasDecimals = Math.abs(number % 1) > 0.001;
  return '₹' + new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: hasDecimals ? 2 : 0
  }).format(number);
}
