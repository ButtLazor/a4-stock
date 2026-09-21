import type { StockFilter, StockItem, StockOrderChange, StockStatus } from './types.ts';

export const DEFAULT_LOW_THRESHOLD = 200;
export const DEFAULT_HIGH_THRESHOLD = 700;

function safeThresholds(lowThreshold: number, highThreshold: number): [number, number] {
  const low = Number.isSafeInteger(lowThreshold) && lowThreshold >= 0 ? lowThreshold : DEFAULT_LOW_THRESHOLD;
  const high = Number.isSafeInteger(highThreshold) && highThreshold >= low ? highThreshold : Math.max(low, DEFAULT_HIGH_THRESHOLD);
  return [low, high];
}

export function stockStatus(quantity: number | null, lowThreshold = DEFAULT_LOW_THRESHOLD, highThreshold = DEFAULT_HIGH_THRESHOLD): StockStatus {
  const [low, high] = safeThresholds(lowThreshold, highThreshold);
  if (quantity === null || !Number.isFinite(quantity)) return { key: 'unknown', label: 'Not set', icon: 'CircleHelp', level: 0, guide: 'Quantity missing' };
  if (quantity <= 0) return { key: 'out', label: 'Out of stock', icon: 'CircleX', level: 0, guide: 'No stock' };
  if (quantity < low) return { key: 'low', label: 'Low stock', icon: 'TriangleAlert', level: 24, guide: `Below ${low}` };
  if (quantity <= high) return { key: 'watch', label: 'Watch list', icon: 'Clock3', level: 58, guide: `${low}–${high}` };
  return { key: 'healthy', label: 'Well stocked', icon: 'CircleCheck', level: 100, guide: `Above ${high}` };
}

export function matchesFilter(item: StockItem, filter: StockFilter): boolean {
  const status = stockStatus(item.quantity, item.low_threshold, item.high_threshold).key;
  return filter === 'all' || status === filter || (filter === 'low' && status === 'out');
}

export function filterStock(items: StockItem[], search: string, filter: StockFilter): StockItem[] {
  const query = search.trim().toLocaleLowerCase();
  return items.filter(item => matchesFilter(item, filter) && `${item.Item} ${item.uom ?? ''}`.toLocaleLowerCase().includes(query));
}

export function stockCounts(items: StockItem[]): Record<StockFilter, number> {
  return { all: items.length, healthy: items.filter(item => matchesFilter(item, 'healthy')).length, watch: items.filter(item => matchesFilter(item, 'watch')).length, low: items.filter(item => matchesFilter(item, 'low')).length };
}

export function stockChanged(previous: StockItem[] | null, next: StockItem[]): boolean {
  if (!previous || previous.length !== next.length) return true;
  const old = new Map(previous.map(item => [String(item.id), item]));
  return next.some(item => {
    const prior = old.get(String(item.id));
    return !prior || prior.Item !== item.Item || prior.quantity !== item.quantity || prior.uom !== item.uom || prior.is_pinned !== item.is_pinned || prior.display_order !== item.display_order || prior.low_threshold !== item.low_threshold || prior.high_threshold !== item.high_threshold;
  });
}

export function quantityChanged(previous: StockItem[], next: StockItem[]): boolean {
  const old = new Map(previous.map(item => [String(item.id), item]));
  return next.some(item => !old.has(String(item.id)) || old.get(String(item.id))?.quantity !== item.quantity);
}

export function parseQuantity(value: string): number {
  if (!value.trim()) throw new Error('Enter a quantity.');
  const quantity = Number(value);
  if (!Number.isSafeInteger(quantity) || quantity < 0) throw new Error('Quantity must be a whole number of zero or more.');
  return quantity;
}

export function parseGuideLimit(value: string, label: string): number {
  if (!value.trim()) throw new Error(`Enter the ${label.toLowerCase()}.`);
  const limit = Number(value);
  if (!Number.isSafeInteger(limit) || limit < 0) throw new Error(`${label} must be a whole number of zero or more.`);
  return limit;
}

export function validateStockGuide(lowThreshold: number, highThreshold: number): void {
  if (highThreshold < lowThreshold) throw new Error('Well stocked must be equal to or higher than the low-stock limit.');
}

export function sortStockItems(items: StockItem[]): StockItem[] {
  return [...items].sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned) || a.display_order - b.display_order || a.Item.localeCompare(b.Item));
}

export function swapDisplayOrder(first: StockItem, second: StockItem): StockOrderChange[] {
  return [
    { id: first.id, display_order: second.display_order },
    { id: second.id, display_order: first.display_order },
  ];
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}

export function formatQuantity(quantity: number | null): string {
  return quantity === null || !Number.isFinite(quantity) ? '—' : new Intl.NumberFormat('en-US').format(quantity);
}
