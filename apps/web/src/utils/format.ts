/**
 * Format Ethereum address to shortened version
 * @param address - Full Ethereum address
 * @returns Formatted address (e.g., 0x1234...5678)
 */
export function formatAddress(address: string): string {
  if (!address) return '';
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format large numbers with commas
 */
export function formatNumber(value: number | string): string {
  return new Intl.NumberFormat('en-US').format(Number(value));
}
