import { createClient } from '@supabase/supabase-js';
import { config } from './config.ts';
import type {
  Database,
  ItemId,
  StockInput,
  StockItem,
  StockOrderChange,
  StockPatch,
} from './types.ts';

const client = createClient<Database>(
  config.supabaseUrl,
  config.supabasePublishableKey,
);

const columns =
  'id, Item, uom, quantity, is_pinned, display_order, low_threshold, high_threshold';

export async function getStock(): Promise<StockItem[]> {
  const { data, error } = await client
    .from('stock_items')
    .select(columns)
    .order('is_pinned', { ascending: false })
    .order('display_order', { ascending: true })
    .order('Item', { ascending: true })
    .abortSignal(AbortSignal.timeout(12000));

  if (error) throw new Error(error.message);
  if (!Array.isArray(data)) throw new Error('Unexpected stock response.');

  return data;
}

export function subscribeToStockChanges(onChange: () => void): () => void {
  const channel = client
    .channel('stock-items-live-updates')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'stock_items',
      },
      () => onChange(),
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

export async function updateStock(
  id: ItemId,
  patch: StockPatch,
): Promise<StockItem> {
  const { data, error } = await client
    .from('stock_items')
    .update(patch)
    .eq('id', id)
    .select(columns)
    .abortSignal(AbortSignal.timeout(15000))
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('The item could not be saved.');

  return data;
}

export async function addStock(input: StockInput): Promise<StockItem> {
  const { data, error } = await client
    .from('stock_items')
    .insert(input)
    .select(columns)
    .abortSignal(AbortSignal.timeout(15000))
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('The item could not be added.');

  return data;
}

export async function saveStockOrder(
  changes: StockOrderChange[],
): Promise<StockItem[]> {
  const results = await Promise.allSettled(
    changes.map(change =>
      updateStock(change.id, {
        display_order: change.display_order,
      }),
    ),
  );

  const failure = results.find(
    (result): result is PromiseRejectedResult =>
      result.status === 'rejected',
  );

  if (failure) {
    throw failure.reason instanceof Error
      ? failure.reason
      : new Error('The new item order could not be confirmed.');
  }

  return results.map(
    result => (result as PromiseFulfilledResult<StockItem>).value,
  );
}

export async function removeStock(id: ItemId): Promise<void> {
  const { data, error } = await client
    .from('stock_items')
    .delete()
    .eq('id', id)
    .select('id')
    .abortSignal(AbortSignal.timeout(15000));

  if (error) throw new Error(error.message);

  if (!data?.length) {
    throw new Error('The item was not deleted. Refresh and try again.');
  }
}