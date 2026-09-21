import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml, filterStock, parseQuantity, quantityChanged, stockChanged, stockCounts, stockStatus } from '../src/stock.ts';
import type { StockItem } from '../src/types.ts';

const item: StockItem = { id: 1, Item: 'Paper One A4', uom: 'BOX', quantity: 701, is_pinned: false, display_order: 0, low_threshold: 200, high_threshold: 700 };

test('stock bands preserve the original 200 and 700 boundaries', () => {
  for (const [quantity, status] of [[0, 'out'], [1, 'low'], [199, 'low'], [200, 'watch'], [700, 'watch'], [701, 'healthy']] as const) {
    assert.equal(stockStatus(quantity).key, status);
  }
  assert.equal(stockStatus(null).key, 'unknown');
  assert.equal(stockStatus(NaN).key, 'unknown');
});

test('counts describe items rather than adding incompatible stock units', () => {
  assert.deepEqual(stockCounts([item, { ...item, id: 2, uom: 'PCS', quantity: 0 }, { ...item, id: 3, quantity: 200 }]), { all: 3, healthy: 1, watch: 1, low: 1 });
});

test('search combines with the status filter, including zero-stock items', () => {
  const data = [item, { ...item, id: 2, Item: 'Excellent Copy', quantity: 0 }];
  assert.equal(filterStock(data, '  excellent ', 'low')[0]?.id, 2);
  assert.equal(filterStock(data, 'BOX', 'healthy').length, 1);
  assert.equal(filterStock(data, 'paper', 'low').length, 0);
});

test('polling catches deleted, renamed, added and unit-changed records', () => {
  assert.equal(stockChanged([item], []), true);
  assert.equal(stockChanged([item], [{ ...item, Item: 'New name' }]), true);
  assert.equal(stockChanged([item], [{ ...item, uom: 'REAM' }]), true);
  assert.equal(stockChanged([item], [{ ...item }]), false);
  assert.equal(stockChanged(null, []), true);
  assert.equal(stockChanged([item], [item, { ...item, id: 2 }]), true);
});

test('quantity alerts do not fire for renames or initial rendering', () => {
  assert.equal(quantityChanged([item], [{ ...item, Item: 'New name' }]), false);
  assert.equal(quantityChanged([item], [{ ...item, quantity: 700 }]), true);
  assert.equal(quantityChanged([item], [item]), false);
});

test('zero is valid; blank, negative, fractional and unsafe quantities are rejected', () => {
  assert.equal(parseQuantity('0'), 0);
  assert.equal(parseQuantity(' 200 '), 200);
  for (const invalid of ['', ' ', '-1', '1.5', 'abc', 'Infinity', '9007199254740992']) assert.throws(() => parseQuantity(invalid));
});

test('item names cannot inject HTML or break attribute values', () => {
  assert.equal(escapeHtml('<img src=x onerror="bad()"> & \'stock\''), '&lt;img src=x onerror=&quot;bad()&quot;&gt; &amp; &#39;stock&#39;');
});
